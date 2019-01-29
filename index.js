#!/usr/bin/env node

const RI = require("recursive-iterator");
const program = require("commander");
const gitignore = require("ignored");
const babel = require("@babel/core");
const ignore = require("ignore");
const find = require("find");
const path = require("path");
const fs = require("fs");

program.version("1.0.0").parse(process.argv);

//
// probably need some options here.
// -d for directory (default to cwd)
// -p for file pattern or something (default to *.js)
// see: https://www.npmjs.com/package/commander

const patterns = gitignore(); // without a param, uses current directory
const ig = ignore().add(patterns);

const options = babel.loadOptions({
  plugins: [
    "@babel/plugin-proposal-class-properties",
    "@babel/plugin-syntax-jsx",
    "@babel/plugin-transform-react-jsx",
    "@babel/plugin-transform-react-display-name"
  ]
});

// here we could pass in the file pattern and directory
find.file(/\.js$/, process.cwd(), function(files) {
  files = files.map(file => path.relative(process.cwd(), file)); // make the paths relative for the filter
  let filtered = ig.filter(files); // filter out the files in the gitignore

  filtered.forEach(file => {
    fs.readFile(file, (err, data) => {
      if (err) throw err;

      babel.parse(data, options, function(err, result) {
        if (err) throw err;

        for (let { node } of new RI(result, 0, true, 100)) {
          if (node && node.type === "ClassDeclaration") {
            console.dir(node, { depth: 1 });
          }
        }
      });
    });
  });
});
