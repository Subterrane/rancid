# RanCiD

React Component Documentation

A command-line tool to puke out some helpful hints

## Installation

It's not published to `npm` so you have to install manually:

1. Clone the repo
2. `cd` to the directory
3. `npm install`
4. `npm link`

## Usage

```
Usage: rancid [options] [component]

Parse javascript files for React component definitions
[optional] Specify a [component] to grep for usage & comments

Options:
  -V, --version          output the version number
  -a, --ast              display the Abstract Syntax Tree
  -e, --extension [ext]  specify file extension (default: ".js")
  -f, --force            scan directory even if package.json doesn't exist
  -h, --help             output usage information
```
