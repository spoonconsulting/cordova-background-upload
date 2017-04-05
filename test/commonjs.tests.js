var expect = require('chai').expect;
var cordovaLib = require('../dist/cordova-background-upload.min.js');

describe('BackgroundUpload', function () {
  it('is contained within cordova-background-upload as CommonJS', function () {
    expect(cordovaLib).to.be.an('object');
    expect(cordovaLib.BackgroundUpload).to.not.be.null;
  });

  it('can be instantiated', function () {
    var t = new cordovaLib.BackgroundUpload();
    expect(t).to.be.defined;
  });
});
