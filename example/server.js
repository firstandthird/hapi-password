/* eslint-disable no-console */
const Hapi = require('@hapi/hapi');
const server = Hapi.server();
server.connection({
  port: 8000,
  state: {
    isSecure: false
  }
});

server.register({
  register: require('../'),
  options: {
  }
}, () => {
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
