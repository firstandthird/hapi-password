'use strict';
const Hapi = require('hapi');
const code = require('code');
const lab = exports.lab = require('lab').script();
const hapiPassword = require('../index.js');

let server;
lab.beforeEach((done) => {
  server = new Hapi.Server({
    debug: {
      log: ['hapi-password']
    }
  });
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

lab.test('should not redirect /login if credentials not posted ', (done) => {
  server.register({
    register: hapiPassword,
    options: {}
  }, (err) => {
    if (err) {
      console.log(err);
    }
    server.inject({
      url: '/login'
    }, (response) => {
      code.expect(response.statusCode).to.equal(200);
      done();
    });
  });
});

lab.test('passes back a security cookie when credentials are posted ', (done) => {
  server.register({
    register: hapiPassword,
    options: {
      cookieName: 'demo-login',
      isSecure: true
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
        code.expect(response.headers['set-cookie'][0]).to.include('Secure;');
        done();
      });
    });
  });
});

lab.test('allows login when credentials are posted ', (done) => {
  server.register({
    register: hapiPassword,
    options: {
      cookieName: 'demo-login',
      isSecure: true
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

lab.test('login route redirects if user already logged in ', (done) => {
  server.register({
    register: hapiPassword,
    options: {}
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

lab.test('allows you to specify multiple credentials to match against ', (done) => {
  server.register({
    register: hapiPassword,
    options: {
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

lab.test('returns the correct credentials for a given password ', (done) => {
  server.register({
    register: hapiPassword,
    options: {
      cookieName: 'demo-login',
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

lab.test('allows login when credentials are posted even if name has a space in it', (done) => {
  server.register({
    register: hapiPassword,
    options: {
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

lab.test('able to pass in isSecure option to cookie setting', (done) => {
  server.register({
    register: hapiPassword,
    options: {
      isSecure: false,
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
        // will not contain the Secure header:
        code.expect(response.headers['set-cookie'][0]).to.not.include('Secure;');
        done();
      });
    });
  });
});

lab.test('path as option, default path is "/"', (done) => {
  server.register({
    register: hapiPassword,
    options: {
      path: '/path1/path2',
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

lab.test('option to log failed passwords', (done) => {
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

lab.test('can stay logged in with "?token="', (done) => {
  server.register({
    register: hapiPassword,
    options: {}
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
