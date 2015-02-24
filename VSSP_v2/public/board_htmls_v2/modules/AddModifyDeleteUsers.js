var usersList = [];
showAddUserDialogNew = function() {	
	dojo.addClass('selectedCameraDetailsDisplay', 'dont-show'); 
	dojo.removeClass('addUser_container', 'dont-show');
}

hideAddUserDlgNew = function() {
	dojo.removeClass('selectedCameraDetailsDisplay', 'dont-show'); 
	dojo.addClass('addUser_container', 'dont-show');
}

addUserNew = function() {
	dojo.byId('add_user_error_new').innerHTML = '';
	
	var userName = dojo.byId('user_name_new').value;
	userName = dojo.string.trim(userName);
	if(userName.length <= 0) {
		document.getElementById('user_name_new').focus();
		dojo.byId('add_user_error_new').innerHTML = 'Username cannot be empty';
		return;
	}
	
	var pwd = dojo.byId('password_new').value;
	pwd = dojo.string.trim(pwd);
	if(pwd.length <= 0) {
		document.getElementById('password_new').focus();
		dojo.byId('add_user_error_new').innerHTML = 'Password cannot be empty';
		return;
	}
	
	var cpwd = dojo.byId('confirm_password_new').value;
	cpwd = dojo.string.trim(cpwd);
	if(cpwd.length <= 0) {
		document.getElementById('confirm_password_new').focus();
		dojo.byId('add_user_error_new').innerHTML = 'Confirm Password cannot be empty';
		return;
	}

	var email = dojo.byId('email_new').value;
	email = dojo.string.trim(email);
	if(email.length <= 0) {
		document.getElementById('email_new').focus();
		dojo.byId('add_user_error_new').innerHTML = 'Email cannot be empty';
		return;
	}

	var isAdmin = dojo.byId('isadmin_new').checked;
	console.log('User:' + userName + ',pwd:' + pwd + ',cpwd:' + cpwd + ',Email:' + email + ',isAdmin:' + isAdmin);
	
	if(pwd != cpwd) {
		document.getElementById('confirm_password_new').focus();
		dojo.byId('add_user_error_new').innerHTML = 'Password and Confirm Password are not matching';
		return;
	}
	
	var type='user';
	if(isAdmin) {
		type='admin';
	}
	var conn = new modules.BoardConnectionHandler;
	conn.sendPostData('/board/createUser', '&auth_id=' +dataStore['auth_id'] + '&username=' + userName + '&password=' + pwd + '&email=' + email + '&type=' + type, 'AddNewUserSignal')
}

dojo.subscribe('AddNewUserSignal', function(e) {
	console.log('AddNewUserSignal response has come. Value:' + dojo.toJson(e, true));
	dojo.addClass('selectedCameraDetailsDisplay', 'dont-show'); 
	
	try {
		if(e.status === 'SUCCESS') {
			hideAddUserDlgNew();
			showSuccessStatus('Successfully created the user');
		} else {
			dojo.byId('add_user_error_new').innerHTML = e.error_info;
		}
	} catch(err) {
		dojo.byId('add_user_error_new').innerHTML = err.message;
	}	
});

listUsersForUserModify = function() {
	usersList = [];
	var conn = new modules.BoardConnectionHandler;
	conn.sendPostData('/board/listUsers', '&auth_id=' +dataStore['auth_id'], 'UsersListSignalForUserModification')
}

dojo.subscribe('UsersListSignalForUserModification', function(e) {
	console.log('UsersListSignalForUserModification response has come. Value:' + dojo.toJson(e, true));
	dojo.addClass('selectedCameraDetailsDisplay', 'dont-show'); 
	
	try {
		if(e.status === 'SUCCESS') {
			e.result.forEach(function(user) {
				usersList.push(user);
			});
			showListOfUsersForModificationDlg();
		} else {
			showErrorMessage(e.error_info);
		}
	} catch(err) {
		showErrorMessage(e.error_info);
	}	
});

hideModifyUserDlgNew = function() {
	dojo.removeClass('selectedCameraDetailsDisplay', 'dont-show'); 
	dojo.addClass('modifyUser_container', 'dont-show');
}

showModifyUserDlgNew = function() {
	dojo.addClass('selectedCameraDetailsDisplay', 'dont-show'); 
	dojo.removeClass('modifyUser_container', 'dont-show');
}


showListOfUsersForModificationDlg = function() {
	console.log('List of users:' + dojo.toJson(usersList));
	var data = '';
	usersList.forEach(function(user) {
		if(user['admin']) {
			data += '<option value="' + user['id'] + '">' + user['username']  +  ' [ Admin ]'  + '</option>'; 
		} else {
			data += '<option value="' + user['id'] + '">' + user['username'] + '</option>'; 
		}
	});
	console.log('Data:' + data);
	dojo.byId('users_list_for_modification').innerHTML = data;
	$('.selectpicker').selectpicker('refresh');
	$('.selectpicker').selectpicker('render');
	
	loadSelectedUserDetails(document.getElementById('users_list_for_modification'));
	showModifyUserDlgNew();
}

