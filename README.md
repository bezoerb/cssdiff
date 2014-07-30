# cssdiff

Generate diff of CSS files.

[![build status](https://secure.travis-ci.org/bezoerb/cssdiff.svg)](http://travis-ci.org/bezoerb/cssdiff)

## Installation

This module is installed via npm:

``` bash
$ npm install cssdiff
```

## Example Usage

``` js
var cssdiff = require('cssdiff');
var fs = require('fs');

var css1 = fs.readFileSync('test/fixtures/styles_a1.css','utf8');
var css2 = fs.readFileSync('test/fixtures/styles_a2.css','utf8');
var diff = cssdiff(css1,css2);

fs.writeFileSync('test/fixtures/diff.css',diff);
```
