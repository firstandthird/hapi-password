var Hapi = require('hapi');

var server = new Hapi.Server();
server.connection({ host: 'localhost', port: 8000 });

server.register({
  register: require('../'),
  options: {

  }
}, function(err) {
  server.auth.strategy('password', 'password', true, {
    password: 'password',
    cookieName: 'demo-login',
    ttl: 1000*60*5,
    queryKey: 'token',
    loginForm: {
      name: 'hapi-password example',
      description: 'password is password.  duh'
    }
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
