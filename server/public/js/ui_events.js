/* global $, window, document */
/* global toTitleCase, connect_to_server, refreshHomePanel, closeNoticePanel, openNoticePanel, show_tx_step, marbles*/
/* global pendingTxDrawing:true */
/* exported record_company, autoCloseNoticePanel, start_up, block_ui_delay*/
var ws = {};
var bgcolors = ['whitebg', 'blackbg', 'redbg', 'greenbg', 'bluebg', 'purplebg', 'pinkbg', 'orangebg', 'yellowbg'];
var autoCloseNoticePanel = null;
var known_companies = {};
var start_up = true;
var lsKey = 'marbles';
var fromLS = {};
var block_ui_delay = 15000; 								//default, gets set in ws block msg
var auditingStamp = null;
var rowAttachCount = 0;
var rowSignCount = 0;
var createdStamp =  null;
// =================================================================================
// On Load
// =================================================================================
$(function(){
	console.log("i am called");
	fromLS = window.localStorage.getItem(lsKey);
	if (fromLS) fromLS = JSON.parse(fromLS);
	else fromLS = { story_mode: false };					//dsh todo remove this
	console.log('from local storage', fromLS);

	connect_to_server();
	
	$('#createStampButton').click(function (event) {
		/*console.log('creating stamp');
		var hash_file = $('input[name="hash"]')[0].files[0]
		calculatesha256(hash_file,function(err,resp){
		var attachs = []
		for(var i=0;i<rowAttachCount;i++){
			var temp = $('input[name="attach['+i+']"]').val()
			attachs.push(temp)
			}
		var signs = []
		for(var i=0;i<rowSignCount;i++){
			var temp = $('input[name="sign['+i+']"]').val()
			var temp1 = $('select[name="signp['+i+']"]').val()
			signs.push({'sign':temp,'id':temp1})
			}
		var obj = {
			type: 'create',
			state: $('select[name="state"]').val(),
			timestamp: $('input[name="timestamp"]').val(),
			hash: resp,
			key: $('input[name="key"]').val(),
			v: 1,
			attachLength:rowAttachCount,
			signLength:rowSignCount,
			attach : attachs,
			sign:signs
			
		};
		console.log('creating stamp, sending', obj);
		$('#createPanel').fadeOut();
		$('#tint').fadeOut();

		show_tx_step({ state: 'building_proposal' }, function () {
			ws.send(JSON.stringify(obj));

			refreshHomePanel();
			
		});});*/
		
		 event.preventDefault();

        // Get form
        var form = $('#createform')[0];

		// Create an FormData object 
        var data = new FormData(form);
      
		console.log('removing inactive to step', 1, 'by step');
		
        //$("#createStampButton").prop("disabled", true);

        $.ajax({
            type: "POST",
            enctype: 'multipart/form-data',
            url: "/app/api/create",
            data: data,
            processData: false,
            contentType: false,
            cache: false,
            timeout: 600000,
            success: function (data) {
				console.log('creating stamp, sending');
							
				console.log(data);
				createdStamp = data;
				$("#cStampdetail").html(html_stamp(data.key,data));
				$("#createStepOne .cnextStep")[0].click();
				$("#createStepOne").addClass("success");
            },
            error: function (e) {

              console.log(e);

            }
        });

    

		return false;
	});


    $('#searchStamps').keyup(function (e) {
		if(e.keyCode != 13){
                return;
            }
		var input = $(this).val();
		

		//reset - clear search
		if (input === '') {
			
		}
		else {
			var parts = input.split(',');
			console.log('searching on', parts);

			//figure out if the user matches the search
			for(var i in parts){
                var part = parts[i];
                console.log(buildstamps);
                if(buildstamps[part]){
                    continue;
                    }
                else{
                    var obj = {
			type: 'getStamp',
			stamp_id:part			
            };
                    ws.send(JSON.stringify(obj));
                    }
                }

			
			
		}
		
	});
    
	$('#signTransaction').click(function(){
        var temp = JSON.parse(JSON.stringify(createdStamp));
        temp.type = 0;
		$.ajax({
            type: "GET",
            url: "/app/api/sign",
            contentType: 'application/json',
            data: {"act":JSON.stringify(temp)},
            cache: false,
            timeout: 600000,
            success: function (data) {
				console.log('creating stamp, sending');
				createdStamp = data;
				$("#cStampdetail").html(html_stamp(data.key,data));
				$("#createStepOne .cnextStep")[0].click();
				$("#createStepTwo").addClass("success");
            },
            error: function (e) {

              console.log(e);

            }
        });
		});
	$('#downTransaction').click(function(){
		Download(createdStamp,"stamp.json");
		});
	$('#submitTransaction').click(function(){
		$('#createPanel').fadeOut();
		$('#tint').fadeOut();
		var signs = [];
		var signLength = 0;
		if(createdStamp.signatures){
			signLength = createdStamp.signatures.length;
			signs = createdStamp.signatures;
			}
		var obj = {
			type: 'create',
			state: createdStamp.state,
			timestamp: createdStamp.timestamp,
			hash: createdStamp.instrument,
			//key: createdStamp.key,
			v: 1,
			attachLength:createdStamp.attachLength,
			signLength:signLength,
			attach : createdStamp.attachments,
			sign:signs	,
            price:createdStamp.price,
            instype:createdStamp.instype		
		};
		show_tx_step({ state: 'building_proposal' }, function () {
			ws.send(JSON.stringify(obj));

			//refreshHomePanel();
			
		});
	});
	//login events
	$('#whoAmI').click(function () {													//drop down for login
		if ($('#userSelect').is(':visible')) {
			$('#userSelect').fadeOut();
			$('#carrot').removeClass('fa-angle-up').addClass('fa-angle-down');
		}
		else {
			$('#userSelect').fadeIn();
			$('#carrot').removeClass('fa-angle-down').addClass('fa-angle-up');
		}
	});

	//open create Stamp panel
	$(document).on('click', '.addStamp', function () {
		$('#tint').fadeIn();
		$('#createPanel').fadeIn();
		$('#createstepsWrap, #createdetailsWrap').fadeIn();
	});
    
    $('#stamps').on('click','.collapsible',function(){
        
       this.classList.toggle("active");
        var content = this.nextElementSibling;
        if (content.style.display === "block") {
        content.style.display = "none";
        } else {
        content.style.display = "block";
        } 
        
    });
    
    $('#cStampdetail').on('click','.collapsible',function(){
        
       this.classList.toggle("active");
        var content = this.nextElementSibling;
        if (content.style.display === "block") {
        content.style.display = "none";
        } else {
        content.style.display = "block";
        } 
        
    });
    
    $("#stampfile").change(function(){
       var stampfile =  $('input[name="stampfile"]')[0].files[0]
        readJson(stampfile,function(e,res){
            if(e){
                console.log(e);
                }else{
                  createdStamp = res;
                  $("#cStampdetail").html(html_stamp("key_name",createdStamp));
                  $("#createStepOne .cnextStep")[0].click();
				  $("#createStepOne").addClass("success");    
                }
            });
    });
    
    $('.collapsible').click(function(){
        
       this.classList.toggle("active");
        var content = this.nextElementSibling;
        if (content.style.display === "block") {
        content.style.display = "none";
        } else {
        content.style.display = "block";
        } 
        
    });
    
     $('#createform').on('change','.inputfile',function(){
        
        var content = this.nextElementSibling;
        content.innerHTML=this.value;
        
    });
    
    $('.inputfile').change(function(){
         var content = this.nextElementSibling;
        content.innerHTML=this.value;
       
    });
    
	//close create marble panel
	$('#tint').click(function () {
		if ($('#startUpPanel').is(':visible')) return;
		if ($('#txStoryPanel').is(':visible')) return;
		$('#createPanel, #tint, #settingsPanel').fadeOut();
	});

	//notification drawer
	$('#notificationHandle').click(function () {
		if ($('#noticeScrollWrap').is(':visible')) {
			closeNoticePanel();
		}
		else {
			openNoticePanel();
		}
	});

	//hide a notification
	$(document).on('click', '.closeNotification', function () {
		$(this).parents('.notificationWrap').fadeOut();
	});

	//settings panel
	$('#showSettingsPanel').click(function () {
		$('#settingsPanel, #tint').fadeIn();
	});
	$('#closeSettings').click(function () {
		$('#settingsPanel, #tint').fadeOut();
	});

	//story mode selection
	$('#disableStoryMode').click(function () {
		set_story_mode('off');
	});
	$('#enableStoryMode').click(function () {
		set_story_mode('on');
	});

	//close create panel
	$('#closeCreate').click(function () {
		$('#createPanel, #tint').fadeOut();
	});
	
	//Add row in attachments
	$('#addAttachRow').click(function () {
		var html = build_attach_row(rowAttachCount)
		rowAttachCount+=1;
		$("#attachLegend").append(html);
	});
	$('#deleteAttachRow').click(function () {
		
		rowAttachCount-=1;
		$("#attachRowE"+rowAttachCount).remove();
	});
	//Add row in signatures
	$('#addSignRow').click(function () {
		var html = build_sign_row(rowSignCount)
		rowSignCount+=1;
		$("#signLegend").append(html);
	});

	//change size of marble
	$('select[name="size"]').click(function () {
		var size = $(this).val();
		if (size === '16') $('.createStamp').animate({ 'height': 150, 'width': 150 }, { duration: 200 });
		else $('.createStamp').animate({ 'height': 250, 'width': 250 }, { duration: 200 });
	});

	//right click opens audit on marble
	$(document).on('contextmenu', '.stampid', function () {
		auditStamp(this, true);
		return false;
	});

	//left click audits marble
	$(document).on('click', '.stampid', function () {
		auditStamp(this, false);
	});
	
	//left click audits marble
	
	function auditStamp(that, open) {
		var stamp_id = $(that).attr('id');
		$('.auditingStamp').removeClass('auditingStamp');
		if (!auditingStamp || stamps[stamp_id].id != auditingStamp.id) {//different marble than before!
			for (var x in pendingTxDrawing) clearTimeout(pendingTxDrawing[x]);
			$('.txHistoryWrap').html('');										//clear
		}

		auditingStamp = stamps[stamp_id];
		console.log('\nuser clicked on stamp', stamp_id);

		if (open || $('#auditContentWrap').is(':visible')) {
			
			$(that).addClass('auditingStamp');
			$('#auditContentWrap').fadeIn();
			$('#StampId').html(stamp_id);
			

			$('#rightEverything').addClass('rightEverythingOpened');
			$('#leftEverything').fadeIn();
            $('#marbleId').html(stamp_id);
			var obj2 = {
				type: 'audit',
				stamp_id: stamp_id
			};
			ws.send(JSON.stringify(obj2));
}

	}
	
	$('#auditClose').click(function () {
		$('#auditContentWrap').slideUp(500);
		$('.auditingStamp').removeClass('auditingStamp');												//reset
		for (var x in pendingTxDrawing) clearTimeout(pendingTxDrawing[x]);
		setTimeout(function () {
			$('.txHistoryWrap').html('<div class="auditHint">Click a Stamp to Audit Its Transactions</div>');//clear
		}, 750);
		$('#marbleId').html('-');
		auditingMarble = null;

		setTimeout(function () {
			$('#rightEverything').removeClass('rightEverythingOpened');
		}, 500);
		$('#leftEverything').fadeOut();
	});

	$('#auditButton').click(function () {
		$('#auditContentWrap').fadeIn();
		$('#rightEverything').addClass('rightEverythingOpened');
		$('#leftEverything').fadeIn();
	});

	
});

//toggle story mode
function set_story_mode(setting) {
	if (setting === 'on') {
		fromLS.story_mode = true;
		$('#enableStoryMode').prop('disabled', true);
		$('#disableStoryMode').prop('disabled', false);
		$('#storyStatus').addClass('storyOn').html('on');
		window.localStorage.setItem(lsKey, JSON.stringify(fromLS));		//save
	}
	else {
		fromLS.story_mode = false;
		$('#disableStoryMode').prop('disabled', true);
		$('#enableStoryMode').prop('disabled', false);
		$('#storyStatus').removeClass('storyOn').html('off');
		window.localStorage.setItem(lsKey, JSON.stringify(fromLS));		//save
	}
}
