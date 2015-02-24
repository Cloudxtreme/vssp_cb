refreshClientTab = function() {
	listFilesFromBoard();
}

refreshServerTab = function() {

}

listFilesFromBoard = function() {
	console.log('Listing files from Board...');
	var selectedNode = getSelectedTabNode();
	
	if((dojo.byId('videoPreviewListInBoardGrid_' + selectedNode.node_id))) {
		dojo.attr(dojo.byId('videoPreviewListInBoardGrid_' + selectedNode.node_id), 'style', 'display:none');
		dojo.attr(dojo.byId('videoListInBoardGrid_' + selectedNode.node_id), 'style', 'display:block');
	}
	//var boardAuth = new modules.UserBoardHandler;
	//boardAuth.listFiles(selectedNode.board_ip, selectedNode.board_port, selectedNode.name, boardAuthDetails[selectedNode.board_id]); 
	var url = '/board/listFiles?node_name=' + selectedNode.node_name;
	url += '&auth_id=' + dataStore['auth_id'];
	console.log('loading url:' + url);
	videoStoreInBoard = new dojo.store.JsonRest( { 
													target : url,
													idProperty: "id"
												}
										);
	videoStore = new dojo.data.ObjectStore( { objectStore: videoStoreInBoard });
	grid = new dojox.grid.EnhancedGrid( {
							selectable: true,
							store : videoStore,
							structure : [
								{ name : 'id' , field : 'id', hidden: true },
								{ name : 'File Name' , field : 'Path', width: '250px', formatter : getFormattedFileName, classes: 'file_name_column'},
								{ name : 'Duration (HH:MM:SS.##)' , field : 'Duration', width: '125px'},
								{ name : 'Size' , field : 'Size', width: '50px', formatter: getFormattedFileSize, datatype: 'number' },
								{ name : 'Bitrate' , field : 'bitrate', width: '50px'},
								{ name : 'Screen Size' , field : 'Screen Size', width: '75px'},
								{ name : 'FPS' , field : 'FPS', width: '50px'},
								{ name : 'Created Date' , field : 'ctime', width: '150px', datatype: 'date', dataTypeArgs: { datePattern: 'yyyy-MM-dd HH:mm:SS'} },
								{ name : 'Download' , field : 'Path', width: '70px', formatter : getFormattedDownloadOption},
								{ name : 'majorBrand' , field : 'majorBrand', hidden: true},
								{ name : 'minorVersion' , field : 'minorVersion', hidden: true},
								{ name : 'compatibleBrands' , field : 'compatibleBrands', hidden: true},
								{ name : 'title' , field : 'title', hidden: true},
								{ name : 'encoder' , field : 'encoder', hidden: true},
								{ name : 'comment' , field : 'comment', hidden: true},
								{ name : 'Node' , field : 'Node', hidden: true},
								{ name : 'Board' , field : 'Board', hidden: true},
								{ name : 'Video Spec' , field : 'Video Spec', hidden: true},
								{ name : 'Normal_Image' , field : 'Normal_Image',hidden: true}
							],
							rowSelector: '20px',
							plugins: {
									pagination: {
										pageSizes: ["10", "25", "50", "100"],
										description: true,
										sizeSwitch: true,
										pageStepper: true,
										gotoButton: true,
										maxPageStep: 5,
										position: "top"
									},
									search : true,
									filter:{
										// Show the closeFilterbarButton at the filter bar
										closeFilterbarButton: false,
										// Set the maximum rule count to 5
										ruleCount: 0,
										// Set the name of the items
										itemsName: "videofiles"
									}
								}
						});
	//console.log('Grid has been successfully created');
	boardVideoGrids[selectedNode.node_id] = grid;
	dojo.connect(grid, 'onRowDblClick', function(item) {
		var selectedNode = getSelectedNode();
		var selectedVideo = {};
		selectedVideo['id'] = boardVideoGrids[selectedNode.node_id]._getItemAttr(item.rowIndex, 'id');
		selectedVideo['filePath'] = boardVideoGrids[selectedNode.node_id]._getItemAttr(item.rowIndex, 'Path');
		selectedVideo['size'] = boardVideoGrids[selectedNode.node_id]._getItemAttr(item.rowIndex, 'Size');
		selectedVideo['createdDate'] = boardVideoGrids[selectedNode.node_id]._getItemAttr(item.rowIndex, 'ctime');
		selectedVideo['majorBrand'] = boardVideoGrids[selectedNode.node_id]._getItemAttr(item.rowIndex, 'majorBrand');
		selectedVideo['minorVersion'] = boardVideoGrids[selectedNode.node_id]._getItemAttr(item.rowIndex, 'minorVersion');
		selectedVideo['compatibleBrands'] = boardVideoGrids[selectedNode.node_id]._getItemAttr(item.rowIndex, 'compatibleBrands');
		selectedVideo['title'] = boardVideoGrids[selectedNode.node_id]._getItemAttr(item.rowIndex, 'title');
		selectedVideo['encoder'] = boardVideoGrids[selectedNode.node_id]._getItemAttr(item.rowIndex, 'encoder');
		selectedVideo['comment'] = boardVideoGrids[selectedNode.node_id]._getItemAttr(item.rowIndex, 'comment');
		selectedVideo['bitrate'] = boardVideoGrids[selectedNode.node_id]._getItemAttr(item.rowIndex, 'bitrate');
		selectedVideo['Node'] = boardVideoGrids[selectedNode.node_id]._getItemAttr(item.rowIndex, 'Node');
		selectedVideo['Board'] = boardVideoGrids[selectedNode.node_id]._getItemAttr(item.rowIndex, 'Board');
		selectedVideo['Normal_Image'] = boardVideoGrids[selectedNode.node_id]._getItemAttr(item.rowIndex, 'Normal_Image');
		selectedVideo['Duration'] = boardVideoGrids[selectedNode.node_id]._getItemAttr(item.rowIndex, 'Duration');
		selectedVideo['Screen Size'] = boardVideoGrids[selectedNode.node_id]._getItemAttr(item.rowIndex, 'Screen Size');
		selectedVideo['FPS'] = boardVideoGrids[selectedNode.node_id]._getItemAttr(item.rowIndex, 'FPS');
		selectedVideo['Video Spec'] = boardVideoGrids[selectedNode.node_id]._getItemAttr(item.rowIndex, 'Video Spec');
		
		console.log('Selecte video:' + dojo.toJson(selectedVideo, true));
		/*
		var id = boardVideoGrids[selectedNode.node_id]._getItemAttr(item.rowIndex, 'id');
		var filePath = boardVideoGrids[selectedNode.node_id]._getItemAttr(item.rowIndex, 'Path');
		var size = boardVideoGrids[selectedNode.node_id]._getItemAttr(item.rowIndex, 'Size');
		var createdDate = boardVideoGrids[selectedNode.node_id]._getItemAttr(item.rowIndex, 'ctime');
		*/
		//showVideoPlayer(selectedNode, id, filePath, size, createdDate);
		showVideoPlayer(selectedNode, selectedVideo);
	});
	dojo.empty('videoListInBoardGrid_' + selectedNode.node_id);
	
	dojo.attr('videoListInBoardGrid_' + selectedNode.node_id, 'style', 'width:100%; height:100%');
	grid.placeAt('videoListInBoardGrid_'  + selectedNode.node_id);
	grid.startup();
	console.log('grid has been successfully started');
	getTotalFilesSizeInNode();
}

