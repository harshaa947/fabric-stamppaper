/* global bag, $, ws*/
/* global escapeHtml, toTitleCase, formatDate, known_companies, transfer_marble, record_company, show_tx_step, refreshHomePanel, auditingMarble*/
/* exported build_marble, record_company, build_user_panels, build_company_panel, build_notification, populate_users_marbles*/
/* exported build_a_tx,buildstamps */

buildstamps = {};

// =================================================================================
//	UI Building
// =================================================================================
//build a marble
function build_stamp(key,stamp) {
	buildstamps[key] = stamp;

	
	$("#stamps").prepend(html_stamp(key,stamp))
    
}

function html_stamp(key,stamp){
	
	stamp =escape_stamp(key,stamp);
	purifySignatures(stamp.signatures);
	console.log(stamp);
	var html = `
	<div class="stamp"><br><span class="stampid property" id="`
	html+= stamp.id +'">Stamp : </span><span>'+ stamp.id+'</span>'
	html+='<div class="stampduty"><span class="center">'+stamp.price+'</span></div>'
	
	html+= '<div class="state"><br><span class="property">State : </span>'
	html+=stamp.state
	html+=`</div><br><div><span class="property">Type : </span>`
       html+= stamp.instype     
    
    html+=`</div><br>`
    html+= `<div class="instrument"><span class="property"></span><button class="collapsible">Instrument</button>
                        <div class="collapsecontent">
                        <p>`;

	
	html+=stamp.instrument
	html+=`</p></div></div><br>`
    html+=`<div class="attachments">
		<span class="property"></span>
		<ol>`
	for(var i in stamp.attachments){
		html+=`<li><button class="collapsible">Attach</button>
                        <div class="collapsecontent">
                        <p>`+stamp.attachments[i]+"</p></div></li><br>"
		}
			
	html+=	`</ol>
	</div>
	<div class="signatures">
		<span class="property"></span>
		<ol>`
		for(var i in stamp.signatures){
			html+=`<li><button class="collapsible">Sign</button>
                        <div class="collapsecontent">
                        <p><span class='bold'>`+stamp.signatures[i].typestr+" : </span>"+stamp.signatures[i].sign+"</p></div></li><br>"
		}

	html+=`	</ol>
	</div>`
	html+='</div>'
	return html;
	}
	
function escape_stamp(key,stamp){
	stamp.id = escapeHtml(key);
	stamp.instrument = escapeHtml(stamp.instrument);
	for(var i in stamp.attachments){
		stamp.attachments[i] = escapeHtml(stamp.attachments[i]);
		}
	for(var i in stamp.signatures){
		stamp.signatures[i].sign = escapeHtml(stamp.signatures[i].sign);
		}
	stamp.date = escapeHtml(stamp.date);
	stamp.state = escapeHtml(stamp.state);
	return stamp;
	}
	
//crayp resize - dsh to do, dynamic one
function size_user_name(name) {
	var style = '';
	if (name.length >= 10) style = 'font-size: 22px;';
	if (name.length >= 15) style = 'font-size: 18px;';
	if (name.length >= 20) style = 'font-size: 15px;';
	if (name.length >= 25) style = 'font-size: 11px;';
	return style;
}



//build a notification msg, `error` is boolean
function build_notification(error, msg) {
	var html = '';
	var css = '';
	var iconClass = 'fa-check';
	if (error) {
		css = 'warningNotice';
		iconClass = 'fa-minus-circle';
	}

	html += `<div class="notificationWrap ` + css + `">
				<span class="fa ` + iconClass + ` notificationIcon"></span>
				<span class="noticeTime">` + formatDate(Date.now(), `%M/%d %I:%m:%s`) + `&nbsp;&nbsp;</span>
				<span>` + escapeHtml(msg) + `</span>
				<span class="fa fa-close closeNotification"></span>
			</div>`;
	return html;
}

function purifySignatures(signs){
	for(var i in signs){
		var temp = signs[i].type;
		console.log(temp/500);
		if(temp/500 <1){
			signs[i].typestr = "Party"+temp;
			}
		else if(temp/1000 < 1){
			signs[i].typestr = "Witness"+temp%500;
			}
		else {
			signs[i].typestr = "Notary"+temp%1000;
			}
		}
	}
//build a tx history div
function build_a_tx(data, pos,id) {
	console.log(data);
	var html = '';
	var state = data.value.state;
	var instrument = data.value.instrument;
	purifySignatures(data.value.signatures);
	html += `<div class="txDetails">
				<div class="txCount">TX ` + (Number(pos) + 1) + `</div>
				<p>
					<div class="stampLegend">Transaction: </div>
					<div class="stampName txId">` + data.txId.substring(0, 14) + `...</div>
				</p>
				<p>
					<div class="stampLegend">State: </div>
					<div class="stampName">` + state + `</div>
				</p>
				<p>
					<div class="stampLegend">Instrument: </div>
					<div class="stampName">` + instrument.substring(0, 14) + `...</div>
				</p>
				<p>
				<div class ="attachments stampLegend">Attachments:</div>
				<ol>`
			for(var i in data.value.attachments){
				html+="<li class='stampName'>"+data.value.attachments[i].substring(0,14)+"</li>"
				}
			html+=`</ol><div class ="signatures stampLegend">Signatures:</div>
					<ol>`
			for(var i in data.value.signatures){
				html+="<li class='stampName'><span class='bold'>"+data.value.signatures[i].typestr+" : </span>"+data.value.signatures[i].sign.substring(0, 6)+"...</li>"
				}
			html+='</div>';
		
	return html;
}


function build_attach_row(count){
	var html = '<p id="attachRowE'+count+'">Attachment'+count+ ' : <label for="attachRowIN'+count+'" ><i class="fas fa-folder-open"></i></label><input id="attachRowIN'+count+'"class="attachRow inputfile" type="file" name="attach"/><span></span><br/></p>'
	return html;
	}
    
function build_vattach_row(count){
	var html = '<p id="vattachRowE'+count+'">Attachment'+count+ ' : <label for="vattachRowIN'+count+'" ><i class="fas fa-folder-open"></i></label><input id="vattachRowIN'+count+'"class="attachRow inputfile" type="file" name="vattach"/><span></span><br/></p>'
	return html;
	}
	
function build_sign_row(count){
	var html =  'Sign'+count+ ' :'
	html+= '<select class="attachRow" name="signp[' + count+']">'
	html+= `<option value="1">Party1</option> 
			<option value="2">Party2</option>
			<option value="3">Party3</option>
			<option value="4">Party4</option>
			<option value="501">Witness1</option>
			<option value="502">Witness2</option>
			<option value="503">Witness3</option>
			<option value="504">Witness4</option>
			<option value="1001">Notary1</option>
			<option value="1002">Notary2</option>
			<option value="1003">Notary3</option>`
	html+='<input class="attachRow" type="text" name="sign['+count+']"><br/>'
	return html;
	}
	
