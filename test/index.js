/* global describe, it, before, grunt */
var cssdiff = require('..'),
    fs = require('fs'),
    expect = require('chai').expect;

function test(basename) {
    var css1 = fs.readFileSync('test/fixtures/' + basename + '1.css','utf8');
    var css2 = fs.readFileSync('test/fixtures/' + basename + '2.css','utf8');

    var expected = fs.readFileSync('test/expected/' + basename + '.css','utf8');
    var output = cssdiff(css1,css2);

    expect(output.replace(/\s+/gm,' ')).to.equal(expected.replace(/\s+/gm,' '));
}

describe('cssdiff', function() {
    it('shoule diff plain css', function() {
        test('styles_a');
    });
});
