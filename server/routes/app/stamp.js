var router = require('express').Router();
var multer  = require('multer');  	
var upload  = multer({ storage: multer.memoryStorage() });	
var crypto = require('crypto');
var cpUpload = upload.fields([{ name: 'attach', maxCount: 8 }, { name: 'hash', maxCount: 1 }])	
var fs = require('fs');

function toHex(s) {
    // utf8 to latin1
    var s = unescape(encodeURIComponent(s))
    var h = ''
    for (var i = 0; i < s.length; i++) {
        h += s.charCodeAt(i).toString(16)
    }
    return h
}

function fromHex(h) {
    var s = ''
    for (var i = 0; i < h.length; i+=2) {
        s += String.fromCharCode(parseInt(h.substr(i, 2), 16))
    }
    return decodeURIComponent(escape(s))
}

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
	console.log(stamp);
	obj.attach = stamp.attachments;
	obj.instrument= stamp.instrument;
	obj.state = stamp.state;
	return JSON.stringify(obj, Object.keys(obj).sort());
	}

function signStamp(stamp_str){
	const sign = crypto.createSign('SHA256');
	const privateKey = pri;
	sign.update(stamp_str);
	var signature = sign.sign(privateKey, 'hex');
	var compSign = JSON.stringify({'p':pub,'s': signature});
	return toHex(compSign);
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
		res.send({ state: req.body.state, timestamp: req.body.timestamp, key: req.body.key,instrument:instrument_hash,attachLength:attachs.length,attachments:attachs,price:req.body.price,instype:req.body.stampDutyType });
})

router.all('/sign',function(req,res){
	var stamp = JSON.parse(req.query.act);
	var type = stamp.type;
	stamp.type = undefined;
	var stamp_str = uniqueOrder(stamp);
	var signature = signStamp(stamp_str);
	var sign = {type:type,sign:signature}
	if(stamp.signatures){
		stamp.sign.push(sign);
		}else{
			stamp.signatures = [sign];
			}
	res.send(stamp);
})

module.exports = router;
