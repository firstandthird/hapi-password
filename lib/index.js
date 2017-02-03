'use strict';
const Hoek = require('hoek');
const registerRoutes = require('./registerRoutes');
const registerScheme = require('./authScheme.js');

const schemeDefaults = {
  logFailedAttempts: false,
  schemeName: 'password',
  strategyName: 'password',
  queryKey: 'token',
  endpoint: '/login',
  logoutEndpoint: '/logout',
  isSecure: false,
  successEndpoint: '/',
  cookieName: 'hapi-password',
  cookieNameName: 'hapi-password-name',
  salt: 'aSalt',
  password: 'password',
  ttl: 1000 * 60 * 60 * 24 * 30, // 30 days
  loginForm: {
    name: 'Login',
    description: '',
    askName: false
  }
};

exports.register = (server, pluginOptions, next) => {
  pluginOptions = Hoek.applyToDefaults(schemeDefaults, pluginOptions);
  registerScheme(server, pluginOptions, schemeDefaults);
  server.auth.strategy(pluginOptions.schemeName, pluginOptions.strategyName, true, pluginOptions);
  registerRoutes(server, pluginOptions);
  next();
};

exports.register.attributes = {
  pkg: require('../package.json')
};
