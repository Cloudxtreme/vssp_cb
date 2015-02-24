var showAllOptionsInSettingsUI = false;

showBoardSettings = function() {
	if('admin_id' in dataStore) {
		var conn = new modules.BoardConnectionHandler;
		conn.sendPostData('/board/getBoardStatus', '&auth_id=' +dataStore['auth_id'], 'UserSettingsUIBoardStatusSignalNew');	
		return;
	} else {
		try {
			throw new Error('Enable Admin Session to View Settings');
		} catch(err) {
			handleException(err, true, 'Error');
		}
	}
}


dojo.subscribe('UserSettingsUIBoardStatusSignalNew', function(e) {
	console.log('UserSettingsUIBoardStatusSignalNew response has come. Value:' + dojo.toJson(e, true));
	var r = e.result;
	var cameras = r["cameras"];
	var isVideoRecordInProgress = false;
	cameras.forEach(function(camera) {
		//console.log('The result is:' + dojo.toJson(camera, true));
		
		var node_id = camera.node_id;
		var record_status = camera["video_recording_inprogress"];
		if(record_status) {
			isVideoRecordInProgress = true;
		}
	});	
	showAllOptionsInSettingsUI = (! isVideoRecordInProgress);
	//If video record inprogress; dont allow the user settings update
	showBoardSettingsUINew();
});


showBoardSettingsUINew = function() {
	console.log('Enable All Options:' + showAllOptionsInSettingsUI);
	
	var conn = new modules.BoardConnectionHandler;
	var data = 'auth_id=' + dataStore['auth_id'];
	conn.sendGetData('/board/getUserSettingsData', data, 'GetUserSettingsDataSignal');		
}

dojo.subscribe('GetUserSettingsDataSignal', function(e) {
	console.log('GetUserSettingsDataSignal response has come. Value:' + dojo.toJson(e, true));
	if(! e.result) {
		showErrorStatus('Failed to get the user settings for update');
		return;
	}
	var data = '<form name="usersettings_update" id="usersettings_update">';
	//data += '<table class="usersettings">';
	var user_settings = e.result['settings'];
	var current_settings_data = e.result['current_values'];
	var keys = Object.keys(user_settings);
	keys.forEach(function(key) {
		data += getUserSettingsDataForKey(user_settings[key], current_settings_data[key]);
	});
	data += '<div class="row">';
	data += '<div class="col-xs-12"><label><span id="userSettingsError" class="label label-danger"></span></label></div>';
	//data += '<tr>';
	//data += '<td><label><span id="userSettingsError" class="label label-danger"></span></label></td>';
	//data += '</tr>';
	data += '</form>';
	dojo.addClass('selectedCameraDetailsDisplay', 'dont-show'); 
	dojo.removeClass('settings_dialog_container', 'dont-show');
	dojo.byId('user_settings_body').innerHTML = data;

	if(! showAllOptionsInSettingsUI) {
		dojo.addClass('settings_update_btn', 'disabled');
		dojo.byId('userSettingsError').innerHTML = 'Cannot update the Settings when video recording is in-progress';
	} else {
		dojo.removeClass('settings_update_btn', 'disabled');
		dojo.byId('userSettingsError').innerHTML = '';
	}
	/*
	var selectElements = dojo.query('.selectpicker');
	selectElements.forEach(function(element) {
		element.selectpicker('render');
	});
	*/
	$('.selectpicker').selectpicker('render');
});

getUserSettingsDataForKey = function(user_settings_data, default_value) {

	var data = '<div class="row">'; //'<tr>'; 
	data += '<div class="col-xs-6"><label>' + user_settings_data['display'] + '</label></div>';
	//data += '<td class="key">' + user_settings_data['display'] + '</td>';
	data += getUserSettingOptionBasedOnType(user_settings_data, default_value);
	data += '</div>';
	
	var type = user_settings_data['type'];
	if(type == 'Option') {
		data += '<div class="row"><div class="col-xs-12">&nbsp;</div></div>';
	}
	//data += '</tr>';
	return data;
}

