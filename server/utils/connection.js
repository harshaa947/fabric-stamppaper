var Fabric_Client = require('fabric-client');
var path = require('path');
var util = require('util');
var os = require('os');
var cp_general = require(appRoot+'/config/general');
var logger = require(appRoot + '/utils/log')


var fabric_client = new Fabric_Client();

// setup the fabric network
var channel = fabric_client.newChannel(cp_general.channel);
var peer = fabric_client.newPeer(cp_general.peer_address);
channel.addPeer(peer);
var order = fabric_client.newOrderer(cp_general.orderer_address)
channel.addOrderer(order);


var member_user = null;
var store_path = path.join(appRoot, cp_general.store_path);
logger.info('Store path:'+store_path);
var tx_id = null;

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
	return fabric_client.getUserContext(cp_general.user, true);
})
