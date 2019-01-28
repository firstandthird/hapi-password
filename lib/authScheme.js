'use strict';
const Hoek = require('hoek');
const renderLogin = require('./renderLogin.js');
const lookup = require('./credentials.js');
const _ = require('lodash');

module.exports = (server, pluginOptions, schemeDefaults) => {
  server.auth.scheme(pluginOptions.schemeName, (authServer, options) => {
    options = Hoek.applyToDefaults(schemeDefaults, options);
    lookup.registerCredentials(options.password, options.salt);
    return {
      authenticate: (request, h) => {
        let useCookie = true;
        let value = request.state[options.cookieName];
        if (request.query[options.queryKey]) {
          useCookie = false;
          value = request.query[options.queryKey];
        }
        const name = request.state[options.cookieNameName];
        if (value) {
          const credentials = lookup.getCredentials(value, useCookie);
          if (credentials) {
            // return the credentials, minus the encryptedPassword:
            const creds = _.omit(credentials, ['encryptedPassword']);
            if (!creds.name && name) {
              creds.name = name;
            }
            // 'credentials' is either the credentials object or just contains it:
            if (credentials.credentials) {
              return h.authenticated(credentials);
            }
            return h.authenticated({ credentials });
          }
          return h.response().redirect(options.endpoint).unstate(options.cookieName).takeover();
        }
        if (request.url.pathname === options.endpoint && request.method === 'get') {
          return h.response(renderLogin(request, pluginOptions)).takeover();
        }
        return h.response().takeover().redirect(`${options.endpoint}?next=${request.path}`);
      }
    };
  });
};
