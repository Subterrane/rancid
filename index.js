#!/usr/bin/env node

const RI = require("recursive-iterator");
const program = require("commander");
const gitignore = require("ignored");
const babel = require("@babel/core");
const ignore = require("ignore");
const chalk = require("chalk");
const find = require("find");
const path = require("path");
const fs = require("fs");

program.version("1.0.0").parse(process.argv);

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
      fs.readFile(file, (err, data) => {
        if (err) return displayError(err);

        babel.parse(data, opts.options, function(err, ast) {
          if (err) return displayError(err);

          let components = [];
          for (let { node } of new RI(ast, 0, true, 100)) {
            if (
              node &&
              node.type === "ClassDeclaration" &&
              node.superClass &&
              node.superClass.name === "Component"
            ) {
              components.push(node.id.name);
              //console.log(node.body.body);
            }
          }
          if (components.length) {
            console.log(chalk.bold(path.join(process.cwd(), file)));
            components.forEach(name => console.log(chalk.green("\t-", name)));
          }
        });
      });
    });
  })
  .error(function(err) {
    if (err) return displayError(err);
  });

function displayError(err) {
  console.error(err.message);
  return 1;
}
