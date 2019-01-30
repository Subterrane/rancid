#!/usr/bin/env node

const program = require("commander");
const gitignore = require("ignored");
const babel = require("@babel/core");
const ignore = require("ignore");
const chalk = require("chalk");
const find = require("find");
const path = require("path");
const fs = require("fs");

let componentName;

program
  .version("1.0.0")
  .option("-f, --fileExt [ext]", "Look through files foo[ext]", ".js")
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
const filePattern = new RegExp(`\\${program.fileExt}$`);
const packageJson = "package.json";

let isNodeProject = false;
fs.readdirSync(process.cwd()).forEach(file => {
  if (file == packageJson) {
    isNodeProject = true;
  }
});

if (isNodeProject) {
  find
    .file(filePattern, process.cwd(), function(files) {
      files = files.map(file => path.relative(process.cwd(), file)); // make the paths relative for the filter
      let filtered = ig.filter(files); // filter out the files in the gitignore

      filtered.forEach(file => {
        fs.readFile(file, (err, data) => {
          if (err) return displayError(err);

          if (componentName) {
            const re = new RegExp(
              `(<${componentName}.*?>|{${componentName}.*?})`,
              "gims"
            );
            const matches = re.exec(data);
            if (matches && matches.length) {
              console.log(chalk.bold(path.join(process.cwd(), file)));
              console.log(chalk.green("\t-", matches[0]));
              babel.parse(data, opts.options, function(err, ast) {
                if (ast.comments) {
                  ast.comments.forEach(comment =>
                    console.log(chalk.cyan("\t-", comment.value))
                  );
                }
              });
            }
          } else {
            babel.parse(data, opts.options, function(err, ast) {
              if (err) return displayError(err);

              //console.dir(ast, { depth: null });

              let components = new Set();
              babel.traverse(ast, {
                ClassDeclaration: function(path) {
                  if (
                    path.node.superClass &&
                    path.node.superClass.name === "Component"
                  ) {
                    components.add(path.node.id.name);
                  }
                },
                ExportDefaultDeclaration: function(path) {
                  components.add(path.node.declaration.name);
                }
              });

              if (components.size) {
                console.log(chalk.bold(path.join(process.cwd(), file)));
                components.forEach(name =>
                  console.log(chalk.green("\t-", name))
                );

                if (ast.comments) {
                  ast.comments.forEach(comment =>
                    console.log(chalk.cyan("\t-", comment.value))
                  );
                }
              }
            });
          }
        });
      });
    })
    .error(function(err) {
      if (err) return displayError(err);
    });
}
function displayError(err) {
  console.error(err.message);
  //process.exit(1);
}
