var crypto = require('crypto');
var Hoek = require('hoek');
var Boom = require('boom');

exports.register = function(plugin, options, next) {
  plugin.auth.scheme('password', function(server, options) {
    options = Hoek.applyToDefaults({
      loginRoute: '/login',
      enableRoute: true,
      cookieName: 'hapi-password',
      salt: 'rock hard salt',
      password: 'password'
    }, options);

    var pass = crypto.createHash('md5').update(options.password + options.salt).digest('hex');

    plugin.route({
      method: 'POST',
      path: options.loginRoute,
      config: {
        auth: false,
        handler: function(request, reply) {
          if(request.payload.password === options.password) {
            if(request.query.api) {
              return reply({password: pass});  
            }

            return reply
              .redirect(request.payload.next || '/')
              .state(options.cookieName, pass);
          }

          reply.redirect(options.loginRoute + '?error=1' + (request.payload.next ? '&next=' + request.payload.next : '') )
        }
      }
    });

    if(options.enableRoute) {
      plugin.route({
        method: 'GET',
        path: options.loginRoute,
        config: {
          auth: false,
          handler: function(request, reply) {
            var error = request.query.error;

            var loginForm = '<form action="'+options.loginRoute+'" method="post">';

            if(error) {
              loginForm += '<p class="error">Invalid Password</p>';
            }

            loginForm += '<label for="password">Password:</label>';
            loginForm += '<input type="password" name="password"/>';

            if(request.query.next) {
              loginForm += '<input type="hidden" name="next" value="'+encodeURI(request.query.next)+'"/>';
            }

            loginForm += '<input type="submit" value="Sign In"/></form>';

            reply(null, loginForm);
          }
        }
      });
    }

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
