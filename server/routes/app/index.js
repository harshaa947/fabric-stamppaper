var router = require('express').Router();
router.use('/api', require('./stamp'));
router.all('/home',function(req,res){
	res.render("home");
})
module.exports = router;