getUserSettingOptionBasedOnType = function(user_settings_data, default_value) {
	var data = '<div class="col-xs-6">';
	//var data = '<td class="value">';
	
	var type = user_settings_data['type'];
	if(type == 'numeric') {
		//data += '<div class="stepper"><input type="number" class="form-control stepper-input" name="' + user_settings_data['key'] + '" value="' + default_value + '"><span class="stepper-arrow up">Up</span><span class="stepper-arrow down">Down</span></div>';
		
		//data += '<div class="input-group number-spinner">';
		//data += '<span class="input-group-btn data-dwn">';
		//data += '<button class="btn btn-default btn-info" data-dir="dwn"><span class="glyphicon glyphicon-minus"></span></button>';
		//data += '</span>'
		
		data += '<input type="text" class="form-control text-center" value="' + default_value + '"  name="' +  user_settings_data['key'] + '" id="numeric_' + user_settings_data['key'] + '">';
		//data += '<span class="input-group-btn data-up">';
		//data += '<button class="btn btn-default btn-info" data-dir="up"><span class="glyphicon glyphicon-plus"></span></button>';
		//data += '</span>';
		//data += '</div>';
	} else if(type == 'textarea') {
		data += '<textarea class="form-control" cols="25" rows="3" name="' + user_settings_data['key'] + '" id="text_' + user_settings_data['key'] + '">' + default_value + '</textarea>';
	} else if(type == 'Option') {
		var values = user_settings_data['values'];
		data += '<select name="' + user_settings_data['key'] + '" class="selectpicker" data-style="btn-primary" data-size="5" data-width="100%" id="select_' + user_settings_data['key'] + '" >';
		values.forEach(function(value) {
			data += '<option>' + value + '</option>';
		});
		data += '</select>';
	} else if(type == 'Check') {
		if(default_value == 1) {
			//data += '<div class="col-md-4"><label class="toggle"><input type="checkbox" checked name="' + user_settings_data['key'] + '"> <span class="handle"></span></label></div>';
			data += '<div class="btn-group" data-toggle="buttons"><label class="btn btn-primary active"><input type="checkbox" checked autocomplete="off" name="' + user_settings_data['key'] + '"><span class="glyphicon glyphicon-ok"></span></label></div>';
		} else {
			//data += '<div class="col-md-4"><label class="toggle"><input type="checkbox" name="' + user_settings_data['key'] + '"> <span class="handle"></span></label></div>';
			data += '<div class="btn-group" data-toggle="buttons"><label class="btn btn-primary"><input type="checkbox" autocomplete="off" name="' + user_settings_data['key'] + '"><span class="glyphicon glyphicon-ok"></span></label></div>';
		}
	}
	
	data += '</div>';
	//data += '</td>';
	return data;
}

closeSettingsEditorDialog = function() {
	dojo.removeClass('selectedCameraDetailsDisplay', 'dont-show'); 
	dojo.addClass('settings_dialog_container', 'dont-show');
}

updateSettings = function() {
	var formElements = document.getElementById("usersettings_update").elements;
	var data = '';
	var isAnyParamterInvalid = false;
	dojo.byId('userSettingsError').innerHTML = "";
	for(var index = 0; index < document.getElementById('usersettings_update').elements.length; index++) {
		var element = document.getElementById('usersettings_update').elements.item(index);
		if(element.type == 'checkbox') {
			data += element.name + '=' + element.checked + '&';
		} else {
			if(dojo.string.trim(element.name).length > 0) {
				var id = element.getAttribute('id');
				console.log('Id for element:' + element.name + ' is:' + id);
				if(startsWith(id, 'numeric_')) {
					console.log('Parsing the value:' + element.value + ' for id:' + id);
					
					if(isNaN(element.value)) {
						console.log('Invalid value is observed');
						isAnyParamterInvalid = true;
						element.focus();
						dojo.byId('userSettingsError').innerHTML = "Only numeric values are allowed";
						break;
					}
				}
				data += element.name + '=' + element.value + '&';
			}
		}
	}
	
	if(isAnyParamterInvalid) {
		return;
	}
	var conn = new modules.BoardConnectionHandler;
	var url = '/board/updateUserSettings';
	data = 'auth_id=' + dataStore['auth_id'] + '&' + data;
	conn.sendPostData(url, data, 'UserSettingsUpdateSignalNew');
}

dojo.subscribe('UserSettingsUpdateSignalNew', function(e) {
	console.log('UserSettingsUpdateSignalNew response has come. Value:' + dojo.toJson(e, true));
	
	var userSettingsDlg = dijit.byId('settingsDialog');
	try {
	
		if(e.status === 'SUCCESS') {
			showSuccessStatus('User settings has been updated');
			closeSettingsEditorDialog();

		} else {
			dojo.byId('userSettingsError').innerHTML = e.error_info;
		}
	} catch(err) {
		dojo.byId('userSettingsError').innerHTML = err.message;
	}	
});


