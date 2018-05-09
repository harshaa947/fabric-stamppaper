var router = require('express').Router();
var multer  = require('multer');  	
var upload  = multer({ storage: multer.memoryStorage() });	
var crypto = require('crypto');
var cpUpload = upload.fields([{ name: 'attach', maxCount: 8 }, { name: 'hash', maxCount: 1 }])	
function readPubKey(){
	if (fs.existsSync(appRoot+"/keys/public.pem")) {
    // Do something
    var content=fs.readFileSync(appRoot+"/keys/public.pem", "utf8");
    return content;
	}else{
		
		return null;
		}
}

function readPrivKey(){
	if (fs.existsSync(appRoot+"/keys/key.pem")) {
    // Do something
    var content=fs.readFileSync(appRoot+"/keys/key.pem", "utf8");
    return content;
	}else{
		
		return null;
		}
}
const pub = readPubKey();
const pri = readPrivKey();

function uniqueOrder(stamp){
	var obj = {};
	obj.attach = stamp.sort();
	obj.instrumnet= stamp.instrument;
	obj.state = stamp.state;
	return JSON.stringify(obj, Object.keys(obj).sort());
	}

function sign(stamp_str){
	const sign = crypto.createSign('SHA256');
	const privateKey = pri;
	sign.update(stamp_str);
	return sign.sign(privateKey, 'hex')
	}
	
function verify(stamp_str,sign_str){
	const verify = crypto.createVerify('SHA256');
	verify.update(stamp_str);
	const publicKey = pub;
	const signature = new Buffer(sign_str,"hex");
	return (verify.verify(publicKey, signature));
	}
router.all('/help',function(req,res){
	res.send("Setup is good");
})

router.all('/create',cpUpload,function(req,res){
	console.log(req.files);
	console.log(req.body);
	var instrument_hash = crypto.createHash('sha512').update(req.files['hash'][0].buffer).digest('hex')
	var attachs = [];
	for(var i in req.files['attach']){
		attachs.push(crypto.createHash('sha512').update(req.files['attach'][i].buffer).digest('hex'))
		}
		res.send({ state: req.body.state, timestamp: req.body.timestamp, key: req.body.key,instrument:instrument_hash,attachLength:attachs.length,attach:attachs });
})

router.all('/sign',function(req,res){
	var stamp = JSON.parse(req.query.act);
	var stamp_str = uniqueOrder(stamp);
	res.send("Setup is good");
})

module.exports = router;
