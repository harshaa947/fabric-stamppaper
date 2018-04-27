var async = require('async');
var path = require('path');
var startup_lib = {};
var logger = require(appRoot + '/utils/log')
var cp_general = require(appRoot+'/config/general');
var fcw = require(appRoot+'/utils/fabric');
var misc = require(appRoot+'/utils/misc');
var store_path = path.join(appRoot, cp_general.store_path);
var admin_user = null;
var member_user = null;
// Enroll an admin with the CA for this peer/channel
startup_lib.enroll_admin = function (attempt, cb) {
	fcw.enrollAdmin(function(errCode,obj){
		if (errCode != null) {
				logger.error(obj);

				// --- Try Again ---  //
				if (attempt >= 2) {
					if (cb) cb(obj);
				} else {
					startup_lib.removeKVS();
					startup_lib.enroll_admin(++attempt, cb);
				}
			} else {
				admin_user  = obj;
				if (cb) cb(null);
}
		});
};

startup_lib.enrollUser = function(attempt,cb){
	
	fcw.enrollUser(function(errCode,obj){
		if (errCode != null) {
				logger.error(obj);

				// --- Try Again ---  //
				if (attempt >= 2) {
					if (cb) cb(obj);
				} else {
					startup_lib.removeKVS();
					startup_lib.enroll_admin(0, function(err){
						if(err!=null){
							cb(err);
							}else{
								startup_lib.enrollUser(++attempt,cb);
								}
						
						});
					
				}
			} else {
				member_user  = obj;
				if (cb) cb(null);
}
		});
	
	
	}
	
	
startup_lib.check_setup  = function(cb){
	if(!admin_user){
		cb(false,"Admin User not enrolled"); 
		}
	else if(!memeber_user){
		cb(false,"User not enrolled"); 
		}
	else {
		cb(true,null);
		}
	
	}
	
	
startup_lib.setup_ws_steps = function (ws_server,data) {
		// --- [6] Enroll the admin (repeat if needed)  --- //
		if (data.configure === 'enrollment') {
			startup_lib.removeKVS();
			
			startup_lib.enroll_admin(1, function (e) {
				if (e == null) {
					startup_lib.enrollUser(1,function(e1){});
				}
			});
		}

		// --- [7] Find instantiated chaincode --- //
		else if (data.configure === 'find_chaincode') {
			
		}		
}	


startup_lib.removeKVS = function () {
		try {
			logger.warn('removing older kvs and trying to enroll again');
			misc.rmdir(store_path);			//delete old kvs folder
			logger.warn('removed older kvs');
		} catch (e) {
			logger.error('could not delete old kvs', e);
		}
	};

startup_lib.all_done = function (ws_server) {
		console.log('\n------------------------------------------ All Done ------------------------------------------\n');
		ws_server.record_state('register_owners', 'success');
		ws_server.broadcast_state();
		ws_server.check_for_updates(null);									//call the periodic task to get the state of everything
	};

// Wait for the user to help correct the config file so we can startup!
startup_lib.startup_unsuccessful = function (host, port) {
		console.log('\n\n- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -');
		logger.info('Detected that we have NOT launched successfully yet');
		logger.debug('Open your browser to http://' + host + ':' + port + ' and login as "admin" to initiate startup');
		console.log('- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -\n\n');
		// we wait here for the user to go the browser, then setup_marbles_lib() will be called from WS msg
};

// Startup has succeeded and user can now move to new code
startup_lib.startup_successful = function(host,port){
	console.log('\n\n- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -');
	logger.debug('Detected that we have launched successfully before');
	logger.debug('Welcome back - Marbles is ready');
	logger.debug('Open your browser to http://' + host + ':' + port + ' and login as "admin"');
	console.log('- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -\n\n');
	}
	
	
// Find if marbles has started up successfully before
startup_lib.detect_prev_startup = function (opts, cb) {
	return false;
};



module.exports = startup_lib;


