/* vim: set et ts=2 sts=2 sw=2: */

var expect = require('expect.js');

describe('Reanimator interposes on localStorage', function () {
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

  it('captures the initial localStorage state', function (done) {
    driver.get(url).
      then(function () {
        return driver.executeScript(function () {
          var data = {
            foo: {
              bar: 23,
              baz: 42,
              applesauce: 23251
            },
            fiz: 'biz'
          };
          var xhr = new XMLHttpRequest();
          var expected = [];

          for (var k in data) {
            localStorage[k] = data[k];
          }

          for (var i = 0, len = localStorage.length; i < len; i++) {
            k = localStorage.key(i);
            expected.push({
              key: k,
              value: localStorage[k]
            });
          }

          Reanimator.capture();

          return JSON.stringify({
            actual: Reanimator.flush().localStorage.state,
            expected: expected
          });
        });
      }).
      then(function (result) {
        result = JSON.parse(result);
        expect(result.actual).to.eql(result.expected);
        done();
      });
  });
});
