var userListGridRef = {};
showAddUserDlg = function() {
	setStatus('Adding User...');
	var dlg = dijit.byId('addUserDlg');
	
	dijit.byId('addUserName').attr('value', '');
	dijit.byId('addPassword').attr('value','');
	dijit.byId('addConfirmPassword').attr('value','');
	dijit.byId('addFirstName').attr('value','');
	dijit.byId('addLastName').attr('value','');
	dijit.byId('addEmailAddress').attr('value','');
	dijit.byId('addMobileNumber').attr('value','');
	//dojo.byId('addUserError').innerHTML = '';
	dlg.show();	
}

showModifyUserDlg = function() {
	setStatus('Modifying User...');
	var grid = dijit.byId('userListGrid');
	var items = grid.selection.getSelected();
	if(items.length <= 0){
		setStatus('Select a row to modify');
		return;
	}
	var selectedUser = items[0];
	console.log('Selected user is:' + dojo.toJson(selectedUser, true));
	dojo.byId('modifyUserName').value = selectedUser.username;
	dojo.byId('modifyFirstName').value = selectedUser.first_name;
	dojo.byId('modifyLastName').value = selectedUser.last_name;
	if(selectedUser.gender == 'M') {
		console.log('Current user is male');
		radioBtnMale = dijit.byId('modifyGenderMale');
		radioBtnMale.attr('checked', true);
	} else {
		console.log('Current user is female');
		radioBtFemale = dijit.byId('modifyGenderFemale');
		radioBtFemale.attr('checked', true);
	}
	var userActivated = false;
	if(selectedUser.user_activated == 'Y') {
		userActivated = true;
	}
	dijit.byId('modifyUserActivate').attr('checked', userActivated);
	dojo.byId('modifyUserId').value = selectedUser.id;
	dijit.byId('modifyUserRole').set('value', selectedUser.role_id);
	dojo.byId('modifyEmailAddress').value = selectedUser.email_address;
	dojo.byId('modifyMobileNumber').value = selectedUser.mobile_number;
	dojo.byId('modifyUserError').innerHTML = '';
	var dlg = dijit.byId('modifyUserDlg');
	dlg.show();
}

confirmDeleteUser = function() {
	setStatus('Deleting User...');
	var grid = dijit.byId('userListGrid');
	var items = grid.selection.getSelected();
	if(items.length <= 0){
		setStatus('Select a row to delete');
		return;
	}
	var selectedUser = items[0];
	console.log('Selected user is:' + dojo.toJson(selectedUser, true));
	var msg = 'All data like nodes / transactions shall be deleted for user:' + selectedUser.username + '.';
	msg += '\n\n\n';
	msg += 'Do you want to delete the user:' + selectedUser.username + ' ?';
	var choice = confirm(msg);
	if(choice) {
		deleteUser(selectedUser);
	} else {
		setStatus('Cancelled the deletion of user:' + selectedUser.username);
	}
}