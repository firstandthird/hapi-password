
3.0.0 / 2017-01-10
==================

  * Redirects if already logged in

2.2.0 / 2016-10-21
==================

  * added name to creds

2.1.1 / 2016-10-21
==================

  * fixed ttl

2.1.0 / 2016-10-21
==================

  * updated readme
  * path defaults to /
  * ttl defaults to 30 days
  * name and password use same ttl
  * updated to hapi 15, set isSecure to false

2.0.0 / 2016-07-05
==================

  * allows options.password to be specified as an object

1.1.0 / 2016-06-20
==================

  * allows non-RFC 6265 cookies for 'name'

1.0.0 / 2016-06-15
==================

  * removed query.api/queryKey options
  * updated package and lib/ example/ files
  * travis, readme, eslint added, lab tests added

0.6.0 / 2016-06-12
==================

  * added option for logout endpoint
  * option to ask users name when logging in
  * don't limit example server to localhost
  * updated depedencies
  * added example npm script

0.5.0 / 2015-10-23
==================

  * set cookie on root path

0.4.0 / 2015-09-26
==================

  * pass in text password via query instead of salted
  * must pass in salt
  * allow setting or disabling the query key.  fixing so it actually works
  * remove default password and throw error if nothing passed in

0.3.0 / 2015-05-13
==================

  * fixed spacing if no description
  * be able to set a ttl for the password cookie


0.2.0 / 2015-04-28
==================

  * fix when authenticated


0.1.1 / 2015-04-23
==================

  * tweak to login page design


0.1.0 / 2015-04-23
==================

  * refactor, better default login screen, updated options - see example


0.0.1 / 2014-11-01 
==================

  * Initial Release
