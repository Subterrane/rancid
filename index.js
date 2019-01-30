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
  .option("-a, --ast", "Log out the Abstract Syntax Tree")
  .option("-f, --fileExt [ext]", "Look through files foo[ext]", ".js")
  .arguments("[component]")
  .action(component => (componentName = component))
  .parse(process.argv);

if (!fs.existsSync(path.join(process.cwd(), "package.json"))) {
  displayError(new Error("Directory isn't a React App"));
}

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
              if (err) return displayError(err);
              if (program.ast) console.dir(ast, { depth: null });

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
            if (program.ast) console.dir(ast, { depth: null });

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
                babel.traverse(
                  path.node,
                  {
                    Identifier: function(path) {
                      path.stop();
                      components.add(path.node.name);
                    }
                  },
                  path.scope,
                  path
                );
              }
            });

            if (components.size) {
              console.log(chalk.bold(path.join(process.cwd(), file)));
              components.forEach(name => console.log(chalk.green("\t-", name)));
            }
          });
        }
      });
    });
  })
  .error(function(err) {
    if (err) return displayError(err);
  });

function displayError(err) {
  console.error("ERR:", err.message);
  process.exit(1);
}
