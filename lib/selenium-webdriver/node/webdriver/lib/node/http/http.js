// Copyright 2011 Software Freedom Conservancy. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Defines a the {@code webdriver.http.Client} for use with
 * NodeJS.
 */

goog.provide('node.http');
goog.provide('node.http.HttpClient');

goog.require('webdriver.http.Response');


/**
 * Parses a URL with Node's native "url" module.
 * @param {string} url The URL to parse.
 * @return {!Object} The parsed URL.
 * @private
 */
node.http.parseUrl_ = function(url) {
  return require('url').parse(url);
};



/**
 * HTTP client for use with NodeJS.
 * @param {!string} url URL for the WebDriver server to send commands
 *     to.
 * @constructor
 * @implements {webdriver.http.Client}
 */
node.http.HttpClient = function(url) {
  var parsedUrl = node.http.parseUrl_(url);
  if (!parsedUrl.hostname) {
    throw new Error('Invalid server URL: ' + url);
  }

  /**
   * Base options for each request.
   * @type {!Object}
   * @private
   */
  this.options_ = {
    host: parsedUrl.hostname,
    path: parsedUrl.pathname || '/',
    port: parsedUrl.port
  };
};


/** @override */
node.http.HttpClient.prototype.send = function(httpRequest, callback) {
  var data;
  httpRequest.headers['Content-Length'] = 0;
  if (httpRequest.method == 'POST' || httpRequest.method == 'PUT') {
    data = JSON.stringify(httpRequest.data);
    httpRequest.headers['Content-Length'] = Buffer.byteLength(data, 'utf8');
    httpRequest.headers['Content-Type'] = 'application/json;charset=UTF-8';
  }

  node.http.HttpClient.sendRequest_({
    method: httpRequest.method,
    host: this.options_.host,
    port: this.options_.port,
    path: this.options_.path + httpRequest.path,
    headers: httpRequest.headers
  }, callback, data);
};


/**
 * Sends a single HTTP request.
 * @param {!Object} options The request options.
 * @param {function(Error, !webdriver.http.Response=)} callback The function to
 *     invoke with the server's response.
 * @param {string=} opt_data The data to send with the request.
 * @private
 */
node.http.HttpClient.sendRequest_ = function(options, callback, opt_data) {
  var request = require('http').request(options, function(response) {
    if (response.statusCode == 302 || response.statusCode == 303) {
      var location = node.http.parseUrl_(response.headers['location']);

      if (!location.hostname) {
        location.hostname = options.host;
        location.port = options.port;
      }

      request.abort();
      node.http.HttpClient.sendRequest_({
        method: 'GET',
        host: location.hostname,
        path: location.pathname + (location.search || ''),
        port: location.port,
        headers: {
          'Accept': 'application/json'
        }
      }, callback);
      return;
    }

    var body = [];
    response.on('data', goog.bind(body.push, body));
    response.on('end', function() {
      var resp = new webdriver.http.Response(response.statusCode,
          response.headers, body.join('').replace(/\0/g, ''));
      callback(null, resp);
    });
  });

  request.on('error', function(e) {
    callback(new Error('Unable to send request: ' + e.message));
  });

  if (opt_data) {
    request.write(opt_data);
  }

  request.end();
};
