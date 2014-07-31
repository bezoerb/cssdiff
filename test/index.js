/* global describe, it, before, grunt */
var cssdiff = require('..'),
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


    cssdiff(css1,css2, function(err,out) {
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
            assert.fail(err);
        }

        assert.strictEqual(out,expected);

        done();
    });
}

function getExpected(basename) {
    return stripWhitespace(fs.readFileSync('test/expected/' + basename + '.css','utf8'));
}

describe('cssdiff', function() {
    it('shoule diff plain css', function(done) {
        test('styles',done);

    });

    it('should correctly diff css with media queries', function(done) {
        test('media',done);
    });

    it('should correctly diff minimal stripped bootstrap', function(done) {
        test('multiple',done);
    });

    it('should correctly diff minimal stripped bootstrap', function(done) {
        test('all',done);
    });
});
