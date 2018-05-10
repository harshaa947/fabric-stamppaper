/* global new_block, $, document, WebSocket, escapeHtml, ws:true, start_up:true, known_companies:true, autoCloseNoticePanel:true */
/* global show_start_up_step, build_notification, build_user_panels, build_company_panel, populate_users_marbles, show_tx_step*/
/* global getRandomInt, block_ui_delay:true, build_a_tx, auditingStamp*/
/* exported transfer_marble, record_company, connect_to_server, refreshHomePanel, pendingTxDrawing*/

var getEverythingWatchdog = null;
var wsTxt = '[ws]';
var pendingTransaction = null;
var pendingTxDrawing = [];

// =================================================================================
// Socket Stuff
// =================================================================================
function connect_to_server() {
	var connected = false;
	connect();

	function connect() {
		var wsUri = null;
		if (document.location.protocol === 'https:') {
			wsTxt = '[wss]';
			wsUri = 'wss://' + document.location.hostname + ':' + document.location.port;
		} else {
			wsUri = 'ws://' + document.location.hostname + ':' + document.location.port;
		}
		console.log(wsTxt + ' Connecting to websocket', wsUri);

		ws = new WebSocket(wsUri);
		ws.onopen = function (evt) { onOpen(evt); };
		ws.onclose = function (evt) { onClose(evt); };
		ws.onmessage = function (evt) { onMessage(evt); };
		ws.onerror = function (evt) { onError(evt); };
	}

	function onOpen(evt) {
		console.log(wsTxt + ' CONNECTED');
		addshow_notification(build_notification(false, 'Connected to Stamp application'), false);
		connected = true;
	}

	function onClose(evt) {
		setTimeout(() => {
			console.log(wsTxt + ' DISCONNECTED', evt);
			connected = false;
			addshow_notification(build_notification(true, 'Lost connection to Stamp application'), true);
			setTimeout(function () { connect(); }, 5000);					//try again one more time, server restarts are quick
		}, 1000);
	}

	function onMessage(msg) {
		try {
			var msgObj = JSON.parse(msg.data);

			if (msgObj.msg === 'everything') {
				console.log(wsTxt + ' rec', msgObj.msg, msgObj);
				clearTimeout(getEverythingWatchdog);
				clearTimeout(pendingTransaction);
				$('#appStartingText').hide();
				clear_trash();
				console.log(msgObj.everything);
				for (var i in msgObj.everything.stamps) {
					build_stamp(msgObj.everything.keys[i],msgObj.everything.stamps[i]);
				}

				start_up = false;
				//$('#appCreate').html('');
			}

			
			
			else if (msgObj.msg === 'app_state') {
				console.log(wsTxt + ' rec', msgObj.msg, msgObj);
				setTimeout(function () {
					show_start_up_step(msgObj);
				}, 1000);
			}
			
			else if (msgObj.msg === 'tx_step') {
				console.log(wsTxt + ' rec', msgObj.msg, msgObj);
				show_tx_step(msgObj);
			}
			
			else if (msgObj.msg === 'block') {
				console.log(wsTxt + ' rec', msgObj.msg, ': ledger blockheight', msgObj.block_height);
				if (msgObj.block_delay) block_ui_delay = msgObj.block_delay * 2;				// should be longer than block delay
				new_block(msgObj.block_height);													// send to blockchain.js

				if ($('#auditContentWrap').is(':visible')) {
					var obj = {
						type: 'audit',
						stamp_id: auditingStamp.id
					};
					ws.send(JSON.stringify(obj));
				}
			}

			//transaction error
			else if (msgObj.msg === 'tx_error') {
				console.log(wsTxt + ' rec', msgObj.msg, msgObj);
				if (msgObj.e) {
					var err_msg = (msgObj.e.parsed) ? msgObj.e.parsed : msgObj.e;
					addshow_notification(build_notification(true, escapeHtml(err_msg)), true);
					$('#txStoryErrorTxt').html(err_msg);
					$('#txStoryErrorWrap').show();
				}
			}
			
			//tx history
			else if (msgObj.msg === 'history') {
				console.log(wsTxt + ' rec', msgObj.msg, msgObj);
				var built = 0;
				var x = 0;
				var count = $('.txDetails').length;

				for (x in pendingTxDrawing) clearTimeout(pendingTxDrawing[x]);

				if (count <= 0) {									//if no tx shown yet, append to back
					$('.txHistoryWrap').html('');					//clear
					for (x = msgObj.data.parsed.length - 1; x >= 0; x--) {
						built++;
						slowBuildtx(msgObj.data.parsed[x], x, built);
					}

				} else {											//if we already showing tx, prepend to front
					console.log('skipping tx', count);
					for (x = msgObj.data.parsed.length - 1; x >= count; x--) {
						var html = build_a_tx(msgObj.data.parsed[x], x,msgObj.data.key);
						$('.txHistoryWrap').prepend(html);
						$('.txDetails:first').animate({ opacity: 1, left: 0 }, 600, function () {
							//after animate
						});
					}
				}
			}
            
            else if (msgObj.msg === 'queryStamp') {
				console.log(wsTxt + ' rec', msgObj.msg, msgObj);
				var built = 0;
				var x = 0;
                build_stamp(msgObj.data.key,msgObj.data.parsed);
            }
            
            
            else if (msgObj.msg === 'res_create') {
				addshow_notification(build_notification(false, 'New Stamp Created '+msgObj.key), true);
            }
			

			//unknown
			else console.log(wsTxt + ' rec', msgObj.msg, msgObj);
		}
		catch (e) {
			console.log(wsTxt + ' error handling a ws message', e);
		}
	}

	function onError(evt) {
		console.log(wsTxt + ' ERROR ', evt);
	}
}


