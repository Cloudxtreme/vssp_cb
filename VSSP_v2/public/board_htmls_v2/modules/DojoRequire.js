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


showLoadingStatusDialog = function() {
	dojo.addClass('loading', 'show');
	dojo.removeClass('loading', 'dont-show');
	if(dojo.byId('selectedCameraDetailsDisplay')) {
		dojo.addClass('selectedCameraDetailsDisplay', 'dont-show'); 
	}
}

hideLoadingStatusDialog = function() {
	dojo.removeClass('loading', 'show');
	dojo.addClass('loading', 'dont-show');
	if(dojo.byId('selectedCameraDetailsDisplay')) {
		dojo.removeClass('selectedCameraDetailsDisplay', 'dont-show'); 
	}
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