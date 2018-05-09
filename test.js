var crypto = require('crypto');
var fs = require('fs');
function readPubKey(){
	if (fs.existsSync("keys/public.pem")) {
    // Do something
    var content=fs.readFileSync("keys/public.pem", "utf8");
    return content;
	}else{
		
		return null;
		}
}

function readPrivKey(){
	if (fs.existsSync("keys/key.pem")) {
    // Do something
    var content=fs.readFileSync("keys/key.pem", "utf8");
    return content;
	}else{
		
		return null;
		}
} 

function generateKey(){
	console.log("generateing");
}

function getKey(){
	var pub = readPubKey();
	var pri = readPrivKey();
	if(pub){
		
		const sign = crypto.createSign('SHA256');
	const privateKey =pri;
	sign.update('some data to sign');
	data = sign.sign(privateKey,"hex")
	console.log(data);
	const verify = crypto.createVerify('SHA256');
	verify.update('some data to sign');
	const publicKey = pub;
	const signature = new Buffer(data,"hex");
console.log(verify.verify(publicKey, signature));
		}else{
			generateKey();
			}	
	}

getKey();
