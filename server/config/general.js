var config = { 
	
	"LOG_LEVEL" : "debug",
	"peer_address":"grpc://localhost:7051",
	"orderer_address":"grpc://localhost:7050",
	"store_path":"hfc-key-store",
	"channel":"mychannel",
	"user" :"user1",
	"port" : 3000,
	"host" : "0.0.0.0"
		
	}
module.exports = config;
