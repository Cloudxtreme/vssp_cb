dojo.registerModulePath('modules', '/../../../../modules');
dojo.require('dojo.string');
dojo.require('dojo.cookie');
dojo.require('dojo.query');
dojo.require('dijit.layout.ContentPane');
dojo.require('dijit.form.ValidationTextBox');
dojo.require('dijit.form.ComboBox');
dojo.require('dijit.form.RadioButton');
dojo.require('dijit.form.TimeTextBox');
dojo.require('dijit.form.FilteringSelect');
dojo.require('dijit.form.Form');
dojo.require('dijit.form.Button');
dojo.require('dijit.form.RadioButton');
dojo.require('dijit.form.CheckBox');
dojo.require('dijit.Calendar');
dojo.require('dijit.Dialog');
dojo.require('dijit.layout.BorderContainer');
dojo.require('dijit.Tree');
dojo.require('modules.BoardConnectionHandler');
dojo.require('modules.UserAuthentication');
dojo.require('modules.UserBoardHandler');
dojo.require('modules.BoardNodeHandler');
dojo.require('dojo.store.JsonRest');
dojo.require('dijit.layout.TabContainer');
dojo.require('dojox.grid.EnhancedGrid');
dojo.require('dojox.grid.enhanced.plugins.Pagination');
dojo.require("dojox.grid.enhanced.plugins.Search");
dojo.require("dojox.grid.enhanced.plugins.Filter");
dojo.require('dojo.data.ObjectStore');
dojo.require('dijit.form.NumberSpinner');
dojo.require('dojo.data.ItemFileReadStore');
dojo.require('dijit.ProgressBar');
dojo.require('dojox.image.ThumbnailPicker');
dojo.require('dijit.form.DateTextBox');
dojo.require('dojox.widget.Wizard');
dojo.require('dojox.widget.WizardPane');
dojo.require('dijit.layout.StackContainer');
dojo.require('dojo.dom-attr');
dojo.require('dijit/form/SimpleTextarea');
dojo.require('dijit/layout/StackContainer');
dojo.require('dijit.layout.StackController');
dojo.require("dojox.layout.TableContainer");
dojo.require('dijit/form/NumberTextBox');

var loading_status_display='';

showLoadingStatusDialog = function() {
	dojo.addClass('loading_dialog', 'show');
	dojo.removeClass('loading_dialog', 'dont-show');
	loading_status_display = trim(loading_status_display);
	if(loading_status_display.length > 0 ) {
		dojo.byId('about_transaction_status_loading').innerHTML = loading_status_display;
	} else {
		dojo.byId('about_transaction_status_loading').innerHTML = 'Loading..';
	}
	if(dojo.byId('selectedCameraDetailsDisplay')) {
		dojo.addClass('selectedCameraDetailsDisplay', 'dont-show'); 
	}
}

hideLoadingStatusDialog = function() {
	dojo.removeClass('loading_dialog', 'show');
	dojo.addClass('loading_dialog', 'dont-show');
	loading_status_display = '';	//done with previous status show; reset it
	dojo.byId('about_transaction_status_loading').innerHTML = '';
	if(dojo.byId('selectedCameraDetailsDisplay')) {
		dojo.removeClass('selectedCameraDetailsDisplay', 'dont-show'); 
	}
}

function trim(str) {
	return str.replace(/^\s+|\s+$/gm,'');
}

function endsWith(str, suffix) {
    return str.indexOf(suffix, str.length - suffix.length) !== -1;
}

function startsWith(str, prefix) {
	return str.substring(0, prefix.length) === prefix;
}

function humanFileSizeNew(bytes, si) {
    var thresh = si ? 1000 : 1024;
    if(bytes < thresh) return bytes + ' B';
    var units = si ? ['kB','MB','GB','TB','PB','EB','ZB','YB'] : ['KiB','MiB','GiB','TiB','PiB','EiB','ZiB','YiB'];
    var u = -1;
    do {
        bytes /= thresh;
        ++u;
    } while(bytes >= thresh);
    return bytes.toFixed(1)+' '+units[u];
};