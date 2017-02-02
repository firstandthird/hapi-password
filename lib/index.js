'use strict';
const crypto = require('crypto');
const Hoek = require('hoek');
const Handlebars = require('handlebars');
const fs = require('fs');
const path = require('path');
const _ = require('lodash');

const pluginDefaults = {
  schemeName: 'password',
  path: '/',
  logFailedAttempts: false
};

const schemeDefaults = {
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

// password-> credentials lookup table:
const passwordRepository = {};

// add credentials to the password object:
const registerCredentials = (password, salt) => {
  if (!password) {
    throw new Error('must set a password');
  }
  // if password is passed as a single string, there's only one password
  // (this will also trigger if the default options are used):
  if (typeof password === 'string' && typeof salt === 'string') {
    const pass = crypto.createHash('md5').update(password + salt).digest('hex');
    passwordRepository[password] = {
      encryptedPassword: pass
    };
  // otherwise assume that password is an object containing multiple password / credentials:
  } else {
    _.each(password, (credentials, passwordText) => {
      passwordRepository[passwordText] = {
        credentials,
        encryptedPassword: crypto.createHash('md5').update(passwordText + salt).digest('hex')
      };
    });
  }
};

// get credentials from the lookup object based on password:
const getCredentials = (password, useCookie) => {
  if (useCookie) {
    return _.find(passwordRepository, (o) => o.encryptedPassword === password);
  }
  return passwordRepository[password];
};

// set up a rendering method for returning the login form:
const loginHtml = fs.readFileSync(path.join(__dirname, '../views/login.html'), 'utf8');
const loginView = Handlebars.compile(loginHtml);
const renderLogin = (request, options) => loginView({
  formTitle: options.loginForm.name,
  askName: options.loginForm.askName,
  userName: request.state[options.cookieNameName],
  description: options.loginForm.description,
  css: options.loginForm.css,
  error: request.query.error,
  endpoint: options.endpoint,
  next: request.query.next ? encodeURI(request.query.next) : false
});

// set up routes for login / logout and for the login form:
const registerRoutes = (server, pluginOptions) => {
  // log in route:
  server.route({
    method: 'POST',
    path: pluginOptions.endpoint,
    config: {
      auth: false
    },
    handler: (request, reply) => {
      const credentials = getCredentials(request.payload.password);
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
          .unstate(pluginOptions.cookieName);
      }
    });
  }
};

const registerScheme = (server, pluginOptions) => {
  server.auth.scheme(pluginOptions.schemeName, (authServer, options) => {
    options = Hoek.applyToDefaults(schemeDefaults, options);
    registerCredentials(options.password, options.salt);
    return {
      authenticate: (request, reply) => {
        const cookie = request.state[options.cookieName];
        const name = request.state[options.cookieNameName];
        if (cookie) {
          const credentials = getCredentials(cookie, true);
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

exports.register = (server, pluginOptions, next) => {
  pluginOptions = Hoek.applyToDefaults(schemeDefaults, pluginOptions);
  registerScheme(server, pluginOptions);
  server.auth.strategy(pluginOptions.schemeName, pluginOptions.strategyName, true, pluginOptions);
  registerRoutes(server, pluginOptions);
  next();
};

exports.register.attributes = {
  pkg: require('../package.json')
};
