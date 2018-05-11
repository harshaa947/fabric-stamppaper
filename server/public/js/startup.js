var instantSetup = false;

// =================================================================================
// On Load
// =================================================================================
$(function () {
	// =================================================================================
	// jQuery UI Events
	// =================================================================================
	$('#startSteps').click(function () {
		showStep1();
	});

	$('#instantSetup').click(function () {
		instantSetup = true;
		$('#instantSetup, #startSteps').prop('disabled', true);
		$('#stepWelcomeWrap .loadingdiv').show();
		$('#stepWelcomeWrap .loadingdiv').hide();
		
	});

	$('#showStartupPanel').click(function () {
		$('#tint').fadeIn();
		$('#startUpPanel').show().addClass('bounceInLeft');
	});

	// ----------------------------- Actions-------------------------------------
	//enroll admin
	$('#enrollAdmin').click(function () {
		var obj = {
			type: 'setup',
			configure: 'enrollment',
			caUrl: $('input[name="caUrl"]').val(),
			enrollId: $('input[name="enrollId"]').val(),
			enrollSecret: $('input[name="enrollSecret"]').val(),
		};
		console.log('[startup] sending enrollment msg', obj);
		ws.send(JSON.stringify(obj));
	});

	//find chaincode again
	$('#findCcButton').click(function () {
		var obj = {
			type: 'setup',
			configure: 'find_chaincode',
			ordererUrl: $('input[name="ordererUrl"]').val(),
			peerUrl: $('input[name="peerUrl"]').val(),
			channelId: $('input[name="channelId"]').val(),
			chaincodeId: $('input[name="chaincodeId"]').val(),
			chaincodeVersion: $('input[name="chaincodeVersion"]').val()
		};
		console.log('[startup] sending find_chaincode msg');
		ws.send(JSON.stringify(obj));
	});

	//register new marble owners
	$('#registerOwners').click(function () {
		build_marble_owners();
		$(this).prev('button').html('Next Step');
	});

	// show loading spinner
	$('.runStep').click(function () {
		var stepid = $(this).attr('stepid');
		$('#' + stepid + ' .loadingdiv').show();
	});

	// ----------------------------- Nav -------------------------------------
	$('.closeStartUp').click(function () {
		//get_everything_or_else();
		closeStartUp();
	});

	// Show JSON settings for the user on this step
	$('.settingsExpand').click(function () {
		let content = $(this).parent().find('.settingsContent');
		if (content.is(':visible')) {
			$(this).find('.fa').addClass('fa-plus-square').removeClass('fa-minus-square');
			content.slideUp();
		} else {
			$(this).find('.fa').removeClass('fa-plus-square').addClass('fa-minus-square');
			content.slideDown();
		}
	});

	// Go to the next step
	$('.nextStep').click(function () {
		var nextStep = $(this).attr('nextstepid');
		showStepPanel(nextStep);
	});

	// Jump to a step
	$('.oneStepWrap').click(function () {
		var stepid = $(this).attr('stepid');
		if (!$(this).hasClass('inactive')) {
			showStepPanel(stepid);
		}
	});

	$('.showMoreDetails').click(function () {
		if ($(this).next('.moreDetails').is(':visible')) {
			$(this).next('.moreDetails').fadeOut();
		} else {
			$(this).next('.moreDetails').fadeIn();
		}
	});
});





