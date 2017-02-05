'use strict';
const renderLogin = require('./renderLogin.js');
const lookup = require('./credentials.js');

module.exports = (server, pluginOptions) => {
  // log in route:
  server.route({
    method: 'POST',
    path: pluginOptions.endpoint,
    config: {
      auth: false
    },
    handler: (request, reply) => {
      const credentials = lookup.getCredentials(request.payload.password);
      if (credentials) {
        return reply
          .redirect(request.payload.next || pluginOptions.successEndpoint)
          .state(pluginOptions.cookieName, credentials.encryptedPassword, {
            isSecure: pluginOptions.isSecure,
            ttl: pluginOptions.ttl,
            path: pluginOptions.path
          })
          .state(pluginOptions.cookieNameName, request.payload.name, {
            isSecure: pluginOptions.isSecure,
            ttl: pluginOptions.ttl,
            path: pluginOptions.path,
            strictHeader: false // allows 'name' to include whitespace and other special chars, etc)
          });
      }
      if (pluginOptions.logFailedAttempts) {
        server.log(['hapi-password', 'warning'], `Failed login at ${new Date}: Name: ${request.payload.name}`);
      }
      const nextString = request.payload.next ? `&next=${request.payload.next}` : '';
      reply.redirect(`${pluginOptions.endpoint}?error=1${nextString}`);
    }
  });
  // display login form route:
  if (typeof pluginOptions.loginForm === 'object') {
    server.route({
      method: 'GET',
      path: pluginOptions.endpoint,
      config: {
        auth: pluginOptions.strategyName,
        handler: (request, reply) => {
          if (request.auth.isAuthenticated) {
            return reply.redirect(pluginOptions.successEndpoint);
          }
          if (pluginOptions.logFailedAttempts) {
            server.log(['hapi-password'], `Failed login at ${new Date}: Name: ${request.payload.name}`);
          }
          reply(null, renderLogin(request, pluginOptions));
        }
      }
    });
  }
  // log out route:
  if (pluginOptions.logoutEndpoint) {
    server.route({
      path: pluginOptions.logoutEndpoint,
      method: 'GET',
      config: {
        auth: pluginOptions.strategyName
      },
      handler: (request, reply) => {
        const nextString = request.query.next ? encodeURI(request.query.next) : '/';
        reply
          .redirect(nextString)
          .unstate(pluginOptions.cookieName, { path: pluginOptions.path });
      }
    });
  }
};
