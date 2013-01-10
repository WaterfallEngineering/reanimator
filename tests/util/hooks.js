/* vim: set et ts=2 sts=2 sw=2: */

var http = require('http');
var webdriver = require('../../lib/selenium-webdriver/node/webdriver');
var Q = require('q');
var _ = require('lodash');

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

var defaultConfig = {
  server:
    'http://localhost:' + process.env.DRIVER_PORT + '/wd/hub',
  capabilities: {
    'browserName': 'chrome',
    'version': '',
    'platform': 'ANY',
    'javascriptEnabled': true
  }
};

function mergeDefaults(config, defaults) {
  config = _.defaults(config || {}, defaults);

  _.keys(defaults).forEach(function (v, k) {
    if (_.isArray(v) || _.isObject(v)) {
      config[k] = mergeDefaults(config[k], v);
    }
  });

  return config;
}

module.exports.build = function (config) {
  config = mergeDefaults(config, defaultConfig);

  return pingWebDriverServer(config.server, 5).then(function () {
    return new webdriver.Builder().
      usingServer(config.server).
      withCapabilities(config.capabilities).
      build();
  });
};
