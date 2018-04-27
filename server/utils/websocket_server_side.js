	var fcw = require(appRoot+'/utils/fabric');
	var ws_server = {};
	var known_everything = {};
	
	var wss = {};
	var known_height = 0;
	var checkPeriodically = null;
	var enrollInterval = null;
	var start_up_states = {												//Stamp Server Startup Steps
		checklist: { state: 'waiting', step: 'step1' },					// Step 1 - check config files for somewhat correctness
		Adminenrolling: { state: 'waiting', step: 'step2' },			// Step 2 - enroll the admin
		Userenrolling:	{ state: 'waiting', step: 'step3' },			// Step 3 - enroll the user	
		find_chaincode: { state: 'success', step: 'step4' },			// Step 4 - find the chaincode on the channel
					
	};
var logger = require(appRoot + '/utils/log')
var cp_general = require(appRoot+'/config/general');
	//--------------------------------------------------------
	// Setup WS Module
	//--------------------------------------------------------
	ws_server.setup = function (l_wss) {
		
		wss = (l_wss) ? l_wss : wss;

		
	};

	// Message to client to communicate where we are in the start up
	ws_server.build_state_msg = function () {
		return {
			msg: 'app_state',
			state: start_up_states,
		};
	};

	// record new app state
	ws_server.record_state = function (change_state, outcome) {
		start_up_states[change_state].state = outcome;
	};

	// Send to all connected clients
	ws_server.broadcast_state = function () {
		try {
			wss.broadcast(ws_server.build_state_msg());						//tell client our app state
		} catch (e) { }														//this is expected to fail for "checking"
	};

	//--------------------------------------------------------
	// Process web socket messages - blockchain code is near. "marbles_lib"
	//--------------------------------------------------------
	
	ws_server.process_msg = function (ws, data) {
		
		logger.info(data)
		var options = {
			
			ws: ws,
			
		};

		 if (data.type === 'read_everything') {
			logger.info('[ws] read everything req');
			ws_server.check_for_updates(ws);
		} else if (data.type === 'audit') {
			if (data.stamp_id) {
				logger.info('[ws] audit history');
				var request = {
						//targets : --- letting this default to the peers assigned to the channel
						chaincodeId: cp_general.chaincodeId,
						fcn: 'getHistory',
						args: [data.stamp_id]
					};
				fcw.query_transaction(request, function (err, resp) {
					if (err != null) send_err(err, resp);
					else options.ws.send(JSON.stringify({ msg: 'history', data: resp }));
				});
			}
		} else if (data.type === 'create') {
			logger.info('[ws] create Stamp req');
			
			var options = [data.key, data.timestamp, data.hash, data.attachLength]
			for(var i=0;i<data.attachLength;i++){
				options.push(attach[i]);
				}
			options.push(data.State);
			options.push(data.signLength);
			for(var i=0;i<data.signLength;i++){
				options.push(data.sign[i].sign);
				options.push(data.sign[i].id);				
			}
						request = {
					//targets: let default to the peer assigned to the client
					chaincodeId: cp_general.chaincodeId,
					fcn: 'createStamp',
					args:options,
					chainId: cp_general.channel,
				};
			fcw.create_transaction(options, function (err, resp) {
				if (err != null) send_err(err, data);
				else options.ws.send(JSON.stringify({ msg: 'tx_step', state: 'finished' }));
			});
		}






		// send transaction error msg
		function send_err(msg, input) {
			sendMsg({ msg: 'tx_error', e: msg, input: input });
			sendMsg({ msg: 'tx_step', state: 'committing_failed' });
		}

		// send a message, socket might be closed...
		function sendMsg(json) {
			if (ws) {
				try {
					ws.send(JSON.stringify(json));
				}
				catch (e) {
					logger.debug('[ws error] could not send msg', e);
				}
			}
		}

		// endorsement stage callback
		function endorse_hook(err) {
			if (err) sendMsg({ msg: 'tx_step', state: 'endorsing_failed' });
			else sendMsg({ msg: 'tx_step', state: 'ordering' });
		}

		// ordering stage callback
		function orderer_hook(err) {
			if (err) sendMsg({ msg: 'tx_step', state: 'ordering_failed' });
			else sendMsg({ msg: 'tx_step', state: 'committing' });
		}
	};

	// sch next periodic check
	function sch_next_check() {
		clearTimeout(checkPeriodically);
		checkPeriodically = setTimeout(function () {
			try {
				ws_server.check_for_updates(null);
			}
			catch (e) {
				console.log('');
				logger.error('Error in sch next check\n\n', e);
				sch_next_check();
				ws_server.check_for_updates(null);
			}
		}, cp_general.blockDelay + 2000);
	}

	// --------------------------------------------------------
	// Check for Updates to Ledger
	// --------------------------------------------------------
	ws_server.check_for_updates = function (ws_client) {
		fcw.channel_stats(null, function (err, resp) {
			var newBlock = false;
			if (err != null) {
				var eObj = {
					msg: 'error',
					e: err,
				};
				if (ws_client) ws_client.send(JSON.stringify(eObj)); 									//send to a client
				else wss.broadcast(eObj);																//send to all clients
			} else {
				if (resp && resp.height && resp.height.low) {
					if (resp.height.low > known_height || ws_client) {
						if (!ws_client) {
							console.log('');
							logger.info('New block detected!', resp.height.low, resp);
							known_height = resp.height.low;
							newBlock = true;
							logger.debug('[checking] there are new things, sending to all clients');
							wss.broadcast({ msg: 'block', e: null, block_height: resp.height.low });	//send to all clients
						} else {
							logger.debug('[checking] on demand req, sending to a client');
							var obj = {
								msg: 'block',
								e: null,
								block_height: resp.height.low,
								block_delay: cp_general.blockDelay
							};
							ws_client.send(JSON.stringify(obj)); 										//send to a client
						}
					}
				}
			}

			if (newBlock || ws_client) {
				read_everything(ws_client, function () {
					sch_next_check();						//check again
				});
			} else {
				sch_next_check();							//check again
			}
		});
	};

	// read complete state of Stamp world
	function read_everything(ws_client, cb) {
		logger.info('[ws] audit history');
		var request = {
				//targets : --- letting this default to the peers assigned to the channel
				chaincodeId: cp_general.chaincodeId,
				fcn: 'readEverything',
				args: []
			};
		fcw.query_transaction(request, function (err, resp) {
			if (err != null) {
				logger.debug('[checking] could not get everything:', err);
				var obj = {
					msg: 'error',
					e: err,
				};
				if (ws_client) ws_client.send(JSON.stringify(obj)); 								//send to a client
					else wss.broadcast(obj);																//send to all clients
				if (cb) cb();
			}else {
				var data = resp;
				logger.debug(resp);
				if (data && data.stamps) {
					logger.debug('[checking] number of stamps:', data.stamps.length);
				}

				data.stamps = organize_usernames(data.stamps);
				var knownAsString = JSON.stringify(known_everything);			//stringify for easy comparison (order should stay the same)
				var latestListAsString = JSON.stringify(data);

				if (knownAsString === latestListAsString) {
					logger.debug('[checking] same everything as last time');
					if (ws_client !== null) {									//if this is answering a clients req, send to 1 client
						logger.debug('[checking] sending to 1 client');
						ws_client.send(JSON.stringify({ msg: 'everything', e: err, everything: data }));
					}
				}
				else {															//detected new things, send it out
					logger.debug('[checking] there are new things, sending to all clients');
					known_everything = data;
					wss.broadcast({ msg: 'everything', e: err, everything: data });	//sent to all clients
				}
				if (cb) cb();
			}
		});
			

	}

	// organize the Stamp owner list
	function organize_usernames(data) {
		return data;
	}

	//
	function organize_stamps(allStamps) {
		return allStamps;
	}

	// alpha sort everyone else
	function sort_usernames(temp) {
		return temp;
	}

module.exports = ws_server;