getFormattedFileName = function(value) {
	value = dojo.string.trim(value);
	if(value.length <= 0) {
		return '';
	}
	var index = value.lastIndexOf('/');
	if(index != -1) {
		value = value.substring(index + 1);
	}
	return value;
}

getFormattedDownloadOption = function(value) {
	//console.log('File Download value is:' + value);
	return '<span><a href=\'/board/downloadFile?file=' + value + '&auth_id=' + dataStore['auth_id'] + '\'/><img width=\'32\' height=\'32\' src=\'/res/download_arrow_32_32.png\'/></a><span>';
}


getFormattedFileSize = function(value) {
	return humanFileSize(value, 1024);
}

function humanFileSize(bytes, si) {
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

dojo.subscribe('UserBoardNodeListFilesSignal', function(e) {
	dojo.attr(dojo.byId('preloader'), 'style', 'display:none');
	console.log('User Board Camera List Files response has come. Value:' + dojo.toJson(e, true));
	try {
		var selectedNode = getSelectedTabNode();
		if(e.status === 'SUCCESS') {
			console.log('List of files:' + dojo.toJson(e, true));
			setStatus('No. of files listed:' + e.result.length);
		} else {
			setStatus(e.error_info);
		}
	} catch(err) {
		setStatus(err.message);
	}	
});

dojo.subscribe('GetVideoImagesPreviewSignal', function(e) {
	dojo.attr(dojo.byId('preloader'), 'style', 'display:none');
	console.log('Video Images Preview Signal has come. Value:' + dojo.toJson(e, true));
	try {
		var selectedNode = getSelectedTabNode();
		if(e.status === 'SUCCESS') {
			console.log('List of files:' + dojo.toJson(e, true));
			setStatus('Got the images from the video...');
			var store = new dojo.data.ItemFileReadStore({data:e});
			var itemRequest = { query : {}, start: 0};
			var itemNameMap = { imageThumbAttr: 'large', titleAttr: 'title' };
			console.log('Selected node is:' + selectedNode.node_id);
			dijit.byId('videoGallery_' + selectedNode.node_id).setDataStore(store, itemRequest, itemNameMap);
			dojo.subscribe(dijit.byId('videoGallery_' + selectedNode.node_id).getClickTopicName(), function(info) {
				//console.log('The clicked object is:' + info.data.Size);
				showSelectedVideoInProperties(info.data);
			});
			
		} else {
			setStatus(e.error_info);
		}
	} catch(err) {
		setStatus(err.message);
	}	
});

showSelectedVideoInProperties = function(data) {
	dojo.byId('videoPlayerPreviewFileNodeName').innerHTML = data.Node;
	dojo.byId('videoPlayerPreviewFileBoardName').innerHTML = data.Board;
	dojo.byId('videoPlayerPreviewFileName').innerHTML = data.Name;
	dojo.byId('videoPlayerPreviewFileSize').innerHTML = data.Size;
	dojo.byId('videoPlayerPreviewFileDuration').innerHTML = data.Duration;
	dojo.byId('videoPlayerPreviewFileBitrate').innerHTML = data.bitrate;
	dojo.byId('videoPlayerPreviewFileEncoder').innerHTML = data.encoder;
	dojo.byId('videoPlayerPreviewFileCreatedDate').innerHTML = data.ctime;
	dojo.byId('videoPlayerPreviewFileTitle').innerHTML = data.title;
	dojo.byId('videoPlayerPreviewFileMajorBrand').innerHTML = data.majorBrand;
	dojo.byId('videoPlayerPreviewFileminorVersion').innerHTML = data.minorVersion;
	dojo.byId('videoPlayerPreviewFilecompatibleBrands').innerHTML = data.compatibleBrands;
	dataStore['SelectedVideoInPreview'] = data.Path;
}

clearSelectedVideoInProperties = function(data) {
	dojo.byId('videoPlayerPreviewFileNodeName').innerHTML = '';
	dojo.byId('videoPlayerPreviewFileBoardName').innerHTML = '';
	dojo.byId('videoPlayerPreviewFileName').innerHTML = '';
	dojo.byId('videoPlayerPreviewFileSize').innerHTML = '';
	dojo.byId('videoPlayerPreviewFileDuration').innerHTML = '';
	dojo.byId('videoPlayerPreviewFileBitrate').innerHTML = '';
	dojo.byId('videoPlayerPreviewFileEncoder').innerHTML = '';
	dojo.byId('videoPlayerPreviewFileCreatedDate').innerHTML = '';
	dojo.byId('videoPlayerPreviewFileTitle').innerHTML = '';
	dojo.byId('videoPlayerPreviewFileMajorBrand').innerHTML = '';
	dojo.byId('videoPlayerPreviewFileminorVersion').innerHTML = '';
	dojo.byId('videoPlayerPreviewFilecompatibleBrands').innerHTML = '';
}

playSelectedVideo = function() {
	if(dataStore['SelectedVideoInPreview']) {
		fileToPlay = dataStore['SelectedVideoInPreview'];
		var mediaFile = 'http://localhost:10010' + fileToPlay;
		console.log('Loading file in preview mode:' + mediaFile);
		var videoControl = document.getElementById('videoControlInPreview');
		videoControl.src = mediaFile;
	}
}
listImagesFilesAsPreview = function() {
	var selectedNode = getSelectedTabNode();
	
	dojo.attr(dojo.byId('videoPreviewListInBoardGrid_' + selectedNode.node_id), 'style', 'display:block');
	dojo.attr(dojo.byId('videoListInBoardGrid_' + selectedNode.node_id), 'style', 'display:none');
	
	var boardAuth = new modules.UserBoardHandler;
	boardAuth.getVideoImagesPreview(selectedNode.node_name, dataStore['auth_id']); 

	/*
	//var boardAuth = new modules.UserBoardHandler;
	//boardAuth.listFiles(selectedNode.board_ip, selectedNode.board_port, selectedNode.name, boardAuthDetails[selectedNode.board_id]); 
	var url = '/board/listFilesInPreview?node_name=' + selectedNode.node_name;
	url += '&auth_id=' + dataStore['auth_id'];
	console.log('Loading URL:' + url);
	//console.log('loading url:' + url);
	videoPreviewStoreJson = new dojo.store.JsonRest( { 
													target : url,
													idProperty: "id"
												}
										);
	//dijit.byId('imageItemStore_' + selectedNode.node_id).set('url', url);
	videoPreviewStore = new dojo.data.ObjectStore( { objectStore: videoPreviewStoreJson });

	var itemRequest = { query : {}, count:20, start:0 };
	var itemNameMap = { imageThumbAttr: 'large', titleAttr: 'title' };
	//dijit.byId('videoGallery_' + selectedNode.node_id).setDataStore(videoPreviewStore, itemRequest);
	dijit.byId('videoGallery_' + selectedNode.node_id).setDataStore(videoPreviewStore, itemRequest, itemNameMap);
	*/
}