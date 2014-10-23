var Hapi = require('hapi');
var password = require('../');

var server = new Hapi.Server(8000);
server.pack.register(password, function(err) {
  server.auth.strategy('password', 'hapi-password', true, {
    password: 'password',
    cookieName: 'demo-login',
    loginRoute: '/auth'
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

  server.start(function(err) {
    console.log('Server started at:', server.info.uri);
  });
});