'use strict';
/* global process */
/* global __dirname */
/*******************************************************************************
 * [Marbles] - a simple Hyperledger Fabric blockchain application
 *
 * How To Run: Read readme on how to run. Typically it is something like `gulp marbles_tls` or `gulp marbles_local`
 *
 * How to Use: Read readme, please.
 *
 * Copyright (c) 2015 IBM Corp.
 * All rights reserved.
 *
 *******************************************************************************/
var express = require('express');
var session = require('express-session');
var compression = require('compression');
var serve_static = require('serve-static');
var path = require('path');
var cookieParser = require('cookie-parser');
var http = require('http');
var app = express();
var cors = require('cors');
var ws = require('ws');											// websocket module
								
// ------------- Init our libraries ------------- //
var wss = {};
var marbles_lib = null;
var path = require('path');
global.appRoot = path.resolve(__dirname);
var logger = require('./utils/log')
var ws_server = require('./utils/websocket_server_side.js');
var startup_lib = require('./utils/startup.js');
var misc = require('./utils/misc.js');												// mis.js has generic (non-blockchain) related functions
var cp_general = require(appRoot+'/config/general');





// --- Setup Express --- //
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(compression());
app.use(cookieParser());
app.use('/static',express.static(__dirname + '/public'));
app.use(session({ secret: 'lostmymarbles', resave: true, saveUninitialized: true }));
app.options('*', cors());
app.use(cors());

// ============================================================================================================================
// 												HTTP Webserver Routing
// ============================================================================================================================
app.use(require('./routes'));

// ============================================================================================================================
// 														Launch HTTP Webserver
// ============================================================================================================================
var port = cp_general.port;
var host = cp_general.host;
var server = http.createServer(app).listen(port, function () { });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
server.timeout = 240000;
console.log('\n');
console.log('----------------------------------- Server Up - ' + host + ':' + port + ' -----------------------------------');
process.on('uncaughtException', function (err) {
	logger.error('Caught exception: ', err.stack);		// marbles never gives up! (this is bad practice, but its just a demo)
	if (err.stack.indexOf('EADDRINUSE') >= 0) {			// well, except for this error
		logger.warn('---------------------------------------------------------------');
		logger.warn('----------------------------- Ah! -----------------------------');
		logger.warn('---------------------------------------------------------------');
		logger.error('You already have something running on port ' + port + '!');
		logger.error('Kill whatever is running on that port OR change the port setting in your marbles config file: ' + cp.config_path);
		process.exit();
	}
	if (wss && wss.broadcast) {							// if possible send the error out to the client
		wss.broadcast({
			msg: 'error',
			info: 'this is a backend error!',
			e: err.stack,
		});
	}
});
setupWebSocket();											// http server is already up, make the ws one now
let config_error = false;
if (config_error) {
	ws_server.record_state('checklist', 'failed');			// checklist step is done
	ws_server.broadcast_state();
} else {
	ws_server.record_state('checklist', 'success');		// checklist step is done
	console.log('\n');

	// --- [1] Test enrolling with our CA --- //
	startup_lib.enroll_admin(1, function (e) {
		if (e != null) {
			logger.warn('Error enrolling admin');
			ws_server.record_state('Adminenrolling', 'failed');
			ws_server.broadcast_state();
			startup_lib.startup_unsuccessful(host, port);
		} else {
			logger.info('Success enrolling admin');
			ws_server.record_state('Adminenrolling', 'success');
			ws_server.broadcast_state();

			// --- [2] Setup User --- //
			startup_lib.enrollUser(1, function (e) {

						if (e != null) {
							logger.warn('Error enrolling user');
							ws_server.record_state('Userenrolling', 'failed');
							ws_server.broadcast_state();
							startup_lib.startup_unsuccessful(host, port);
						} else {
							logger.info('Success enrolling user');
							ws_server.record_state('Userenrolling', 'success');
							ws_server.broadcast_state();
							}
					 });
		}
	});
}

// ============================================================================================================================
// 												Launch WebSocket Server
// ============================================================================================================================
function setupWebSocket() {
	console.log('------------------------------------------ Websocket Up ------------------------------------------');
	wss = new ws.Server({ server: server });						// start the websocket now
	wss.on('connection', function connection(ws) {

		// -- Process all websocket messages -- //
		ws.on('message', function incoming(message) {
			console.log(' ');
			console.log('-------------------------------- Incoming WS Msg --------------------------------');
			logger.debug('[ws] received ws msg:', message);
			var data = null;
			try {
				data = JSON.parse(message);							// it better be json
			} catch (e) {
				logger.debug('[ws] message error', message, e.stack);
			}

			// --- [5] Process the ws message  --- //
			if (data && data.type == 'setup') {						// its a setup request, enter the setup code
				logger.debug('[ws] setup message', data);
				startup_lib.setup_ws_steps(data);					// <-- open startup_lib.js to view the rest of the start up code

			} else if (data) {										// its a normal marble request, pass it to the lib for processing
				ws_server.process_msg(ws, data);					// <-- the interesting "blockchainy" code is this way (websocket_server_side.js)
			}
		});

		// log web socket errors
		ws.on('error', function (e) { logger.debug('[ws] error', e); });

		// log web socket connection disconnects (typically client closed browser)
		ws.on('close', function () { logger.debug('[ws] closed'); });

		// whenever someone connects, tell them our app's state
		ws.send(JSON.stringify(ws_server.build_state_msg()));				// tell client our app state
	});

	// --- Send a message to all connected clients --- //
	wss.broadcast = function broadcast(data) {
		var i = 0;
		wss.clients.forEach(function each(client) {							// iter on each connection
			try {
				logger.debug('[ws] broadcasting to clients. ', (++i), data.msg);
				client.send(JSON.stringify(data));							// BAM, send the data
			} catch (e) {
				logger.debug('[ws] error broadcast ws', e);
			}
		});
	};

	ws_server.setup(wss, null);
}
