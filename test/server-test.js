'use strict';
const Hapi = require('hapi');
const code = require('code');
const lab = exports.lab = require('lab').script();
const hapiPassword = require('../index.js');

let server;
lab.beforeEach(async() => {
  server = new Hapi.Server({
    port: 8080,
    debug: {
      log: ['hapi-password']
    }
  });
});

lab.afterEach(async() => server.stop());
/*
lab.test('should redirect if credentials not posted ', async() => {
  await server.register({
    plugin: hapiPassword,
    options: {
      salt: 'aSalt',
      password: 'password'
    }
  });
  server.route({
    method: 'GET',
    path: '/',
    config: {
      auth: 'password',
      handler: (request, h) => request.auth
    }
  });
  const response = await server.inject({ url: '/' });
  code.expect(response.statusCode).to.equal(302);
  code.expect(response.headers.location).to.equal('/login?next=/');
});
*/
/*
lab.test('should not redirect /login if credentials not posted ', async() => {
  await server.register({
    plugin: hapiPassword,
    options: {
      salt: 'aSalt',
      password: 'password'
    }
  });
  const response = await server.inject({ url: '/login' });
  code.expect(response.statusCode).to.equal(200);
});

lab.test('passes back a security cookie when credentials are posted ', async() => {
  await server.register({
    plugin: hapiPassword,
    options: {
      salt: 'aSalt',
      password: 'password',
      cookieName: 'demo-login'
    }
  });
  server.route({
    method: 'GET',
    path: '/success',
    config: {
      handler: (request, h) => {
        return 'success!';
      }
    }
  });
  await server.start();
  const response = await server.inject({
    url: '/login',
    method: 'POST',
    payload: {
      name: 'somename',
      password: 'password',
      next: '/success'
    }
  });
  code.expect(response.statusCode).to.equal(302);
  code.expect(response.headers.location).to.equal('/success');
  code.expect(response.headers['set-cookie']).to.not.equal(undefined);
  code.expect(response.headers['set-cookie'][0]).to.include('demo-login');
  code.expect(response.headers['set-cookie'][0]).to.include('Secure;');
});

lab.test('allows login when credentials are posted ', async() => {
  await server.register({
    plugin: hapiPassword,
    options: {
      salt: 'aSalt',
      password: 'password',
      cookieName: 'demo-login'
    }
  });
  server.route({
    method: 'GET',
    path: '/success',
    config: {
      handler: (request, h) => {
        return 'success!';
      }
    }
  });
  await server.start();
  const response = await server.inject({
    url: '/login',
    method: 'POST',
    payload: {
      name: 'somename',
      password: 'password',
      next: '/success'
    }
  });
  code.expect(response.statusCode).to.equal(302);
  code.expect(response.headers.location).to.equal('/success');
  code.expect(response.headers['set-cookie']).to.not.equal(undefined);
  code.expect(response.headers['set-cookie'][0]).to.include('demo-login');
  const cookieString = `${response.headers['set-cookie'][0].split(';')[0]};`;
  const getResponse = await server.inject({
    url: response.headers.location,
    headers: {
      Cookie: cookieString
    }
  });
  code.expect(getResponse.statusCode).to.equal(200);
  code.expect(getResponse.result).to.equal('success!');
});
*/
lab.test('allows login and logout ', async() => {
  await server.register({
    plugin: hapiPassword,
    options: {
      salt: 'aSalt',
      password: 'password',
      cookieName: 'demo-login'
    }
  });
  server.route({
    method: 'GET',
    path: '/success',
    config: {
      handler: (request, h) => 'success!'
    }
  });
  await server.start();
  const response = await server.inject({
    url: '/login',
    method: 'POST',
    payload: {
      name: 'somename',
      password: 'password',
      next: '/success'
    }
  });
  code.expect(response.statusCode).to.equal(302);
  code.expect(response.headers.location).to.equal('/success');
  code.expect(response.headers['set-cookie']).to.not.equal(undefined);
  code.expect(response.headers['set-cookie'][0]).to.include('demo-login');
  const cookieString = `${response.headers['set-cookie'][0].split(';')[0]};`;
  const getResponse = await server.inject({
    url: '/success',
    headers: {
      Cookie: cookieString
    }
  });
  code.expect(getResponse.statusCode).to.equal(200);
  code.expect(getResponse.result).to.equal('success!');
  const getResponse2 = await server.inject({
    url: '/logout',
    headers: {
      Cookie: cookieString
    }
  });
  code.expect(getResponse2.statusCode).to.equal(302);
  code.expect(getResponse2.headers['set-cookie'][0]).to.include('demo-login=;');
  const cookieString2 = `${getResponse2.headers['set-cookie'][0].split(';')[0]};`;
  const loggedOutResponse = await server.inject({
    url: '/success',
    headers: {
      Cookie: cookieString2
    }
  });
  code.expect(loggedOutResponse.statusCode).to.equal(302);
  code.expect(loggedOutResponse.headers.location).to.equal('/login?next=/success');
});
/*
lab.test('login route redirects if user already logged in ', async() => {
  server.register({
    register: hapiPassword,
    options: {
      salt: 'aSalt',
      password: 'password'
    }
  }, (err) => {
    if (err) {
      console.log(err);
    }
    server.route({
      method: 'GET',
      path: '/success',
      config: {
        auth: 'password',
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
        const cookieString = `${response.headers['set-cookie'][0].split(';')[0]};`;
        server.inject({
          url: '/login',
          method: 'GET',
          headers: {
            Cookie: cookieString
          }
        }, (getResponse) => {
          code.expect(getResponse.statusCode).to.equal(302);
          done();
        });
      });
    });
  });
});

lab.test('allows you to specify multiple credentials to match against ', async() => {
  server.register({
    register: hapiPassword,
    options: {
      salt: 'aSalt',
      password: {
        'a password': {
          // some optional credentials information:
          name: 'Who Is There'
        },
        'another password': {
          // some optional credentials information:
          name: 'Interrupting Cow'
        }
      },
      cookieName: 'demo-login',
    }
  }, (err) => {
    if (err) {
      console.log(err);
    }
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
          password: 'another password',
          next: '/success'
        }
      }, (response) => {
        code.expect(response.statusCode).to.equal(302);
        code.expect(response.headers.location).to.equal('/success');
        code.expect(response.headers['set-cookie']).to.not.equal(undefined);
        code.expect(response.headers['set-cookie'][0]).to.include('demo-login');
        const cookieString = `${response.headers['set-cookie'][0].split(';')[0]};`;
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

lab.test('returns the correct credentials for a given password ', async() => {
  server.register({
    register: hapiPassword,
    options: {
      cookieName: 'demo-login',
      salt: 'aSalt',
      password: {
        'a password': {
          // some optional credentials information:
          name: 'Who Is There',
          role: 'serf'
        },
        'another password': {
          // some optional credentials information:
          name: 'Interrupting Cow',
          role: 'admin'
        }
      }
    }
  }, (err) => {
    if (err) {
      console.log(err);
    }
    server.route({
      method: 'GET',
      path: '/success',
      config: {
        handler: (request, reply) => {
          return reply(request.auth.credentials);
        }
      }
    });
    server.start(() => {
      server.inject({
        url: '/login',
        method: 'POST',
        payload: {
          name: 'somename',
          password: 'another password',
          next: '/success'
        }
      }, (response) => {
        code.expect(response.statusCode).to.equal(302);
        code.expect(response.headers.location).to.equal('/success');
        code.expect(response.headers['set-cookie']).to.not.equal(undefined);
        code.expect(response.headers['set-cookie'][0]).to.include('demo-login');
        const cookieString = `${response.headers['set-cookie'][0].split(';')[0]};`;
        server.inject({
          url: response.headers.location,
          headers: {
            Cookie: cookieString
          }
        }, (getResponse) => {
          code.expect(getResponse.statusCode).to.equal(200);
          // test will go here:
          code.expect(typeof getResponse.result).to.equal('object');
          code.expect(getResponse.result.name).to.equal('Interrupting Cow');
          code.expect(getResponse.result.role).to.equal('admin');
          done();
        });
      });
    });
  });
});

lab.test('allows login when credentials are posted even if name has a space in it', async() => {
  server.register({
    register: hapiPassword,
    options: {
      salt: 'aSlat',
      password: 'password',
      cookieName: 'demo-login',
      queryKey: 'token'
    }
  }, (err) => {
    if (err) {
      console.log(err);
    }
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
          name: 'No One',
          password: 'password',
          next: '/success'
        }
      }, (response) => {
        code.expect(response.statusCode).to.equal(302);
        code.expect(response.headers.location).to.equal('/success');
        code.expect(response.headers['set-cookie']).to.not.equal(undefined);
        code.expect(response.headers['set-cookie'][0]).to.include('demo-login');
        const cookieString = `${response.headers['set-cookie'][0].split(';')[0]};`;
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

lab.test('path as option, default path is "/"', async() => {
  server.register({
    register: hapiPassword,
    options: {
      salt: 'aSalt',
      password: 'password',
      cookiePath: '/path1/path2',
      cookieName: 'demo-login'
    }
  }, (err) => {
    if (err) {
      console.log(err);
    }
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
        code.expect(response.headers['set-cookie'][0]).to.include('demo-login');
        code.expect(response.headers['set-cookie'][1]).to.include('Path=/path1/path2');
        done();
      });
    });
  });
});

lab.test('option to log failed passwords', async() => {
  const results = [];
  const oldLog = console.error;
  console.error = (t1, t2, t3) => {
    results.push(t1);
    results.push(t2);
    results.push(t3);
  };
  server.register({
    register: hapiPassword,
    options: {
      salt: 'aSalt',
      password: 'password',
      logFailedAttempts: true
    }
  }, (err) => {
    if (err) {
      console.log(err);
    }
    server.start(() => {
      server.inject({
        url: '/login',
        method: 'POST',
        payload: {
          name: 'somename',
          password: 'incorrect',
          next: '/success'
        }
      }, (response) => {
        console.error = oldLog;
        code.expect(response.statusCode).to.equal(302);
        code.expect(results.length).to.equal(3);
        code.expect(results[2]).to.include('Failed login at');
        done();
      });
    });
  });
});

lab.test('can stay logged in with "?token="', async() => {
  server.register({
    register: hapiPassword,
    options: {
      salt: 'aSalt',
      password: 'password'
    }
  }, (err) => {
    if (err) {
      console.log(err);
    }
    server.route({
      method: 'GET',
      path: '/success',
      config: {
        auth: 'password',
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
        const cookieString = `${response.headers['set-cookie'][0].split(';')[0].split('=')[1]};`;
        server.inject({
          url: `/login?token=${cookieString}`,
          method: 'GET',
        }, (getResponse) => {
          code.expect(getResponse.statusCode).to.equal(302);
          code.expect(response.headers.location).to.equal('/success');
          done();
        });
      });
    });
  });
});
*/
