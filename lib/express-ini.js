var ini = require('ini');
var readfile = require('fs').readFileSync;
var join = require('path').join;

module.exports = function(app) {
	var config = ini.parse(readfile(join(__dirname, '..', 'config.ini'), 'utf-8'));
	config = config[app.settings.env];
	for (var i in config) app.settings[i] = config[i];
	return app.settings;
};

