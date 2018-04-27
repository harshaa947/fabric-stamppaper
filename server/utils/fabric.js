
var Fabric_Client = require('fabric-client');
var Fabric_CA_Client = require('fabric-ca-client');
var path = require('path');
var util = require('util');
var os = require('os');
var cp_general = require(appRoot+'/config/general');
var cp_private = require(appRoot+'/config/private');
var logger = require(appRoot + '/utils/log')


var fabric_client = new Fabric_Client();
var fabric_ca_client = null;
// setup the fabric network
var channel = fabric_client.newChannel(cp_general.channel);
var peer = fabric_client.newPeer(cp_general.peer_address);
channel.addPeer(peer);
var order = fabric_client.newOrderer(cp_general.orderer_address)
channel.addOrderer(order);

var admin_user = null;
var member_user = null;
var crypto_suite = null;
var store_path = path.join(appRoot, cp_general.store_path);
logger.info('Store path:'+store_path);
var tx_id = null;


function enrollAdmin(cb){
		Fabric_Client.newDefaultKeyValueStore({ path: store_path}).then((state_store) => {
			// assign the store to the fabric client
			fabric_client.setStateStore(state_store);
			var crypto_suite = Fabric_Client.newCryptoSuite();
			// use the same location for the state store (where the users' certificate are kept)
			// and the crypto store (where the users' keys are kept)
			var crypto_store = Fabric_Client.newCryptoKeyStore({path: store_path});
			crypto_suite.setCryptoKeyStore(crypto_store);
			fabric_client.setCryptoSuite(crypto_suite);
			var	tlsOptions = {
				trustedRoots: [],
				verify: false
			};
			// be sure to change the http to https when the CA is running TLS enabled
			fabric_ca_client = new Fabric_CA_Client(cp_general.ca_address, tlsOptions , cp_general.ca_domain, crypto_suite);
			// first check to see if the admin is already enrolled
			return fabric_client.getUserContext(cp_general.admin, true);
		}).then((user_from_store) => {
			if (user_from_store && user_from_store.isEnrolled()) {
				logger.info('Successfully loaded admin from persistence');
				admin_user = user_from_store;
				return null;
			} else {
				// need to enroll it with CA server
				return fabric_ca_client.enroll({
				  enrollmentID: cp_general.admin,
				  enrollmentSecret: cp_private.admin_pw
				}).then((enrollment) => {
				  logger.info('Successfully enrolled admin user "admin"');
				  return fabric_client.createUser(
					  {username: cp_general.admin,
						  mspid: cp_general.org_msp,
						  cryptoContent: { privateKeyPEM: enrollment.key.toBytes(), signedCertPEM: enrollment.certificate }
					  });
				}).then((user) => {
				  admin_user = user;
				  return fabric_client.setUserContext(admin_user);
				}).catch((err) => {
				  logger.error('Failed to enroll and persist admin. Error: ' + err.stack ? err.stack : err);
				  cb(1,'Failed to enroll admin');
				});
			}
		}).then(() => {
			cb(null,admin_user)
			//logger.info('Assigned the admin user to the fabric client ::' + admin_user.toString());
		}).catch((err) => {
			cb(2,'Failed to enroll admin: ' + err);
			
		});	
	
}


function verifyUser(userid,cb){
	Fabric_Client.newDefaultKeyValueStore({ path: store_path
	}).then((state_store) => {
		// assign the store to the fabric client
		fabric_client.setStateStore(state_store);
		var crypto_suite = Fabric_Client.newCryptoSuite();
		// use the same location for the state store (where the users' certificate are kept)
		// and the crypto store (where the users' keys are kept)
		var crypto_store = Fabric_Client.newCryptoKeyStore({path: store_path});
		crypto_suite.setCryptoKeyStore(crypto_store);
		fabric_client.setCryptoSuite(crypto_suite);

		// get the enrolled user from persistence, this user will sign all requests
		return fabric_client.getUserContext(userid, true);
	}).then((user_from_store) => {
		if (user_from_store && user_from_store.isEnrolled()) {
			
			cb(user_from_store);
		} else {
			cb(null);
		}
	})
}


function enrollUser(cb){
	verifyUser(cp_general.user,function(obj){
			if(obj != null){
				member_user  = obj;
				logger.info('Successfully loaded ' + cp_general.user +' from persistence');
				cb(null,member_user);
				return;
				}
			if (admin_user && admin_user.isEnrolled()) {
				fabric_ca_client = new Fabric_CA_Client('http://localhost:7054', null , '', crypto_suite);
				fabric_ca_client.register({enrollmentID: cp_general.user, affiliation: cp_general.user_affilation,role: cp_general.user_role}, admin_user).then((secret) => {
					// next we need to enroll the user with CA server
					logger.info('Successfully registered user1 - secret:'+ secret);
					return fabric_ca_client.enroll({enrollmentID: cp_general.user, enrollmentSecret: secret});
				}).then((enrollment) => {
					  console.log('Successfully enrolled member user  ' + cp_general.user );
					  return fabric_client.createUser(
						 {username: cp_general.user,
						 mspid: cp_general.org_msp,
						 cryptoContent: { privateKeyPEM: enrollment.key.toBytes(), signedCertPEM: enrollment.certificate }
						 });
				}).then((user) => {
						member_user = user;
						return fabric_client.setUserContext(member_user);
				}).then(()=>{
						logger.info('User1 was successfully registered and enrolled and is ready to intreact with the fabric network');
						cb(null,member_user);
				}).catch((err) => {
						logger.error('Failed to enroll and persist user. Error: ' + err.stack ? err.stack : err);
						if(err.toString().indexOf('Authorization') > -1) {
							logger.error('Authorization failures may be caused by having admin credentials from a previous CA instance.\n' +
							'Try again after deleting the contents of the store directory '+store_path);
							cb(2,"Authorization Failure");
						}else{
							cb(3,"Failed to register");
							}
					}); 
					
			}		
			else {
				throw cb(1,'Failed to get admin.... enrollAdmin First');
			}
		});
}

