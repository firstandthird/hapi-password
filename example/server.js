var Hapi = require('hapi');
var password = require('../');

var server = new Hapi.Server(8000);
server.pack.register(password, function(err) {
  server.auth.strategy('password', 'password', true, {
    password: 'password',
    cookieName: 'demo-login',
    loginRoute: '/auth',
    enableGETRoute: false
  });

  server.route({
    method: 'GET',
    path: '/',
    config: {
      handler: function(request, reply) {
        reply(request.auth);
      }
    }
  });

  server.route({
    method: 'GET',
    path: '/auth',
    config: {
      auth: false,
      handler: function(request, reply) {
        var error = request.query.error;

        var loginForm = '<form action="/auth" method="post">';

        if(error) {
          loginForm += '<p class="error">Invalid Password</p>';
        }

        loginForm += '<label for="password">Password:</label>';
        loginForm += '<input type="password" name="password"/>';

        if(request.query.next) {
          loginForm += '<input type="hidden" name="next" value="'+encodeURI(request.query.next)+'"/>';
        }

        loginForm += '<input type="submit" value="Sign In"/></form>';

        reply(loginForm);
      }
    }
  });

  server.start(function(err) {
    console.log('Server started at:', server.info.uri);
  });
});
