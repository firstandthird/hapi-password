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
  endpoint: '/login',
  logoutEndpoint: '/logout',
  isSecure: false,
  successEndpoint: '/',
  cookieName: 'hapi-password',
  cookieNameName: 'hapi-password-name',
  salt: '',
  password: '',
  ttl: 1000 * 60 * 60 * 24 * 30, // 30 days
  loginForm: {
    name: 'Login',
    description: '',
    askName: false
  }
};

exports.register = (server, pluginOptions, next) => {
  const loginHtml = fs.readFileSync(path.join(__dirname, '../views/login.html'), 'utf8');
  const loginView = Handlebars.compile(loginHtml);
  pluginOptions = Hoek.applyToDefaults(pluginDefaults, pluginOptions);

  server.auth.scheme(pluginOptions.schemeName, (authServer, options) => {
    options = Hoek.applyToDefaults(schemeDefaults, options);
    if (!options.password) {
      throw new Error('must set a password');
    }
    // if password is passed as a single string, there's only one password
    // (this will also trigger if the default options are used):
    if (typeof options.password === 'string' && typeof options.salt === 'string') {
      const pass = crypto.createHash('md5').update(options.password + options.salt).digest('hex');
      const password = options.password;
      options.password = {};
      options.password[password] = {
        encryptedPassword: pass
      };
    // otherwise assume that password is an object containing multiple password / credentials:
    } else {
      _.each(options.password, (credentials, password) => {
        const pass = crypto.createHash('md5').update(password + options.salt).digest('hex');
        options.password[password].encryptedPassword = pass;
      });
    }
    authServer.route({
      method: 'POST',
      path: options.endpoint,
      config: {
        auth: false,
        handler: (request, reply) => {
          const credentials = options.password[request.payload.password];
          if (credentials) {
            return reply
              .redirect(request.payload.next || options.successEndpoint)
              .state(options.cookieName, credentials.encryptedPassword, {
                isSecure: options.isSecure,
                ttl: options.ttl,
                path: options.path
              })
              .state(options.cookieNameName, request.payload.name, {
                isSecure: options.isSecure,
                ttl: options.ttl,
                path: options.path,
                strictHeader: false // allows 'name' to include whitespace and other special chars, etc)
              });
          }
          if (pluginOptions.logFailedAttempts) {
            server.log(['hapi-password'], `Failed login at ${new Date}: Name: ${request.payload.name}`);
          }
          const nextString = request.payload.next ? `&next=${request.payload.next}` : '';
          reply.redirect(`${options.endpoint}?error=1${nextString}`);
        }
      }
    });

    if (typeof options.loginForm === 'object') {
      server.route({
        method: 'GET',
        path: options.endpoint,
        config: {
          auth: false,
          handler: (request, reply) => {
            const out = loginView({
              formTitle: options.loginForm.name,
              askName: options.loginForm.askName,
              userName: request.state[options.cookieNameName],
              description: options.loginForm.description,
              css: options.loginForm.css,
              error: request.query.error,
              endpoint: options.endpoint,
              next: request.query.next ? encodeURI(request.query.next) : false
            });
            reply(null, out);
          }
        }
      });
    }

    if (options.logoutEndpoint) {
      server.route({
        path: options.logoutEndpoint,
        method: 'GET',
        config: {
          auth: false
        },
        handler: (request, reply) => {
          const nextString = request.query.next ? encodeURI(request.query.next) : '/';
          reply
            .redirect(nextString)
            .unstate(options.cookieName);
        }
      });
    }

    return {
      authenticate: (request, reply) => {
        const cookie = request.state[options.cookieName];
        const name = request.state[options.cookieNameName];
        if (cookie) {
          const credentials = _.find(options.password, (o) => o.encryptedPassword === cookie);
          if (credentials) {
            // return the credentials, minus the encryptedPassword:
            const creds = _.omit(credentials, ['encryptedPassword']);
            if (!creds.name && name) {
              creds.name = name;
            }
            return reply.continue({ credentials: creds });
          }
          return reply.redirect(options.endpoint).unstate(options.cookieName);
        }
        return reply.redirect(`${options.endpoint}?next=${request.url.path}`);
      }
    };
  });
  next();
};

exports.register.attributes = {
  pkg: require('../package.json')
};
