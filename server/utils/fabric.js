
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

module.exports = {"enrollAdmin":enrollAdmin,"enrollUser":enrollUser}

