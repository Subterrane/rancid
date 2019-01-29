#!/usr/bin/env node

const program = require("commander");
const gitignore = require("ignored");
const babel = require("@babel/core");
const ignore = require("ignore");
const grepit = require("grepit");
const chalk = require("chalk");
const find = require("find");
const path = require("path");
const fs = require("fs");

let componentName;

program
  .version("1.0.0")
  .arguments("[component]")
  .action(function(component) {
    componentName = component;
  })
  .parse(process.argv);

//
// probably need some options here.
// -d for directory (default to cwd)
// -p for file pattern or something (default to *.js)
// see: https://www.npmjs.com/package/commander

const dir = path.join(__dirname, "node_modules");
const opts = babel.loadPartialConfig({
  plugins: [
    babel.createConfigItem("@babel/plugin-proposal-class-properties", {
      dirname: dir,
      type: "plugin"
    }),
    babel.createConfigItem("@babel/plugin-syntax-jsx", {
      dirname: dir,
      type: "plugin"
    }),
    babel.createConfigItem("@babel/plugin-transform-react-jsx", {
      dirname: dir,
      type: "plugin"
    }),
    babel.createConfigItem("@babel/plugin-transform-react-display-name", {
      dirname: dir,
      type: "plugin"
    })
  ]
});

const patterns = gitignore(); // without a param, uses current directory
const ig = ignore().add(patterns);

// here we could pass in the file pattern and directory
find
  .file(/\.js$/, process.cwd(), function(files) {
    files = files.map(file => path.relative(process.cwd(), file)); // make the paths relative for the filter
    let filtered = ig.filter(files); // filter out the files in the gitignore

    filtered.forEach(file => {
      if (componentName) {
        const re = new RegExp(`<${componentName}`, "i");
        const components = grepit(re, file);
        if (components.length) {
          console.log(chalk.bold(path.join(process.cwd(), file)));
          components.forEach(line =>
            console.log(chalk.green("\t-", line.trim()))
          );
        }
      } else {
        fs.readFile(file, (err, data) => {
          if (err) return displayError(err);

          babel.parse(data, opts.options, function(err, ast) {
            if (err) return displayError(err);

            let components = [];
            babel.traverse(ast, {
              ClassDeclaration: function(path) {
                if (
                  path.node.superClass &&
                  path.node.superClass.name === "Component"
                ) {
                  components.push(path.node.id.name);
                  //console.dir(path.node, { depth: 10 });
                }
              }
            });

            if (components.length) {
              console.log(chalk.bold(path.join(process.cwd(), file)));
              components.forEach(name => console.log(chalk.green("\t-", name)));
            }
          });
        });
      }
    });
  })
  .error(function(err) {
    if (err) return displayError(err);
  });

function displayError(err) {
  console.error(err.message);
  process.exit(1);
}
