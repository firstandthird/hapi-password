'use strict';
const crypto = require('crypto');
const Hoek = require('hoek');
const Handlebars = require('handlebars');
const fs = require('fs');
const path = require('path');
const _ = require('lodash');

const pluginDefaults = {
  schemeName: 'password',
  path: '/'
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

exports.register = (server, pluginOptions, next) => {
  const loginHtml = fs.readFileSync(path.join(__dirname, '../views/login.html'), 'utf8');
  const loginView = Handlebars.compile(loginHtml);
  pluginOptions = Hoek.applyToDefaults(schemeDefaults, pluginOptions);
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
    server.auth.strategy(pluginOptions.schemeName, pluginOptions.strategyName,'try', pluginOptions);
    /*
    server.route({
      method: 'POST',
      path: pluginOptions.endpoint,
      config: {
        auth: pluginOptions.strategyName,
        handler: (request, reply) => {
          console.log('==s=')
          const credentials = pluginOptions.password[request.payload.password];
          console.log('&&&')
          console.log('&&&')
          console.log('&&&')
          console.log(request.auth)
          console.log(reply.auth)
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
          reply.redirect(`${options.endpoint}?error=1${nextString}`);
        }
      }
    });
    */
    if (typeof pluginOptions.loginForm === 'object') {
      server.route({
        method: 'GET',
        path: pluginOptions.endpoint,
        config: {
          auth: pluginOptions.strategyName,
          handler: (request, reply) => {
            console.log('get %s', pluginOptions.endpoint)
            // if already logged in, redirect to successEndpoint:
            const cookie = request.state[pluginOptions.cookieName];
            if (cookie) {
              const credentials = _.find(pluginOptions.password, (o) => o.encryptedPassword === cookie);
              if (credentials) {
                return reply.redirect(pluginOptions.successEndpoint);
              }
            }
            const out = loginView({
              formTitle: pluginOptions.loginForm.name,
              askName: pluginOptions.loginForm.askName,
              userName: request.state[pluginOptions.cookieNameName],
              description: pluginOptions.loginForm.description,
              css: pluginOptions.loginForm.css,
              error: request.query.error,
              endpoint: pluginOptions.endpoint,
              next: request.query.next ? encodeURI(request.query.next) : false
            });
            reply(null, out);
          }
        }
      });
    }
    if (pluginOptions.logoutEndpoint) {
      server.route({
        path: pluginOptions.logoutEndpoint,
        method: 'GET',
        config: {
          auth: pluginOptions.strategyName
        },
        handler: (request, reply) => {
          console.log('get endpoint')
          const nextString = request.query.next ? encodeURI(request.query.next) : '/';
          reply
            .redirect(nextString)
            .unstate(pluginOptions.cookieName);
        }
      });
    }
  next();
};

exports.register.attributes = {
  pkg: require('../package.json')
};
