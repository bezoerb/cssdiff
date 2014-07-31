/**
 *
 * @author Ben Zörb @bezoerb https://github.com/bezoerb
 * @copyright Copyright (c) 2014 Ben Zörb
 *
 * Licensed under the MIT license.
 * http://bezoerb.mit-license.org/
 * All rights reserved.
 */
var fs = require('fs');
var cssdiff = require('./index.js');


var css1 = fs.readFileSync('test/fixtures/multiple_mq_1.css','utf8');
var css2 = fs.readFileSync('test/fixtures/multiple_mq_2.css','utf8');


var diff = cssdiff(css1,css2, {}, function(err,out){
    if (err) {
        console.log(err);
        return;
    }

    console.log(out);
    fs.writeFileSync('test/fixtures/diff.css',out);
});



