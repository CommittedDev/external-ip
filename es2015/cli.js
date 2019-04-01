#!/usr/bin/env node
'use strict';

var program = require('commander');

var extIP = require('./extIP');

var pkg = require('../package.json');

var configSchema = require('./configSchema.json').properties;

var collect = function collect(service) {
  var services = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
  services.push(service);
  return services;
}; // Hack commander program name to match package name (for --help)


program._name = pkg.name;
program.usage('[options]').version(pkg.version).option('-R, --replace', 'replace internal services instead of extending them.').option('-s, --services <url>', 'service url, see examples, required if using -R', collect).option('-t, --timeout <ms>', 'set timeout per request', parseInt).option('-P, --parallel', 'set to parallel mode').option('-u, --userAgent <User-Agent>', "provide a User-Agent header, default: ".concat(configSchema.userAgent.default), null, '').option('-v, --verbose', 'provide additional details').on('--help', function () {
  console.log("\n        This program prints the external IP of the machine.\n        All arguments are optional.\n\n        Examples:\n        $ external-ip\n        $ external-ip -P -t 1500 -R -s ".concat(configSchema.services.default[0], " -s ").concat(configSchema.services.default[1], "\n\n        Default services:\n        ").concat(configSchema.services.default.join('\n \t'), "\n\n        Documentation can be found at ").concat(pkg.homepage, "\n"));
}).parse(process.argv);

var generateConfig = function generateConfig(cliConf) {
  return cliConf.options.reduce(function (acc, option) {
    var name = option.name();

    if (cliConf[name]) {
      acc[name] = cliConf[name];
    }

    return acc;
  }, {
    // Patch config for parallel option.
    getIP: cliConf.parallel ? 'parallel' : undefined
  });
};

var config = generateConfig(program);
extIP(config)(function (err, ip) {
  if (err) {
    console.error(err.message);
    process.exit(1);
  }

  console.log(ip);
});