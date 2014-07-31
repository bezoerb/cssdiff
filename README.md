# stylediff

Computes the difference of stylesheets at parse tree level to generate a \"diff\" stylesheet.


[![build status](https://secure.travis-ci.org/bezoerb/stylediff.svg)](http://travis-ci.org/bezoerb/stylediff)

## Installation

This module is installed via npm:

``` bash
$ npm install stylediff --save-dev
```

## Example Usage

``` js
var stylediff = require('stylediff');
var fs = require('fs');

var css1 = fs.readFileSync('test/fixtures/styles_a1.css','utf8');
var css2 = fs.readFileSync('test/fixtures/styles_a2.css','utf8');
stylediff(css1,css2, function(err,out){
    fs.writeFileSync('test/fixtures/diff.css',out);
});


```
