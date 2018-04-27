var router = require('express').Router();

	
router.all('/help',function(req,res){
	res.send("Setup is good");
})



module.exports = router;
