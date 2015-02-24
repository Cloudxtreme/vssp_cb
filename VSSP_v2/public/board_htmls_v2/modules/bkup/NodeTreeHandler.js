
iconDisplay = dojo.hitch(this, function(item, opened) {
	if(item !== undefined && item !== null) {
		if('type' in item) {
			console.log('Root node');
			return 'boardIcon';
		} else {
			console.log('Leaf Node');
			return 'nodeIPCameraIcon';
		}
	} 
	return 'boardIcon';
});

removeTree = function() {
	var tree = dijit.byId('nodeTree');
	if(tree != null) {
		console.log('Tree is not null, Deleting it now!!');
		tree.destroy(true);
	} else {
		console.log('Tree is null by default');
	}
	tree = dijit.byId('nodeTree');
	if(tree != null) {
		console.log('Tree is not null, after deleting it!');
	} else {
		console.log('Tree is null, Successfully deleted it');
	}
	
	var widgets = dijit.findWidgets('boardNodeTree');
	dojo.forEach(widgets, function(w) {
		w.destroyRecursive(false);
	});
}

loadTreeWithBoardNodeDetails = function() {
	
	boardListTreeReststore = new dojo.store.JsonRest({
		target:"board/",         // << adapt URL
		mayHaveChildren: function(object){
			// if true, we might be missing the data, false and nothing should be done
			//console.log('Child:' + ("children" in object) + ' for object:' + dojo.toJson(object, true));
			return "children" in object;
			//return false;
			//return true;
		},
		getChildren: function(object, onComplete, onError){
			// this.get calls 'mayHaveChildren' and if this returns true, it will load whats needed, overwriting the 'true' into '{ item }'
			//console.log('Calling the child node:' + object.id);
			if(object.id == 'root') {
				//console.log('Loading the root items for object:' + dojo.toJson(object, true));
				this.get('root?id=' + dataStore['board_id'] + '&user_id=' + dataStore['user_id']).then(function(fullObject){
					// copy to the original object so it has the children array as well.
					object.children = fullObject.children;
					//console.log('Response is:' + dojo.toJson(object, true));
					// now that full object, we should have an array of children
					onComplete(fullObject.children);
					//console.log('Item in children:' + dojo.toJson(fullObject.children));
					availableNodeDetails = fullObject.children.slice(0);
					//console.log('Available Nodes:' + dojo.toJson(availableNodeDetails));
					dijit.byId('main').resize();
				}, function(error){
					// an error occurred, log it, and indicate no children
					console.error(error);
					onComplete([]);
				});
			}
		},
		getRoot: function(onItem, onError){
			// get the root object, we will do a get() and callback the result
			this.get("root").then(onItem, onError);
		},
		getLabel: function(object){
			// just get the name (note some models makes use of 'labelAttr' as opposed to simply returning the key 'name')
			//console.log('Get Label for the object:' + dojo.toJson(object, true));
			return object.node_name;
		}
		

	});			
	var tree = new dijit.Tree({model:boardListTreeReststore, id:'nodeTree' /*, getIconClass: iconFunc*/});
	tree.on('dblclick', function(item) {
		launchNode(item);
	});
	tree.on('click', function(item) {
		//console.log('Camera has been dbl clicked. Item:' + dojo.toJson(item, true));
		showNode(item);
	});	
	tree.placeAt('boardNodeTree');
	tree.startup();	
	clearNodeDetails();
}

getIconStyle = function(item, opened) {
	if(! item.root) {
		console.log('This is not ROOT' + dojo.toJson(item, true));
	} else {
		console.log('This is ROOT:' + dojo.toJson(item, true));
	}
}
iconFunc = dojo.hitch(this, function(item, opened) {

	if(opened) {
		//return root node which is board
	} else {
		//return leaf node which is camera
		return "nodeIPCameraIcon";
	}
});

showNode = function(node) {
	dojo.byId('nodePropertyName').innerHTML = node.node_name;
	dojo.byId('nodePropertyType').innerHTML = node.node_type;
	dojo.byId('nodePropertyLocation').innerHTML = node.node_location;
	if(dojo.byId('nodePropertyDesc') != null) {
		dojo.byId('nodePropertyDesc').innerHTML = node.node_description;
	}
	dojo.byId('nodePropertyModelName').innerHTML = node.node_model_name;
	dojo.byId('nodePropertySize').innerHTML = humanFileSize(node.node_files_size, 1024)
}

clearNodeDetails = function() {
	dojo.byId('nodePropertyName').innerHTML = '';
	dojo.byId('nodePropertyType').innerHTML = '';
	dojo.byId('nodePropertyLocation').innerHTML = '';
	if(dojo.byId('nodePropertyDesc') != null) {
		dojo.byId('nodePropertyDesc').innerHTML = '';
	}
	dojo.byId('nodePropertyModelName').innerHTML = '';
	dojo.byId('nodePropertySize').innerHTML = '';
}
