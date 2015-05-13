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
  successEndpont: '/',
  cookieName: 'hapi-password',
  salt: 'rock hard salt',
  password: 'password',
  ttl: null,
  loginForm: {
    name: 'Project Name',
    description: ''
  }
};

exports.register = function(server, pluginOptions, next) {

  var loginHtml = fs.readFileSync(path.join(__dirname, '../views/login.html'), 'utf8');
  var loginView = Handlebars.compile(loginHtml);

  pluginOptions = Hoek.applyToDefaults(pluginDefaults, pluginOptions);

  server.auth.scheme(pluginOptions.schemeName, function(server, options) {

    options = Hoek.applyToDefaults(schemeDefaults, options);

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
              .state(options.cookieName, pass, { ttl: options.ttl });
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
              name: options.loginForm.name,
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

    return {
      authenticate: function(request, reply) {
        var cookie = request.state[options.cookieName];

        if(cookie) {
          if(cookie === pass) {
            return reply.continue({credentials: pass});
          } else {
            return reply.redirect(options.endpoint).unstate(options.cookieName);
          }
        }

        if(request.query.password) {
          if(request.query.password === pass) {
            return reply(null, {credentials: pass});
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
