const path = require('path');
const Handlebars = require('handlebars');
const fs = require('fs');

// set up a rendering method for returning the login form:
const loginHtml = fs.readFileSync(path.join(__dirname, '../views/login.html'), 'utf8');
const loginView = Handlebars.compile(loginHtml);
module.exports = (request, options) => loginView({
  formTitle: options.loginForm.name,
  askName: options.loginForm.askName,
  userName: request.state[options.cookieNameName],
  description: options.loginForm.description,
  css: options.loginForm.css,
  error: request.query.error,
  endpoint: options.endpoint,
  next: request.query.next ? encodeURI(request.query.next) : false
});
