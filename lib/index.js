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
  successEndpoint: '/',
  cookieName: 'hapi-password',
  cookieNameName: 'hapi-password-name',
  cookiePath: '/',
  salt: undefined,
  password: undefined,
  ttl: 1000 * 60 * 60 * 24 * 30, // 30 days
  loginForm: {
    name: 'Login',
    description: '',
    askName: false
  }
};

const register = (server, pluginOptions) => {
  pluginOptions = Hoek.applyToDefaults(schemeDefaults, pluginOptions);
  if (pluginOptions.salt === undefined || pluginOptions.password === undefined) {
    throw new Error('You must specify both a salt and a password to use hapi-password');
  }
  registerScheme(server, pluginOptions, schemeDefaults);
  server.auth.strategy(pluginOptions.strategyName, pluginOptions.schemeName, pluginOptions);
  registerRoutes(server, pluginOptions);
};


exports.plugin = {
  name: 'hapi-password',
  register,
  once: true,
  pkg: require('../package.json')
};
