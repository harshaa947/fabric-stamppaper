var winston = require('winston'); // logger module
var cp_general = require(appRoot+'/config/general');

var logger = new (winston.Logger)({
	level: cp_general.LOG_LEVEL,
	transports: [
		new (winston.transports.Console)({ colorize: true }),
	]
});

module.exports = logger;
