/* vim: set et ts=2 sts=2 sw=2: */

var http = require('http');
var webdriver = require('../../lib/selenium-webdriver/node/webdriver');
var Q = require('q');

function pingWebDriverServer(url, maxAttempts) {
  var d = Q.defer();
  var attempt = 0;

  function ping() {
    attempt++;
    http.get(url + '/status', function (response) {
      d.resolve();
    }).on('error', function (e) {
      if (attempt < maxAttempts) {
        setTimeout(ping, 500);
      } else {
        d.reject(e);
      }
    });
  }

  ping();
  return d.promise;
}

module.exports.build = function (config) {
  return pingWebDriverServer(config.server, 5).then(function () {
    return new webdriver.Builder().
      usingServer(config.server).
      withCapabilities(config.capabilities).
      build();
  });
};