function queryTransaction(request,cb){
	channel.queryByChaincode(request).then((query_responses) => {
			logger.debug("Query has completed, checking results");
			// query_responses could have more than one  results if there multiple peers were used as targets
			if (query_responses && query_responses.length >= 1) {
				if (query_responses[0] instanceof Error) {
					cb(2,query_responses[0]);
					logger.error("error from query = ", query_responses[0]);
				} else {
					logger.debug("Response is ", query_responses[0].toString());
					cb(null,JSON.parse(query_responses[0].toString()));
				}
			} else {
				cb(null,null);
				logger.debug("No payloads were returned from query");
			}
		}).catch((err) => {
			cb(1,err);
			logger.error('Failed to query successfully :: ' + err);
		});
	}
	
	
function createTransaction(request,cb){
	tx_id = fabric_client.newTransactionID();
	request.txId = tx_id;
	channel.sendTransactionProposal.then((results) => {
			var proposalResponses = results[0];
			var proposal = results[1];
			let isProposalGood = false;
			if (proposalResponses && proposalResponses[0].response &&
				proposalResponses[0].response.status === 200) {
					isProposalGood = true;
					logger.debug('Transaction proposal was good');
				} else {
					console.error('Transaction proposal was bad');
				}
			if (isProposalGood) {
				logger.debug(util.format(
					'Successfully sent Proposal and received ProposalResponse: Status - %s, message - "%s"',
					proposalResponses[0].response.status, proposalResponses[0].response.message));

				// build up the request for the orderer to have the transaction committed
				var request = {
					proposalResponses: proposalResponses,
					proposal: proposal
				};

				// set the transaction listener and set a timeout of 30 sec
				// if the transaction did not get committed within the timeout period,
				// report a TIMEOUT status
				var transaction_id_string = tx_id.getTransactionID(); //Get the transaction ID string to be used by the event processing
				var promises = [];

				var sendPromise = channel.sendTransaction(request);
				promises.push(sendPromise); //we want the send transaction first, so that we know where to check status

				// get an eventhub once the fabric client has a user assigned. The user
				// is required bacause the event registration must be signed
				let event_hub = fabric_client.newEventHub();
				event_hub.setPeerAddr(cp_general.eventhub_peer_address);

				// using resolve the promise so that result status may be processed
				// under the then clause rather than having the catch clause process
				// the status
				let txPromise = new Promise((resolve, reject) => {
					let handle = setTimeout(() => {
						event_hub.disconnect();
						resolve({event_status : 'TIMEOUT'}); //we could use reject(new Error('Trnasaction did not complete within 30 seconds'));
					}, 3000);
					event_hub.connect();
					event_hub.registerTxEvent(transaction_id_string, (tx, code) => {
						// this is the callback for transaction event status
						// first some clean up of event listener
						clearTimeout(handle);
						event_hub.unregisterTxEvent(transaction_id_string);
						event_hub.disconnect();

						// now let the application know what happened
						var return_status = {event_status : code, tx_id : transaction_id_string};
						if (code !== 'VALID') {
							logger.error('The transaction was invalid, code = ' + code);
							resolve(return_status); // we could use reject(new Error('Problem with the tranaction, event status ::'+code));
						} else {
							loger.debug('The transaction has been committed on peer ' + event_hub._ep._endpoint.addr);
							resolve(return_status);
						}
					}, (err) => {
						//this is the callback if something goes wrong with the event registration or processing
						reject(new Error('There was a problem with the eventhub ::'+err));
					});
				});
				promises.push(txPromise);

				return Promise.all(promises);
			} else {
				logger.error('Failed to send Proposal or receive valid response. Response null or status is not 200. exiting...');
				throw new Error('Failed to send Proposal or receive valid response. Response null or status is not 200. exiting...');
			}
		}).then((results) => {
			console.log('Send transaction promise and event listener promise have completed');
			// check the results in the order the promises were added to the promise all list
			if (results && results[0] && results[0].status === 'SUCCESS') {
				logger.debug('Successfully sent transaction to the orderer.');
			} else {
				cb(1,reponse.status)
				logger.error('Failed to order the transaction. Error code: ' + response.status);
			}

			if(results && results[1] && results[1].event_status === 'VALID') {
				cb(null,results);
				logger.debug('Successfully committed the change to the ledger by the peer');
			} else {
				cb(2,results[1].event_status)
				logger.error('Transaction failed to be committed to the ledger due to ::'+results[1].event_status);
			}
		}).catch((err) => {
			cb(3,err);
			logger.error('Failed to invoke successfully :: ' + err);
		});
}

function channelStats(obj,cb){
	var resp = {
		 "height" : {
			 "low": 100
			 }
		}
		cb(null,resp);
	}

module.exports = {"enrollAdmin":enrollAdmin,"enrollUser":enrollUser,"channel_stats":channelStats,"query_transaction":queryTransaction,"create_transaction":createTransaction}