loadSelectedUserDetails = function(select) {
	dojo.byId('modify_user_error_new').innerHTML = '';
	var selectedUser = select.options[select.selectedIndex].innerHTML;
	var isAdmin = false;
	if(selectedUser.indexOf('[ Admin ]') != -1) {
		isAdmin = true;
		selectedUser = selectedUser.replace('[ Admin ]', '');
		selectedUser = dojo.string.trim(selectedUser);
	}
	console.log('Is Admin:' + isAdmin);
	var selectedUserDetails = null;
	for(var i = 0; i < usersList.length; i++) {
		var user = usersList[i];
		if(user['username'] === selectedUser && user['admin'] == isAdmin) {
			selectedUserDetails = user;
			break;
		}
	}
	if(selectedUserDetails == null) {
		dojo.byId('modify_user_error_new').innerHTML = 'Failed to load the selected user details';
		return;
	}
	
	dojo.byId('modify_confirm_password_new').value = '';
	dojo.byId('modify_password_new').value = '';
	dojo.byId('modify_email_new').value = selectedUserDetails['email'];
	dojo.byId('modify_isadmin_new').checked = isAdmin;
	if(isAdmin) {
		dojo.addClass('modify_isadmin_selection', 'active');
	} else {
		dojo.removeClass('modify_isadmin_selection', 'active');
	}
}

modifyUserNew = function() {
	var select = document.getElementById('users_list_for_modification');
	var selectedUser = select.options[select.selectedIndex].innerHTML;
	var isAdmin = false;
	if(selectedUser.indexOf('[ Admin ]') != -1) {
		selectedUser = selectedUser.replace('[ Admin ]', '');
		selectedUser = dojo.string.trim(selectedUser);
		isAdmin = true;
	}
	var pwd = dojo.byId('modify_password_new').value;
	pwd = dojo.string.trim(pwd);
	var cpwd = dojo.byId('modify_confirm_password_new').value;
	cpwd = dojo.string.trim(cpwd);
	if(pwd != cpwd) {
		document.getElementById('modify_confirm_password_new').focus();
		dojo.byId('modify_user_error_new').innerHTML = 'Password and Confirm Password are not matching';
		return;
	}
	

	var email = dojo.byId('modify_email_new').value;
	email = dojo.string.trim(email);
	if(email.length <= 0) {
		document.getElementById('modify_email_new').focus();
		dojo.byId('modify_user_error_new').innerHTML = 'Email cannot be empty';
		return;
	}

	var isAdmin = dojo.byId('modify_isadmin_new').checked;
	console.log('User:' + selectedUser + ',pwd:' + pwd + ',cpwd:' + cpwd + ',Email:' + email + ',isAdmin:' + isAdmin);
	
	
	var type='user';
	if(isAdmin) {
		type='admin';
	}
	var conn = new modules.BoardConnectionHandler;
	conn.sendPostData('/board/modifyUser', '&auth_id=' +dataStore['auth_id'] + '&username=' + selectedUser + '&newpwd=' +pwd + '&email=' + email + '&type=' + type , 'ModifyUserSignalNew')
}

dojo.subscribe('ModifyUserSignalNew', function(e) {
	console.log('ModifyUserSignalNew response has come. Value:' + dojo.toJson(e, true));
	
	try {
		if(e.status === 'SUCCESS') {
			dojo.byId('modify_user_error_new').innerHTML = "Successfully modified the user";
			listUsersForUserModify();
		} else {
			dojo.byId('modify_user_error_new').innerHTML = e.error_info;
		}
	} catch(err) {
		dojo.byId('modify_user_error_new').innerHTML = err.message;
	}	
});

deleteSelectedUserNew = function() {
	dojo.byId('modify_user_error_new').innerHTML = '';
	var select = document.getElementById('users_list_for_modification');
	var selectedUser = select.options[select.selectedIndex].innerHTML;
	var isAdmin = false;
	if(selectedUser.indexOf('[ Admin ]') != -1) {
		selectedUser = selectedUser.replace('[ Admin ]', '');
		selectedUser = dojo.string.trim(selectedUser);
		isAdmin = true;
	}
	if(selectedUser == dataStore['username']) {
		dojo.byId('modify_user_error_new').innerHTML = "Cannot delete the currently logged-in user";
		return;
	}
	if(confirm('Do you want to delete the selected user:' + selectedUser + ' ?')) {
		var conn = new modules.BoardConnectionHandler;
		if(isAdmin) {
			conn.sendPostData('/board/deleteUser', '&auth_id=' +dataStore['auth_id'] + '&type=admin&username=' + selectedUser, 'DeleteUserSignalNew');
		} else {
			conn.sendPostData('/board/deleteUser', '&auth_id=' +dataStore['auth_id'] + '&username=' + selectedUser, 'DeleteUserSignalNew');
		}		
	} else {
		setStatus('User has cancelled the user deletion');
	}
}

dojo.subscribe('DeleteUserSignalNew', function(e) {
	console.log('DeleteUserSignalNew response has come. Value:' + dojo.toJson(e, true));
	
	try {
		if(e.status === 'SUCCESS') {
			dojo.byId('modify_user_error_new').innerHTML = "Successfully deleted the user";
			listUsersForUserModify();
		} else {
			dojo.byId('modify_user_error_new').innerHTML = e.error_info;
		}
	} catch(err) {
		dojo.byId('modify_user_error_new').innerHTML = err.message;
	}	
});