// =================================================================================
// Helper Fun
// ================================================================================


//add notification to the panel, show panel now if you want with 2nd param
function addshow_notification(html, expandPanelNow) {
	$('#emptyNotifications').hide();
	$('#noticeScrollWrap').prepend(html);

	var i = 0;
	$('.notificationWrap').each(function () {
		i++;
		if (i > 10) $(this).remove();
	});

	if (expandPanelNow === true) {
		openNoticePanel();
		clearTimeout(autoCloseNoticePanel);
		autoCloseNoticePanel = setTimeout(function () {		//auto close, xx seconds from now
			closeNoticePanel();
		}, 10000);
	}
}

//open the notice panel
function openNoticePanel() {
	$('#noticeScrollWrap').slideDown();
	$('#notificationHandle').children().removeClass('fa-angle-down').addClass('fa-angle-up');
}

//close the notice panel
function closeNoticePanel() {
	$('#noticeScrollWrap').slideUp();
	$('#notificationHandle').children().removeClass('fa-angle-up').addClass('fa-angle-down');
	clearTimeout(autoCloseNoticePanel);
}


//emtpy trash marble wrap
function clear_trash() {
	$('#trashbin .ball').fadeOut();
	setTimeout(function () {
		$('#trashbin .ball').remove();
	}, 500);
}

// delay build each transaction
function slowBuildtx(data, txNumber, built) {
	pendingTxDrawing.push(setTimeout(function () {
		var html = build_a_tx(data, txNumber);
		$('.txHistoryWrap').append(html);
		$('.txDetails:last').animate({ opacity: 1, left: 0 }, 600, function () {
			//after animate
		});
	}, (built * 150)));
}
function refreshHomePanel() {
	clearTimeout(pendingTransaction);
	pendingTransaction = setTimeout(function () {								//need to wait a bit
		get_everything_or_else();
	}, block_ui_delay);
}

//get everything with timeout to get it all again!
function get_everything_or_else(attempt) {
	console.log(wsTxt + ' sending get everything msg');
	clearTimeout(getEverythingWatchdog);
	ws.send(JSON.stringify({ type: 'read_everything', v: 1 }));

	if (!attempt) attempt = 1;
	else attempt++;

	getEverythingWatchdog = setTimeout(function () {
		if (attempt <= 3) {
			console.log('\n\n! [timeout] did not get stamps in time, impatiently calling it again', attempt, '\n\n');
			get_everything_or_else(attempt);
		}
		else {
			console.log('\n\n! [timeout] did not get stamp in time, hopeless', attempt, '\n\n');
		}
	}, 5000 + getRandomInt(0, 10000));
}


