var config = { 
	
	"LOG_LEVEL" : "debug",
	"peer_address":"grpc://localhost:7051",
	"orderer_address":"grpc://localhost:7050",
	"ca_address":'http://localhost:7054',
	"eventhub_peer_address": 'grpc://localhost:7053',
	"ca_domain":'ca.example.com',
	"store_path":"hfc-key-store",
	"channel":"mychannel",
	"user" :"user123",
	"admin":"admin",
	"org_msp":"Org1MSP",
	"user_affilation":"org1.department1",
	"blockDelay":1000,
	"port" : 4000,
	"host" : "0.0.0.0",
	"user_role":"client",
	"chaincodeId":"fabstamp"	
	}
module.exports = config;
