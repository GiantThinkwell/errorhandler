/*!
 * errorhandler
 * Copyright(c) 2010 Sencha Inc.
 * Copyright(c) 2011 TJ Holowaychuk
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var http = require('http');
var accepts = require('accepts');
var handlebars = require('handlebars');
var escapeHtml = require('escape-html');
var fs = require('fs');


/**
 * Register a helper to allow for writing raw values.
 * This is only useful when writing the css to the template.
 */
handlebars.registerHelper('raw', function(value) {
  return new handlebars.SafeString(value);
});


/**
 * Error handler:
 *
 * Development error handler, providing stack traces
 * and error message responses for requests accepting text, html,
 * or json.
 *
 * Text:
 *
 *   By default, and when _text/plain_ is accepted a simple stack trace
 *   or error message will be returned.
 *
 * JSON:
 *
 *   When _application/json_ is accepted, connect will respond with
 *   an object in the form of `{ "error": error }`.
 *
 * HTML:
 *
 *   When accepted connect will output a nice html stack trace.
 *
 * @return {Function}
 * @api public
 */

exports = module.exports = function errorHandler(){
  // get environment
  var env = process.env.NODE_ENV || 'development'

  return function errorHandler(err, req, res, next){
    // respect err.status
    if (err.status) {
      res.statusCode = err.status
    }

    // default status code to 500
    if (res.statusCode < 400) {
      res.statusCode = 500
    }

    // write error to console
    if (env !== 'test') {
      console.error(err.stack || String(err))
    }

    // cannot actually respond
    if (res._header) {
      return req.socket.destroy()
    }

    // negotiate
    var accept = accepts(req)
    var type = accept.types('html', 'json', 'text')

    // Security header for content sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff')

    // html
    if (type === 'html') {
      fs.readFile(__dirname + '/public/style.css', 'utf8', function(e, style){
        if (e) return next(e);
        fs.readFile(__dirname + '/public/error.html', 'utf8', function(e, html){
          if (e) return next(e);
          var html;
          try {
            html = handlebars.compile(html)({
              style: style,
              title: http.STATUS_CODES[res.statusCode] || exports.title,
              statusCode: res.statusCode,
              error: err
            });
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.end(html);
          }
          catch (e) {
            next(e);
          }
        });
      });
    // json
    } else if (type === 'json') {
      var error = { message: err.message, stack: err.stack };
      for (var prop in err) error[prop] = err[prop];
      var json = JSON.stringify({ error: error });
      res.setHeader('Content-Type', 'application/json');
      res.end(json);
    // plain text
    } else {
      res.setHeader('Content-Type', 'text/plain');
      res.end(err.stack || String(err));
    }
  };
};

/**
 * Template title, framework authors may override this value.
 */

exports.title = 'Connect';