function show_start_up_step(obj) {
	var state = obj.state;
	/*state = {
		checklist: { state: 'success', step: 'step1' },
		enrolling: { state: 'success', step: 'step2' },
		find_chaincode: { state: 'failed', step: 'step3' },
		register_owners: { state: 'waiting', step: 'step4' },
	};*/

	// we are not done with startup, show the panel
	if (state.find_chaincode.state !== 'success') {
		$('#tint').fadeIn();
		$('#startUpPanel').show().addClass('bounceInLeft');
	} else {
		get_everything_or_else();
	}

	$('.loadingdiv').hide();				//hide all loading spinners when we get an updated state

	let foundError = false;
	for (let i in state) {
		//console.log('working on state', i, state[i].step, state[i].state);
		let nextStep = 'step' + (Number(state[i].step[4]) + 1);
		if (state[i].state === 'success') {
			$('#' + state[i].step).removeClass('errorStepContent').addClass('success');
			$('.oneStepWrap[stepid="' + state[i].step + '"').removeClass('inactive, errorStepIcon').addClass('successfulStepIcon');
			$('.oneStepWrap[stepid="' + nextStep + '"').removeClass('inactive');
			console.log('removing inactive to step', nextStep, 'by step', state[i].step);
		} else if (state[i].state === 'failed') {
			$('#' + state[i].step).removeClass('success').addClass('errorStepContent');
			$('.oneStepWrap[stepid="' + state[i].step + '"').removeClass('successfulStepIcon, inactive').addClass('errorStepIcon');
			$('.oneStepWrap[stepid="' + nextStep + '"').addClass('inactive');
			console.log('adding inactive tostep', nextStep, 'by step', i);

			if (!foundError) showStepPanel(state[i].step);							//open the first failed step
			foundError = true;
		} else {
			$('#' + state[i].step).removeClass('success, errorStepContent');
			$('.oneStepWrap[stepid="' + state[i].step + '"').removeClass('successfulStepIcon, errorStepIcon');
			$('.oneStepWrap[stepid="' + nextStep + '"').addClass('inactive');
			console.log('adding inactive tostep', nextStep, 'by step', i);
		}
	}

	if (state.find_chaincode.state === 'polling') {				// waiting for chaincode to start or crash
		$('#instantSetup, #startSteps').prop('disabled', true);
		$('#stepWelcomeWrap .loadingdiv, #wait4cc, #dateChecked').show();
		$('#failedSetup').hide();
		setTimeout(function () {
			$('#dateChecked').fadeOut(1000);
		}, 1000);
	} else if (state.find_chaincode.state === 'failed') {
		$('#startSteps').prop('disabled', false);					// we can't do instant
		$('#instantSetup').prop('disabled', true);
		$('#wait4cc, #dateChecked').hide(1000);
		$('#failedSetup').fadeIn(500);
	} else if (state.find_chaincode.state === 'success') {
		$('#instantSetup, #startSteps').prop('disabled', false);
		$('#wait4cc, #dateChecked, #failedSetup').hide(1000);
	}

	

	$('#showStartupPanel, #showSettingsPanel').prop('disabled', false);
}

// hide the start up panel
function closeStartUp() {
	$('#instantSetup, #startSteps').prop('disabled', false);
	$('#stepWelcomeWrap .loadingdiv').hide();
	$('#startUpPanel').removeClass('bounceInLeft').addClass('slideOutLeft');
	setTimeout(function () {
		$('#createPanel, #startUpPanel, #tint').fadeOut();
	}, 300);
	setTimeout(function () {
		$('#startUpPanel').removeClass('slideOutLeft');
	}, 700);
}

// begin the guided step process, show step 1
function showStep1() {
	$('#stepWelcomeWrap').hide();
	$('#stepsWrap, #detailsWrap').fadeIn();
}

// show the step content and hide the current step content
function showStepPanel(openStepId) {
	let onStep = $('.onStep').attr('stepid');

	if (onStep != openStepId) {
		$('.moreDetails').hide();
		$('#' + onStep).slideUp(400);
		console.log('hiding step', onStep, 'showing step', openStepId);
		setTimeout(function () {
			$('#' + openStepId).slideDown(400);
			$('.onStep').removeClass('onStep').find('.stepIcon').removeClass('bounce');
			$('.oneStepWrap[stepid="' + openStepId + '"').addClass('onStep').find('.stepIcon').addClass('bounce');
		}, 450);
	}
}



