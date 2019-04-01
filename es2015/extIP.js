'use strict';

var utils = require('./utils');

module.exports = function () {
  var config = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  // validate the external configuration and add the default values where needed
  var configErrors = utils.prepareConfig(config);

  if (configErrors) {
    throw utils.concatErrors(configErrors);
  } // create a request instance for each service in the configuration


  var requests = config.services.map(function (url) {
    return utils.requestFactory(config, url);
  }); // sequential and parallel mode handlers

  var getIP = {
    sequential: function sequential(cb) {
      var errors = [];
      var current = 0;

      var loop = function loop() {
        requests[current](function (error, ip) {
          if (error) {
            errors.push(error);
            current += 1; // when every single service has failed tell the bad news

            if (errors.length === requests.length) {
              return cb(utils.concatErrors(errors), null);
            } // try the next one


            return loop();
          } // got an ip


          return cb(null, ip);
        });
      }; // initiate the first request


      loop();
    },
    parallel: function parallel(cb) {
      var done = false;
      var errors = [];
      var ongoingRequests;

      var onResponse = function onResponse(error, ip) {
        // got an ip from a previous request, so there is nothing to do here
        if (done) {
          return;
        }

        if (error) {
          errors.push(error);
        } // when every single service has failed tell the bad news


        if (errors.length === requests.length) {
          return cb(utils.concatErrors(errors), null);
        }

        if (ip) {
          done = true; // Abort every pending request

          ongoingRequests.forEach(function (request) {
            return request.abort();
          });
          return cb(null, ip);
        }
      }; // initiate all the requests


      ongoingRequests = requests.map(function (service) {
        return service(onResponse);
      });
    }
  }; // return the sequential or the parallel handler according to the configuration

  return getIP[config.getIP];
};