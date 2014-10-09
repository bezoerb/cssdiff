# stylediff

Computes the difference of stylesheets at parse tree level to generate a "diff" stylesheet.

**Deprecated in favour of https://github.com/bevacqua/cave**


[![build status](https://secure.travis-ci.org/bezoerb/stylediff.svg)](http://travis-ci.org/bezoerb/stylediff)

## Installation

This module is installed via npm:

``` bash
$ npm install stylediff --save-dev
```

### Example Usage

``` js
var stylediff = require('stylediff');
var fs = require('fs');

var css1 = fs.readFileSync('test/fixtures/styles_a1.css','utf8');
var css2 = fs.readFileSync('test/fixtures/styles_a2.css','utf8');
stylediff(css1,css2, function(err,out){
    fs.writeFileSync('test/fixtures/diff.css',out);
});

```
styles_a1.css:
```css
.visible-print {
    display: none !important;
}

th.visible-print,
td.visible-print {
    display: table-cell !important;
    color: green;
}
```
styles_a2.css:
```css
.visible-print {
    display: none !important;
}

td.visible-print {
    color: green;
}

th.visible-print {
    display: table-cell !important;
}
```
result.css:
```css
td.visible-print {
    display: table-cell!important;
}

th.visible-print {
    color: green;
}
```

### Options

| Name    | Default         | Type          | Description   |
| ------- | --------------- | ------------- | ------------- |
| strict  | `true`          | `boolean`     | When set to `false` referenced images are compared to their inlined verions will be marked as equal declaration |
| cwd     | `process.cwd()` | `string`      | Stylesheet directory - required when strict mode is `false` |
