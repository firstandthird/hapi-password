'use strict';
const _ = require('lodash');
const crypto = require('crypto');

// password-> credentials lookup table:
const passwordRepository = {};

// add credentials to the password object:
module.exports.registerCredentials = (password, salt) => {
  if (!password) {
    throw new Error('must set a password');
  }
  // if password is passed as a single string, there's only one password
  // (this will also trigger if the default options are used):
  if (typeof password === 'string' && typeof salt === 'string') {
    const pass = crypto.createHash('md5').update(password + salt).digest('hex');
    passwordRepository[password] = {
      encryptedPassword: pass
    };
  // otherwise assume that password is an object containing multiple password / credentials:
  } else {
    _.each(password, (credentials, passwordText) => {
      passwordRepository[passwordText] = {
        credentials,
        encryptedPassword: crypto.createHash('md5').update(passwordText + salt).digest('hex')
      };
    });
  }
};

// get credentials from the lookup object based on password:
module.exports.getCredentials = (password, useCookie) => {
  if (useCookie) {
    return _.find(passwordRepository, (o) => o.encryptedPassword === password);
  }
  return passwordRepository[password];
};
