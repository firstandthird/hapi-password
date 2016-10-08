# hapi-password  


[![Build Status](https://travis-ci.org/firstandthird/hapi-password.svg?branch=master)](https://travis-ci.org/firstandthird/hapi-password)


### A Hapi plugin that provides an easy-to-use password authentication scheme and login page for your routes.  


## 1. Install

```
npm install hapi-password
```

## 2. Use

```js
// register the plugin with your hapi server:
server.register({
  register: require('hapi-password'),
  options: {
    path: '/myCookiePath'
  }
}, () => {
  // now the 'password' auth strategy is available:
  server.auth.strategy('password', 'password', true, {
    // the password to allow:
    password: {
      'my_password': {
        // some optional credentials information:
        name: 'Thing One'
      },
      'another password': {
        // some optional credentials information:
        name: 'Thing Two'
      }
    },
    // you can define a salt:
    salt: 'here is a random salt for encryption',
    // you can customize the name of your cookie:
    cookieName: 'my-cookie',
    // how long should the cookie live?
    ttl: 1000 * 60 * 5,
    // the name of the query parameter that will have the key:
    queryKey: 'token',
    // hapi-password comes equipped with an HTML login template
    // you can customize how it looks or make your own:
    loginForm: {
      name: 'The Login Form',
      description: 'Enter your password to proceed.'
    }
  });
});
```

  Now your routes are password protected!  Invoking a protected route will cause hapi to redirect the browser to the '/login' page. Once logged in, session authentication is provided by the cookie, which is fully configurable and lasts until the ttl timer expires.
  To review, the steps were:
  1. create a hapi server
  2. register the hapi-password plugin with your server
  3. register the strategy with whatever options you want
  4. define your routes

   See the example folder and the unit tests in test/server-test.js for more examples.

## 3. Strategy options
  These are options that you can pass to your call to server.auth.strategy:

- __password__: a password or map of passwords -> user credentials. If only one password is provided, then all users will share that one common password and one common account. Alternatively you can provide an object, where the keys are the passwords and the values are the [hapi user credentials](http://hapijs.com/tutorials/auth#authenticate) object associated with that password.
- __salt__: a [salt](https://en.wikipedia.org/wiki/Salt_(cryptography) used for encrypting passwords.
- __cookieName__: the name to give the authentication cookie
- __ttl__: how long (in milliseconds) before the cookie is unset and the authentication expires
- __queryKey__: the query parameter that specifies the key
- __loginForm__: data to pass to the login.html view

## 4. Registration Options

  Thse are options that you can pass to your call to server.register, when registering the plugin:
- __path__: the path of the authentication cookie (see https://www.nczonline.net/blog/2009/05/05/http-cookies-explained/ for help understanding cookie paths).  Default is '/'.
- __schemeName__: the name hapi will use to identify this authentication scheme, can be whatever you want.  The default is "password".
