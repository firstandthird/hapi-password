'use strict';
const crypto = require('crypto');
const Hoek = require('hoek');
const Handlebars = require('handlebars');
const fs = require('fs');
const path = require('path');

const pluginDefaults = {
  schemeName: 'password'
};

const schemeDefaults = {
  endpoint: '/login',
  logoutEndpoint: '/logout',
  successEndpoint: '/',
  cookieName: 'hapi-password',
  cookieNameName: 'hapi-password-name',
  salt: '',
  password: '',
  ttl: null,
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
    if (!options.salt) {
      throw new Error('must set salt');
    }
    const pass = crypto.createHash('md5').update(options.password + options.salt).digest('hex');
    authServer.route({
      method: 'POST',
      path: options.endpoint,
      config: {
        auth: false,
        handler: (request, reply) => {
          if (request.payload.password === options.password) {
            return reply
              .redirect(request.payload.next || options.successEndpoint)
              .state(options.cookieName, pass, {
                ttl: options.ttl,
                path: '/',
              })
              .state(options.cookieNameName, request.payload.name, {
                ttl: 1000 * 60 * 60 * 24 * 30,
                path: '/',
                strictHeader: false // allows 'name' to include whitespace and other special chars, etc)
              });
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
          if (cookie === pass) {
            return reply.continue({
              credentials: {
                password: pass,
                name
              }
            });
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
