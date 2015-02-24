dojo.provide("modules.AdminHandler");

modules.AdminHandler = function() { };

modules.AdminHandler.prototype.isUserAdmin = function() {
	
	var cookies = getCookies();
	var loggedUser = cookies.vssp_user.split(':');
	var userId = loggedUser[0];
	var userName = loggedUser[1];
	var role = loggedUser[2];
	var xhrArgs = {
		url: '/isUserAdmin',
		postData: 'username=' + userName + '&user_id=' + userId,
		//postData: dojo.toJson({'username':username, 'password':password}),
		xhrFields: {
			withCredentials: true
		},
		handleAs: "json",
		load: function(data, args){
			//console.log('Authentication result has come. Response is:' + dojo.toJson(data));
			dojo.publish('isUserAdminSignal', data)
		},
		error: function(error, args){
			//console.log('Authentication result as Error has come. Input is:' + dojo.toJson(args));
			dojo.publish('isUserAdminSignal', error)
		}
	}
	var deferred = dojo.xhrPost(xhrArgs);
};

//
modules.AdminHandler.prototype.getUsersList = function() {
	
	var xhrArgs = {
		url: '/getUsersList',
		//postData: 'username=' + userName + '&user_id=' + userId + '&role_id=' + role,
		//postData: dojo.toJson({'username':username, 'password':password}),
		xhrFields: {
			withCredentials: true
		},
		handleAs: "json",
		load: function(data, args){
			//console.log('Authentication result has come. Response is:' + dojo.toJson(data));
			dojo.publish('getUsersListSignal', data)
		},
		error: function(error, args){
			//console.log('Authentication result as Error has come. Input is:' + dojo.toJson(args));
			dojo.publish('getUsersListSignal', error)
		}
	}
	var deferred = dojo.xhrPost(xhrArgs);
};

modules.AdminHandler.prototype.modifyUser = function(userID, pwd, firstName, lastName, gender, emailAddress, mobileNumber, role, userActivated) {
	
	data = 'user_id=' + userID + '&password=' + pwd + '&first_name=' + firstName + '&last_name=' + lastName;
	data += '&gender=' + gender + '&email_address=' + emailAddress + '&mobile_number=' + mobileNumber + '&role=' + role + '&user_activated=' + userActivated;
	var xhrArgs = {
		url: '/modifyUser',
		postData: data,
		xhrFields: {
			withCredentials: true
		},
		handleAs: "json",
		load: function(data, args){
			//console.log('Authentication result has come. Response is:' + dojo.toJson(data));
			dojo.publish('modifyUserSignal', data)
		},
		error: function(error, args){
			//console.log('Authentication result as Error has come. Input is:' + dojo.toJson(args));
			dojo.publish('modifyUserSignal', error)
		}
	}
	var deferred = dojo.xhrPost(xhrArgs);
};

modules.AdminHandler.prototype.addUser = function(userName, firstName, lastName, pwd, gender, emailAddress, mobileNumber, role) {
	
	data = 'username=' + userName + '&password=' + pwd + '&first_name=' + firstName + '&last_name=' + lastName;
	data += '&gender=' + gender + '&email_address=' + emailAddress + '&mobile_number=' + mobileNumber + '&role=' + role;
	var xhrArgs = {
		url: '/addUser',
		postData: data,
		xhrFields: {
			withCredentials: true
		},
		handleAs: "json",
		load: function(data, args){
			//console.log('Authentication result has come. Response is:' + dojo.toJson(data));
			dojo.publish('addUserSignal', data)
		},
		error: function(error, args){
			//console.log('Authentication result as Error has come. Input is:' + dojo.toJson(args));
			dojo.publish('addUserSignal', error)
		}
	}
	var deferred = dojo.xhrPost(xhrArgs);
};

modules.AdminHandler.prototype.deleteUser = function(userid, username) {
	
	data = 'user_id=' + userid + '&username=' + username;
	var xhrArgs = {
		url: '/deleteUser',
		postData: data,
		xhrFields: {
			withCredentials: true
		},
		handleAs: "json",
		load: function(data, args){
			dojo.publish('deleteUserSignal', data)
		},
		error: function(error, args){
			dojo.publish('deleteUserSignal', error)
		}
	}
	var deferred = dojo.xhrPost(xhrArgs);
};


