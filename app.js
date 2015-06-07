var express = require('express');
var dom = require('express-dom');

var cantrip = require('cantrip')({
	file: "data/todo.json"
});

var bodyParser = require('body-parser');
var ini = require('./lib/express-ini');

var Path = require('path');
var URL = require('url');

var app = express();

var config = ini(app);

dom.settings.display = config.raja.display;
dom.settings.stall = 20000;
dom.settings.allow = "same-origin";

config.site = URL.parse(config.site);
config.site.port = config.site.port || 80;
config.listen = config.listen || config.site.port;

var server = require('http').createServer(app);

server.listen(config.listen);

app.set('statics', process.cwd() + '/public');				// static files

if (!config.raja.io) config.raja.io = config.site.protocol + '//' + config.site.host;
var rajaServer = URL.parse(config.raja.io.split(' ').shift()).host == config.site.host ? server : null;

raja = require('raja')({
	// empty cache on start
	reset: !!process.env.RAJA_RESET,
	// in-memory cache
	cacheSize: 100,
	// allow raja to recognize its own proxies
	namespace: config.raja.namespace,
	// the orm store
	store: config.database, // share app db
	// the http server to use for socket.io server
	server: rajaServer,
	// private token for writing to sockets
	token: config.raja.token,
	// socket.io client
	client: config.raja.io,
	// dom proxy
	dom: dom,
	// statics proxy
	statics: app.get('statics'),
	// disable raja proxies
	disable: false
}, ready);

function ready(err, raja) {
	if (err) {
		console.error(err);
		process.exit(1);
	}

	app.route(/^\/(css|img|js)\//).get(
		raja.proxies.express.middleware,
		raja.proxies.statics,
		function(req, res, next) {
			// workaround
			if (/\.js/.test(req.path)) res.set('Content-Type', 'text/javascript; charset=utf-8');
			next();
		},
		express.static(app.get('statics')),
		function(req, res, next) {
			console.info("File not found", req.path);
			res.sendStatus(404);
		}
	);

	app.route('/').get(
		raja.proxies.express.middleware,
		dom('index')
	);

	app.use('/api',
		bodyParser.json(),
		cantrip,
		function(req, res, next) {
			res.send(res.body);
		},
		function(err, req, res, next) {
			res.status(err.status).send(err);
		}
	);

	process.title = config.raja.namespace + "-" + app.settings.env;
	process.on('uncaughtException', function(err) {
		console.log(err.stack || err.message);
	});
	console.log("%s\n%s", process.title, app.settings.site.href);

}
