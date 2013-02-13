/* vim: set et ts=2 sts=2 sw=2: */
var expect = require('expect.js');

describe('Reanimator replay', function () {
  var build = require('../util/hooks').build;
  var url = 'http://localhost:' +
    process.env.FIXTURE_PORT +'/index.html';
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

  it('does not replay the next event until a pending async event has completed',
    function (done) {
      driver.get(url).
        then(function () {
          return driver.executeAsyncScript(function (callback) {
            var nativeSetTimeout = window.setTimeout;
            window.syncFired = false;

            function nop() {}

            Reanimator.plug('async', {
              init: nop,
              capture: nop,
              beforeReplay: nop,
              replay: function (entry, done) {
                nativeSetTimeout.call(window, function () {
                  callback(window.syncFired);
                }, 10);
              }
            });
              
            Reanimator.plug('sync', {
              init: nop,
              capture: nop,
              beforeReplay: nop,
              replay: function (entry) {
                window.syncFired = true;
              }
            });

            Reanimator.replay({
              events: [{
                type: 'async',
                time: 121
              }, {
                type: 'sync',
                time: 123
              }]
            });
          });
        }).
        then(function (result) {
          expect(result).to.be(false);
          done();
        });
      });
});

