/* global describe, it */
'use strict';
var stylediff = require('..'),
    fs = require('fs'),
    path = require('path'),
    CleanCSS = require('clean-css'),
    assert = require('chai').assert;

/**
 * Strip whitespaces, tabs and newlines and replace with one space.
 * Usefull when comparing string contents.
 * @param string
 */

function stripWhitespace(string) {
    return new CleanCSS({
        keepBreaks: true,
        processImport: false,
        noRebase: true
    }).minify(string.replace(/[\r\n]+/mg,' ').replace(/\s+/gm,''));
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
            throw err;
        }

        assert.strictEqual(out,expected, 'Stylesheets do not match');

        done();
    });
}

function getExpected(basename) {
    return stripWhitespace(fs.readFileSync('test/expected/' + basename + '.css','utf8'));
}

describe('stylediff', function() {

    it('should diff plain css', function(done) {
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

    it('should diff svg and inline svg', function(done) {
        var expected = getExpected('svg');
        var css1 = fs.readFileSync('test/fixtures/svg_1.css','utf8');
        var css2 = fs.readFileSync('test/fixtures/svg_2.css','utf8');


        stylediff(css1,css2, {cwd: path.resolve('test/fixtures'), strict: false}, function(err,out) {
            if (err) {
                throw err;
            }

            assert.strictEqual(stripWhitespace(out),expected, 'Stylesheets do not match');
            done();
        });
    });

    it('should fail diff svg and inline svg in strict mode', function(done) {
        var expected = fs.readFileSync('test/expected/svg_strict.css','utf8');
        var css1 = fs.readFileSync('test/fixtures/svg_1.css','utf8');
        var css2 = fs.readFileSync('test/fixtures/svg_2.css','utf8');


        stylediff(css1,css2, {cwd: path.resolve('test/fixtures')}, function(err,out) {
            if (err) {
                throw err;
            }

            assert.strictEqual(stripWhitespace(out),stripWhitespace(expected), 'Stylesheets do not match');
            done();
        });
    });

    it('should diff img and base64 img', function(done) {
        var expected = getExpected('base64');
        var css1 = fs.readFileSync('test/fixtures/base64_1.css','utf8');
        var css2 = fs.readFileSync('test/fixtures/base64_2.css','utf8');


        stylediff(css1,css2, {cwd: path.resolve('test/fixtures'), strict: false}, function(err,out) {
            if (err) {
                throw err;
            }

            assert.strictEqual(stripWhitespace(out),expected, 'Stylesheets do not match');
            done();
        });
    });

    it('should fail diff img and base64 img in strict mode', function(done) {
        var expected = fs.readFileSync('test/expected/base64_strict.css','utf8');
        var css1 = fs.readFileSync('test/fixtures/base64_1.css','utf8');
        var css2 = fs.readFileSync('test/fixtures/base64_2.css','utf8');


        stylediff(css1,css2, {cwd: path.resolve('test/fixtures')}, function(err,out) {
            if (err) {
                throw err;
            }

            assert.strictEqual(stripWhitespace(out),stripWhitespace(expected), 'Stylesheets do not match');
            done();
        });
    });

    it('should strip of complete bootstrap css except unsupported elements like comments, fontfacem & keyframe.', function(done) {
        test('all',done);
    });

    it('should remove some of foundation css', function(done) {
        test('foundation',done);
    });

    it('should remove some more of foundation.min css', function(done) {
        test('foundation.min',done);
    });
});
