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
      authenticate: (request, reply) => {
        const cookie = request.state[options.cookieName];
        const name = request.state[options.cookieNameName];
        if (cookie) {
          const credentials = lookup.getCredentials(cookie, true);
          if (credentials) {
            // return the credentials, minus the encryptedPassword:
            const creds = _.omit(credentials, ['encryptedPassword']);
            if (!creds.name && name) {
              creds.name = name;
            }
            // 'credentials' is either the credentials object or just contains it:
            if (credentials.credentials) {
              return reply.continue(credentials);
            }
            return reply.continue({ credentials });
          }
          return reply.redirect(options.endpoint).unstate(options.cookieName);
        }
        if (request.url.pathname === options.endpoint && request.method === 'get') {
          return reply(null, renderLogin(request, pluginOptions));
        }
        return reply.redirect(`${options.endpoint}?next=${request.url.path}`);
      }
    };
  });
};
