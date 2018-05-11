
// =================================================================================
// On Load
// =================================================================================
$(function () {
	// =================================================================================
	// jQuery UI Events
	// =================================================================================
	

	// ----------------------------- Actions-------------------------------------
	
	// show loading spinner
	
	// ----------------------------- Nav -------------------------------------
	$('.closeCreate').click(function () {
		
		closeCreate();
	});

	$("#closeValidate").click(function(){
        validatingStamp = auditingStamp;
          $('#validatePanel, #tint').fadeOut();
        });

	// Go to the next step
	$('.cnextStep').click(function () {
		var nextStep = $(this).attr('nextstepid');
		console.log(nextStep);
		showCStepPanel(nextStep);
	});

	// Jump to a step
	$('.coneStepWrap').click(function () {
		var stepid = $(this).attr('stepid');
		if (!$(this).hasClass('inactive')) {
			showCStepPanel(stepid);
		}
	});

    $('.vnextStep').click(function () {
		var nextStep = $(this).attr('nextstepid');
		console.log(nextStep);
		showVStepPanel(nextStep);
	});

	// Jump to a step
	$('.voneStepWrap').click(function () {
		var stepid = $(this).attr('stepid');
		if (!$(this).hasClass('inactive')) {
			showVStepPanel(stepid);
		}
	});
	
    
    
});







// hide the start up panel
function closeCreate() {
	
	$('#createPanel').hide();
	
}



// show the step content and hide the current step content
function showCStepPanel(openStepId) {
	let onStep = $('.conStep').attr('stepid');
	console.log(onStep);
	if (onStep != openStepId) {
		$('.moreDetails').hide();
		$('#' + onStep).slideUp(400);
		console.log('hiding step', onStep, 'showing step', openStepId);
		setTimeout(function () {
			$('#' + openStepId).slideDown(400);
			//$('#' + openStepId).addClass("success");
			$('.conStep').removeClass('conStep').find('.stepIcon').removeClass('bounce');
			$('.coneStepWrap[stepid="' + openStepId + '"').addClass('conStep').find('.stepIcon').addClass('bounce');
		}, 450);
	}
}

function showVStepPanel(openStepId) {
	let onStep = $('.vonStep').attr('stepid');
	console.log(onStep);
	if (onStep != openStepId) {
		$('.moreDetails').hide();
		$('#' + onStep).slideUp(400);
		console.log('hiding step', onStep, 'showing step', openStepId);
		setTimeout(function () {
			$('#' + openStepId).slideDown(400);
			//$('#' + openStepId).addClass("success");
			$('.vonStep').removeClass('vonStep').find('.stepIcon').removeClass('bounce');
			$('.voneStepWrap[stepid="' + openStepId + '"').addClass('vonStep').find('.stepIcon').addClass('bounce');
		}, 450);
	}
}



