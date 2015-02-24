
dojo.provide("modules.UserAuthentication");

modules.UserAuthentication = function() { };

modules.UserAuthentication.prototype.isUserAdmin = function(username, password, auth_id) {
	console.log('Authenticating...user:' + username + ', with password:' + password);
	/*
	var xhrArgs = {
		url: "/board/isUserAdmin",
		postData: 'username=' + username + '&password=' + password + '&auth_id=' + auth_id,
		handleAs: "json",
		load: function(data, args){
			dojo.publish('UserAdminAuthenticationSignal', data)
		},
		error: function(error, args){
			dojo.publish('UserAdminAuthenticationSignal', error)
		}
	}
	var deferred = dojo.xhrPost(xhrArgs);
	*/
	var conn = new modules.BoardConnectionHandler;
	conn.sendPostData('/board/isUserAdmin', 'username=' + username + '&password=' + password + '&auth_id=' + auth_id, 'UserAdminAuthenticationSignal');
};

modules.UserAuthentication.prototype.authenticate = function(username, password) {
	console.log('Authenticating...user:' + username + ', with password:' + password);
	/*
	var xhrArgs = {
		url: "/board/userauthenticate",
		postData: 'username=' + username + '&password=' + password,
		//postData: dojo.toJson({'username':username, 'password':password}),
		handleAs: "json",
		load: function(data, args){
			//console.log('Authentication result has come. Response is:' + dojo.toJson(data));
			dojo.publish('UserAuthenticationSignal', data)
		},
		error: function(error, args){
			//console.log('Authentication result as Error has come. Input is:' + dojo.toJson(args));
			dojo.publish('UserAuthenticationSignal', error)
		}
	}
	var deferred = dojo.xhrPost(xhrArgs);
	*/
	var conn = new modules.BoardConnectionHandler;
	conn.sendPostData('/board/userauthenticate', 'username=' + username + '&password=' + password, 'UserAuthenticationSignal');
};

modules.UserAuthentication.prototype.sendForgotPassword = function(emailAddress) {
	console.log('Requesting password for user whose email is:' + emailAddress);
	/*
	var xhrArgs = {
		url: "/userForgotPassword",
		postData: 'emailAddress=' + emailAddress,
		handleAs: "json",
		load: function(data, args){
			dojo.publish('UserForgotPasswordSignal', data)
		},
		error: function(error, args){
			//console.log('Authentication result as Error has come. Input is:' + dojo.toJson(args));
			dojo.publish('UserForgotPasswordSignal', error)
		}
	}
	var deferred = dojo.xhrPost(xhrArgs);
	*/
	var conn = new modules.BoardConnectionHandler;
	conn.sendPostData('/userForgotPassword', 'emailAddress=' + emailAddress, 'UserForgotPasswordSignal');
	
};

modules.UserAuthentication.prototype.sendForgotUsername = function(emailAddress) {
	console.log('Requesting username for user whose email is:' + emailAddress);

	/*
	var xhrArgs = {
		url: "/userForgotUser",
		postData: 'emailAddress=' + emailAddress,
		handleAs: "json",
		load: function(data, args){
			dojo.publish('UserForgotUsernameSignal', data)
		},
		error: function(error, args){
			//console.log('Authentication result as Error has come. Input is:' + dojo.toJson(args));
			dojo.publish('UserForgotUsernameSignal', error)
		}
	}
	var deferred = dojo.xhrPost(xhrArgs);
	*/

	var conn = new modules.BoardConnectionHandler;
	conn.sendPostData('/userForgotUser', 'emailAddress=' + emailAddress, 'UserForgotUsernameSignal');
	
};


