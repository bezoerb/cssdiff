/* global describe, it, before, grunt */
var stylediff = require('..'),
    fs = require('fs'),
    expect = require('chai').expect,
    assert = require('chai').assert;

/**
 * Strip whitespaces, tabs and newlines and replace with one space.
 * Usefull when comparing string contents.
 * @param string
 */

function stripWhitespace(string) {
    return string.replace(/[\r\n]+/mg,' ').replace(/\s+/gm,'');
}

function diff(basename, cb) {
    var css1 = fs.readFileSync('test/fixtures/' + basename + '_1.css','utf8');
    var css2 = fs.readFileSync('test/fixtures/' + basename + '_2.css','utf8');


    stylediff(css1,css2, function(err,out) {
        if (err) {
            cb(err);
        }

        cb(null,stripWhitespace(out));
    });
}

function test(basename,done) {
    var expected = getExpected(basename);
    diff(basename,function(err,out){
        if (err) {
            console.log(err);
            assert.fail();
        }

        assert.strictEqual(out,expected, 'Stylesheets do not match');

        done();
    });
}

function getExpected(basename) {
    return stripWhitespace(fs.readFileSync('test/expected/' + basename + '.css','utf8'));
}

describe('stylediff', function() {
    it('shoule diff plain css', function(done) {
        test('styles',done);

    });

    it('should correctly diff css with media queries', function(done) {
        test('media',done);
    });

    it('should correctly diff css with multiple declarations witzh different values', function(done) {
        test('multiple',done);
    });

    it('should correctly strip declarations with just comments', function(done) {
        test('comments',done);
    });

    it('should strip of complete bootstrap css except unsupported elements like comments, fontfacem & keyframe.', function(done) {
        this.timeout(10000);
        test('all',done);
    });

    it('should remove some of foundation css', function(done) {
        this.timeout(10000);
        test('foundation',done);
    });

    it('should remove some more of foundation.min css', function(done) {
        this.timeout(10000);
        test('foundation.min',done);
    });
});
