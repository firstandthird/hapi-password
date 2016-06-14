'use strict';
const Hapi = require('hapi');
const server = new Hapi.Server();
server.connection({ port: 8000 });

server.register({
  register: require('../'),
  options: {
  }
}, () => {
  server.auth.strategy('password', 'password', true, {
    password: 'password',
    salt: 'here is a salt',
    cookieName: 'demo-login',
    ttl: 1000 * 60 * 5,
    queryKey: 'token',
    loginForm: {
      name: 'hapi-password example',
      description: 'password is password.  duh',
      askName: true
    }
  });

  server.route({
    method: 'GET',
    path: '/',
    config: {
      handler: (request, reply) => {
        reply(request.auth);
      }
    }
  });

  server.start((err) => {
    if (err) {
      return console.log(err);
    }
    console.log('Server started at:', server.info.uri);
  });
});
