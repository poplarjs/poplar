/**
 * To run this app do this:
 *
 * $ npm install express mongoose
 * $ node app.js
 */

var express = require('express');
var app = express();
app.disable('x-powered-by');
var poplar = require('./poplar');

var api = new poplar();

app.use(api.handler('rest'));
app.use(express.static('public'));

app.listen(3000);
