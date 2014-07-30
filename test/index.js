var expect = require('chai').expect,
    cssdiff = require('..');

describe('cssdiff', function() {
    it('should say hello', function(done) {
        expect(cssdiff()).to.equal('Hello, world');
        done();
    });
});
