var crypto = require('crypto');
var Hoek = require('hoek');
var Boom = require('boom');
var Handlebars = require('handlebars');
var fs = require('fs');
var path = require('path');


var pluginDefaults = {
  schemeName: 'password'
};

var schemeDefaults = {
  endpoint: '/login',
  logoutEndpoint: '/logout',
  successEndpont: '/',
  cookieName: 'hapi-password',
  cookieNameName: 'hapi-password-name',
  salt: '',
  password: '',
  queryKey: 'password',
  ttl: null,
  loginForm: {
    name: 'Login',
    description: '',
    askName: false
  }
};

exports.register = function(server, pluginOptions, next) {

  var loginHtml = fs.readFileSync(path.join(__dirname, '../views/login.html'), 'utf8');
  var loginView = Handlebars.compile(loginHtml);

  pluginOptions = Hoek.applyToDefaults(pluginDefaults, pluginOptions);

  server.auth.scheme(pluginOptions.schemeName, function(server, options) {

    options = Hoek.applyToDefaults(schemeDefaults, options);

    if (!options.password) {
      throw new Error('must set a password');
    }

    if (!options.salt) {
      throw new Error('must set salt');
    }


    var pass = crypto.createHash('md5').update(options.password + options.salt).digest('hex');

    server.route({
      method: 'POST',
      path: options.endpoint,
      config: {
        auth: false,
        handler: function(request, reply) {
          if(request.payload.password === options.password) {

            if(request.query.api) {
              return reply({ password: pass });
            }

            return reply
              .redirect(request.payload.next || options.successEndpont)
              .state(options.cookieName, pass, { ttl: options.ttl, path: '/' })
              .state(options.cookieNameName, request.payload.name, { ttl: 1000 * 60 * 60 * 24 * 30, path: '/' });
          }

          reply.redirect(options.endpoint + '?error=1' + (request.payload.next ? '&next=' + request.payload.next : '') );
        }
      }
    });

    if(typeof options.loginForm === 'object') {
      server.route({
        method: 'GET',
        path: options.endpoint,
        config: {
          auth: false,
          handler: function(request, reply) {

            var out = loginView({
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
        handler: function(request, reply) {
          var next = request.query.next ? encodeURI(request.query.next) : '/';
          reply
            .redirect(next)
            .unstate(options.cookieName);
        }
      });
    }

    return {
      authenticate: function(request, reply) {
        var cookie = request.state[options.cookieName];
        var name = request.state[options.cookieNameName];

        if(cookie) {
          if(cookie === pass) {
            return reply.continue({credentials: {
              password: pass,
              name: name
            }});
          } else {
            return reply.redirect(options.endpoint).unstate(options.cookieName);
          }
        }

        if(options.queryKey && request.query[options.queryKey]) {
          if(request.query[options.queryKey] === options.password) {
            return reply.continue({credentials: {
              password: pass,
              name: name
            }});
          } else {
            return reply(Boom.unauthorized('Invalid password.'));
          }
        }

        return reply.redirect(options.endpoint + '?next=' + request.url.path);
      }
    };
  });

  next();
};

exports.register.attributes = {
  pkg: require('../package.json')
};
