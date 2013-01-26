/* vim: set et ts=2 sts=2 sw=2: */

var expect = require('expect.js');

describe('Reanimator interposes on document.createEvent', function () {
  var build = require('../../util/hooks').build;
  var url = 'http://localhost:' + process.env.FIXTURE_PORT + '/index.html';
  var driver;

  beforeEach(function (done) {
    build().then(function (builtDriver) {
      driver = builtDriver;
      done();
    });
  });

  afterEach(function () {
    driver.quit();
  });

  it('sets `_reanimator.synthetic` to true on created events', function (done) {
    driver.get(url).
      then(function () {
        return driver.executeScript(function () {
          Reanimator.capture();

          expected = Reanimator.util.event.serialization.
            serialize(document.createEvent('HTMLEvents'));
          
          Reanimator.cleanUp();
          return JSON.stringify(expected);
        });
      }).
      then(function (result) {
        result = JSON.parse(result);

        expect(result._reanimator).to.eql({ synthetic: true });
        done();
      });
  });
});
