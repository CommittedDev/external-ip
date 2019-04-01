'use strict';

var Ajv = require('ajv');

var ajv = new Ajv({
  allErrors: true,
  useDefaults: true
});

var configSchema = require('./configSchema.json');

var net = require('net');

var get = require('simple-get-es5');
/**
 * Minimal logger implementation for verbose mode
 * @param  {Object} config
 * @return {Object} logger instance
 */


var loggerFactory = function loggerFactory(config) {
  var noop = function noop() {};

  return {
    error: config.verbose ? console.log.bind(console, '[error]: ') : noop,
    info: config.verbose ? console.log.bind(console, '[info]: ') : noop
  };
};
/**
 * Checks if an IP is a valid v4 or v6
 * @param str
 * @return boolean
 */


var isIP = function isIP(str) {
  return net.isIP(str) !== 0;
};
/**
 * Prepare the configuration object.
 * Validate using jsonschema and apply the required defaults 
 * @param  {Object} config
 * @return {Object} Errors in config if present
 */


var prepareConfig = function prepareConfig(config) {
  // Merge or extend services acordingly 
  config.services = config.replace ? config.services || [] : Array.isArray(config.services) ? config.services.concat(configSchema.properties.services.default) : configSchema.properties.services.default;
  var validate = ajv.compile(configSchema);
  validate(config);
  return validate.errors;
};
/**
 * Creates a reusable request
 * @param  {Object} config
 * @param  {string} url
 * @return {Function} cb(error, ip)
 */


var requestFactory = function requestFactory(config, url) {
  var logger = loggerFactory(config);
  return function (cb) {
    logger.info("requesting IP from: ".concat(url));
    var startTime = Date.now();
    return get.concat({
      url: url,
      timeout: config.timeout,
      headers: {
        'User-Agent': config.userAgent
      }
    }, function (error, res) {
      var body = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : '';

      // if the body is falsey use an empty string
      if (error) {
        logger.error("".concat(url, " ").concat(error.message));
        return cb(new Error("".concat(error.message, " from ").concat(url)), null);
      } // Parse and validate the body


      body = body.toString().replace('\n', '');

      if (isIP(body)) {
        logger.info("got valid IP from: ".concat(url, " in ").concat(Date.now() - startTime, "ms"));
        return cb(null, body);
      }

      logger.error("Got invalid IP from ".concat(url));
      return cb(new Error("Got invalid IP from ".concat(url)), null);
    });
  };
};
/**
 * Used to prety-ish print the errors
 * @param  {Array} errors
 * @return {Error}
 */


var concatErrors = function concatErrors(errors) {
  if (errors.length === 1) {
    return errors[0];
  }

  var msg = errors.reduce(function (acc, current) {
    return acc + " ".concat(current.message, " \n");
  }, 'Multiple errors: \n');
  return new Error(msg);
};

module.exports = {
  isIP: isIP,
  prepareConfig: prepareConfig,
  requestFactory: requestFactory,
  concatErrors: concatErrors
};