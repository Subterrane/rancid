#!/usr/bin/env node

var babel = require("@babel/core");
var program = require("commander");

program.version("1.0.0").parse(process.argv);

let code = "meow(); woof();";
let options = { ast: true, code: false };

babel.transform(code, options, function(err, result) {
  //result; // => { code, map, ast }
  console.dir(result.ast, { depth: null });
});
