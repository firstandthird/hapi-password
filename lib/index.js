var crypto = require('crypto');
var Hoek = require('hoek');
var Boom = require('boom');
var Handlebars = require('handlebars');
var path = require('path');

exports.register = function(plugin, options, next) {
  plugin.auth.scheme('hapi-password', function(server, options) {
    options = Hoek.applyToDefaults({
      loginRoute: '/login',
      cookieName: 'hapi-password',
      salt: 'rock hard salt',
      password: 'password',
      automaticRoute: true
    }, options);

    var pass = crypto.createHash('md5').update(options.password + options.salt).digest('hex');

    plugin.views({
      engines: {
        html: {
          module: Handlebars.create()
        }
      },
      path: path.resolve(__dirname, '../views')
    });

    plugin.route({
      method: ['GET','POST'],
      path: options.loginRoute,
      config: {
        auth: false,
        handler: function(request, reply) {
          var error = false;

          if(request.method === 'post') {
            if(request.payload.password === options.password) {
              if(request.query.api) {
                return reply({password: pass});  
              }

              return reply
                .redirect(request.payload.next || '/')
                .state(options.cookieName, pass);
            }

            error = true;
          }

          reply.view('login', {
            path: options.loginRoute,
            error: error,
            options: options,
            next: request.query.next
          });
        }
      }
    });

    return {
      authenticate: function(request, reply) {
        var cookie = request.state[options.cookieName];

        if(cookie) {
          if(cookie === pass) {
            return reply(null, {credentials: pass});
          } else {
            return reply.redirect(options.loginRoute).unstate(options.cookieName);
          }
        }

        if(request.query.password) {
          if(request.query.password === pass) {
            return reply(null, {credentials: pass});
          } else {
            return reply(Boom.unauthorized('Invalid password.'));
          }
        }

        return reply.redirect(options.loginRoute + '?next=' + request.url.path);
      }
    }
  });

  next();
};

exports.register.attributes = {
    pkg: require('../package.json')
};