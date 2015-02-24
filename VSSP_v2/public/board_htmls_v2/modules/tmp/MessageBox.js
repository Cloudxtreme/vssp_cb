//Confirmation Module
dojo.provide("modules.MessageBox");

define('ConfirmationDialog', [
		'dojo/_base/declare',
		'dojo/_base/lang',
		'dojo/dom',
		'dijit/Dialog',
		'dijit/_WidgetBase',
		'dijit/_TemplatedMixin',
		'dijit/_WidgetsInTemplateMixin',
		'dijit/form/Button'
		], function(
			declare,
			lang,
			dom,
			Dialog,
			_WidgetBase,
			_TemplateMixin,
			_WidgetsInTemplateMixin
	) {
	
		var ConfirmationDialog = declare(Dialog, {
			title: 'Confirm',
			message:	'Are you sure ?',
			
			constructor: function(/*Object*/ kwArgs) {
				lang.mixin(this, kwArgs);
				var message = this.message;
				var contentWidget = new(declare[_WidgetBase, _TemplateMixin, _WidgetsInTemplateMixin], {
				
					templateString: dom.byId('confirm-dialog-template').textContent,
					message: message
				});
				contentWidget.startup();
				this.content = contentWidget;
			},
			postCreate: function() {
				this.inherited(arguments);
				this.connect(this.content.cancelButton, 'onClick', 'onCancel');
			}
		});
		
		return ConfirmationDialog;
	});
	
//MessageBox Module
define('MessageBox', [
		'ConfirmationDialog',
		'dojo/Deferred',
		'dojo/aspect',
		'dojo/_base/array'
	], function(ConfirmationDialog, Deferred, aspect, array) {
		var MessageBox = {};
		MessageBox.confirm = function(kwArgs) {
			var confirmDialog = new ConfirmationDialog(kwArgs);
			confirmDialog.startup();
			
			var deferred = new Deferred();
			var signal, signals = [];
			var destroyDialog = function() {
				array.forEach(signals, function(signal) {
					signal.remvoe();
				});
				delete signals;
				confirmDialog.destroyRecursive();
			}
			
			signal = aspect.after(confirmDialog, 'onExecute', function() {
				destroyDialog();
				deferred.resolve('MessageBox.OK');
			});
			signals.push(signal);
			
			signal = aspect.after(confirmDialog, 'onCancel', function() {
				destroyDialog();
				deferred.resolve('MessageBox.Cancel');
			});
			signals.push(signal);
			confirmDialog.show();
			return deferred;
		}
		return MessageBox;
	});