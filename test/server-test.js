'use strict';
const Hapi = require('hapi');
const code = require('code');
const lab = exports.lab = require('lab').script();
const hapiPassword = require('../index.js');

let server;
lab.beforeEach((done) => {
  server = new Hapi.Server({ });
  server.connection({ port: 8080 });
  done();
});

lab.afterEach((done) => {
  server.stop(() => {
    done();
  });
});

lab.test('should redirect if credentials not posted ', (done) => {
  server.register({
    register: hapiPassword,
    options: {}
  }, (err) => {
    if (err) {
      console.log(err);
    }
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
    server.inject({
      url: '/'
    }, (response) => {
      code.expect(response.statusCode).to.equal(302);
      code.expect(response.headers.location).to.equal('/login?next=/');
      done();
    });
  });
});

lab.test('passes back a security cookie when credentials are posted ', (done) => {
  server.register({
    register: hapiPassword,
    options: {}
  }, (err) => {
    if (err) {
      console.log(err);
    }
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
      path: '/success',
      config: {
        handler: (request, reply) => {
          return reply('success!');
        }
      }
    });
    server.start(() => {
      server.inject({
        url: '/login',
        method: 'POST',
        payload: {
          name: 'somename',
          password: 'password',
          next: '/success'
        }
      }, (response) => {
        code.expect(response.statusCode).to.equal(302);
        code.expect(response.headers.location).to.equal('/success');
        code.expect(response.headers['set-cookie']).to.not.equal(undefined);
        code.expect(response.headers['set-cookie'][0].indexOf('demo-login')).to.be.greaterThan(-1);
        done();
      });
    });
  });
});

lab.test('allows login when credentials are posted ', (done) => {
  server.register({
    register: hapiPassword,
    options: {}
  }, (err) => {
    if (err) {
      console.log(err);
    }
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
      path: '/success',
      config: {
        handler: (request, reply) => {
          return reply('success!');
        }
      }
    });
    server.start(() => {
      server.inject({
        url: '/login',
        method: 'POST',
        payload: {
          name: 'somename',
          password: 'password',
          next: '/success'
        }
      }, (response) => {
        code.expect(response.statusCode).to.equal(302);
        code.expect(response.headers.location).to.equal('/success');
        code.expect(response.headers['set-cookie']).to.not.equal(undefined);
        code.expect(response.headers['set-cookie'][0].indexOf('demo-login')).to.be.greaterThan(-1);
        const cookieString = response.headers['set-cookie'][0].split(";")[0] + ';';
        server.inject({
          url: response.headers.location,
          headers: {
            Cookie: cookieString
          }
        }, (getResponse) => {
          code.expect(getResponse.statusCode).to.equal(200);
          code.expect(getResponse.result).to.equal('success!');
          done();
        });
      });
    });
  });
});
