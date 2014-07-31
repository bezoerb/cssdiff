/* global describe, it, before, grunt */
var cssdiff = require('..'),
    fs = require('fs'),
    expect = require('chai').expect;
    assert = require('chai').assert;

/**
 * Strip whitespaces, tabs and newlines and replace with one space.
 * Usefull when comparing string contents.
 * @param string
 */
function stripWhitespace(string) {
    return string.replace(/[\r\n]+/mg,' ').replace(/\s+/gm,'');
}

function test(basename, cb) {
    var css1 = fs.readFileSync('test/fixtures/' + basename + '1.css','utf8');
    var css2 = fs.readFileSync('test/fixtures/' + basename + '2.css','utf8');

    var expected = fs.readFileSync('test/expected/' + basename + '.css','utf8');
    cssdiff(css1,css2,function(err,output){
        if (err) {
            console.log(err);
            assert.fail(err);
        }
        expect(stripWhitespace(output)).to.equal(stripWhitespace(expected));
        cb();
    });


}

describe('cssdiff', function() {
    it('shoule diff plain css', function(done) {
        test('styles_a',done);
    });

    it('should correctly diff css with media queries', function(done) {
        test('media_a',done);
    });
});
