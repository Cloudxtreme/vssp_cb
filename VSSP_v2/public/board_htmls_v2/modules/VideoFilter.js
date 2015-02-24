
var videoFilterStartDateSelected;
var videoFilterEndDateSelected;


hideVideoFilterDlgNew = function() {
	dojo.removeClass('selectedCameraDetailsDisplay', 'dont-show'); 
	dojo.addClass('filterVideos_container', 'dont-show');
}

filterVideosInLastHour = function(camera_id, lastDuration) {
	console.log('Filtering the videos from camera:' + camera_id + ' for last duration:' + lastDuration);
	//if(dojo.string.trim(camera_id).length <= 0) {
	//	showErrorStatus( 'Failed to get the selected camera details.');
	//	return;
	//}
	var cameraDetails = getCameraDetailsById(camera_id);
	if(cameraDetails == null || cameraDetails == undefined) {
		handleException(new Error('Failed to get the selected camera details.'), true, 'Error');
		return;
	}
	var m = moment();
	m.subtract(lastDuration, 'hour');
	var startDateTime = m;
	var endDateTime = moment();
	console.log('END MOMENT is:'  + endDateTime + ', START MOMENT:' + startDateTime);
	
	if(endDateTime.diff(startDateTime) <= 0) {
		handleException(new Error('End date has to be greater than Start date.'), true, 'Error');
		return;
	}
	videoFilterStartDateSelected = startDateTime;
	videoFilterEndDateSelected = endDateTime;
	
	var startTime = startDateTime.millisecond();
	var endTime = endDateTime.millisecond();
	console.log('Start:' + startTime + ', End:' + endTime);
	
	if(currentCameraVideoList.length <= 0) {
		handleException(new Error('No Videos are found for the selected camera.'), true, 'Error');
		return;
	}
	
	var totalSize = 0;
	var totalDuration = moment.duration(0);

	var filteredVideos = [];
	currentCameraVideoList.forEach(function(video) {
		
		var videoMoment = moment(video['timestamp']);
		console.log('Checking:' + videoMoment.format('MM/DD/YYYY HH:mm') + ',' + startDateTime.format('MM/DD/YYYY HH:mm') + ',' + endDateTime.format('MM/DD/YYYY HH:mm'));
		if(videoMoment.diff(startDateTime) >= 0  && endDateTime.diff(videoMoment) >= 0) {
			filteredVideos.push(video);
			//console.log('Adding:' + video['timestamp']);
			var currentMoment = moment.duration(video['Duration']);
			totalDuration.add(currentMoment);
			
			totalSize += video['Size'];
		}
	});
	
	if(filteredVideos.length <= 0) {
		handleException(new Error('No Videos are found for the selected duration.'), true, 'Error');
		return;
	}
	var totalDurationDisplay = '';
	var totalRecordDays = Math.floor(totalDuration.asMilliseconds()/(86400 * 1000));
	var totalRecordInMilliseconds = totalDuration.asMilliseconds() % (86400 * 1000)
	var totalRecordInDay = moment.utc(totalRecordInMilliseconds);
	var recordDurationDisplay = totalRecordInDay.format("HH") + ' hours, ' + totalRecordInDay.format("mm") + ' mins, ' + totalRecordInDay.format("ss") + ' seconds';
	if(totalRecordDays > 0) {
		totalDurationDisplay =  totalRecordDays + ' days, ' + recordDurationDisplay;
	} else {
		totalDurationDisplay =  recordDurationDisplay;
	}
	console.log('Total Duration:' + totalDurationDisplay);
	console.log('Total size:' + humanFileSizeNew(totalSize));
	
	loadImagesFromCameraForFilteredVideos(filteredVideos, cameraDetails['node_name'], cameraDetails['node_id'], totalDurationDisplay, totalSize);
}

showFilterDialogNew = function(camera_id) {

	dojo.byId('selected_camera_id_video_filter').value = '';
	var m = moment();
	var yearMoment = moment();
	var months = [ 'Jan','Feb','Mar','Apr','May','Jun','Jul','Aug', 'Sep', 'Oct', 'Nov',' Dec'];
	
	if(videoFilterStartDateSelected != undefined || videoFilterStartDateSelected != null) {
		m = videoFilterStartDateSelected;
	}
	var data = '';
	for(var mon = 0; mon <= months.length; mon++) {
		if(m.month() == mon) {
			data += '<option selected>' + months[mon] + '</option>';
		} else {
			data += '<option>' + months[mon] + '</option>';
		}
	}
	dojo.byId('start_video_filter_month').innerHTML = data;
	
	data = '';
	if(videoFilterEndDateSelected != undefined || videoFilterEndDateSelected != null) {
		m = videoFilterEndDateSelected;
	}
	for(var mon = 0; mon <= months.length; mon++) {
		if(m.month() == mon) {
			data += '<option selected>' + months[mon] + '</option>';
		} else {
			data += '<option>' + months[mon] + '</option>';
		}
	}
	dojo.byId('end_video_filter_month').innerHTML = data;
	
	if(videoFilterStartDateSelected != undefined || videoFilterStartDateSelected != null) {
		m = videoFilterStartDateSelected;
	}
	data = '';
	for(var d = 1; d <= 31; d++) {
		if(d == m.date()) {
			data += '<option selected>' + d + '</option>';
		} else {
			data += '<option>' + d + '</option>';
		}
	}
	dojo.byId('start_video_filter_date').innerHTML = data;

	data = '';
	if(videoFilterEndDateSelected != undefined || videoFilterEndDateSelected != null) {
		m = videoFilterEndDateSelected;
	}
	for(var d = 1; d <= 31; d++) {
		if(d == m.date()) {
			data += '<option selected>' + d + '</option>';
		} else {
			data += '<option>' + d + '</option>';
		}
	}
	dojo.byId('end_video_filter_date').innerHTML = data;
	
	data = '';
	if(videoFilterStartDateSelected != undefined || videoFilterStartDateSelected != null) {
		m = videoFilterStartDateSelected;
	}
	var y = yearMoment.year() - 5;
	for(; y <= yearMoment.year() + 10; y++) {
		if(y == m.year()) {
			data += '<option selected>' + y + '</option>';
		} else {
			data += '<option>' + y + '</option>';
		}
	}
	dojo.byId('start_video_filter_year').innerHTML = data;
	data = '';
	if(videoFilterEndDateSelected != undefined || videoFilterEndDateSelected != null) {
		m = videoFilterEndDateSelected;
	}
	data = '';
	var y = yearMoment.year() - 5;
	for(; y <= yearMoment.year() + 10; y++) {
		if(y == m.year()) {
			data += '<option selected>' + y + '</option>';
		} else {
			data += '<option>' + y + '</option>';
		}
	}
	dojo.byId('end_video_filter_year').innerHTML = data;
	
	data = '';
	if(videoFilterStartDateSelected != undefined || videoFilterStartDateSelected != null) {
		m = videoFilterStartDateSelected;
	}
	for(var h = 0; h < 24; h++) {
		if(m.hour() == h) {
			if(m.minute() >= 0 && m.minute() < 15) {
				data += '<option selected>' + h + ':00' + '</option>';
			} else {
				data += '<option>' + h + ':00' + '</option>';
			}
			
			if(m.minute() >= 15 && m.minute() < 30) {
				data += '<option selected>' + h + ':15' + '</option>';
			} else {
				data += '<option>' + h + ':15' + '</option>';
			}
			if(m.minute() >= 30 && m.minute() < 45) {
				data += '<option selected>' + h + ':30' + '</option>';
			} else {
				data += '<option>' + h + ':30' + '</option>';
			}
			if(m.minute() >= 45) {
				data += '<option selected>' + h + ':45' + '</option>';
			} else {
				data += '<option>' + h + ':45' + '</option>';
			}
		} else {
			data += '<option>' + h + ':00' + '</option>';
			data += '<option>' + h + ':15' + '</option>';
			data += '<option>' + h + ':30' + '</option>';
			data += '<option>' + h + ':45' + '</option>';
		}
	}
	//
	dojo.byId('start_video_filter_hour').innerHTML = data;

	data = '';
	if(videoFilterEndDateSelected != undefined || videoFilterEndDateSelected != null) {
		m = videoFilterEndDateSelected;
	}
	for(var h = 0; h < 24; h++) {
		if(m.hour() == h) {
			if(m.minute() >= 0 && m.minute() < 15) {
				data += '<option selected>' + h + ':00' + '</option>';
			} else {
				data += '<option>' + h + ':00' + '</option>';
			}
			
			if(m.minute() >= 15 && m.minute() < 30) {
				data += '<option selected>' + h + ':15' + '</option>';
			} else {
				data += '<option>' + h + ':15' + '</option>';
			}
			if(m.minute() >= 30 && m.minute() < 45) {
				data += '<option selected>' + h + ':30' + '</option>';
			} else {
				data += '<option>' + h + ':30' + '</option>';
			}
			if(m.minute() >= 45) {
				data += '<option selected>' + h + ':45' + '</option>';
			} else {
				data += '<option>' + h + ':45' + '</option>';
			}
		} else {
			data += '<option>' + h + ':00' + '</option>';
			data += '<option>' + h + ':15' + '</option>';
			data += '<option>' + h + ':30' + '</option>';
			data += '<option>' + h + ':45' + '</option>';
		}
	}
	dojo.byId('end_video_filter_hour').innerHTML = data;
	
	$('.selectpicker').selectpicker('refresh');
	
	dojo.addClass('selectedCameraDetailsDisplay', 'dont-show'); 
	dojo.removeClass('filterVideos_container', 'dont-show');
	
	dojo.byId('video_filter_error_status').innerHTML = '';
	
	//$('#start_video_filter_month').selectpicker('', 
	dojo.byId('selected_camera_id_video_filter').value = camera_id;
}

getStartDateForVideoFilter = function() {

	var dateValue = dojo.byId('start_video_filter_year').value + '-' + (dojo.byId('start_video_filter_month').selectedIndex + 1) + '-' + dojo.byId('start_video_filter_date').value;
	dateValue += ' ' + dojo.byId('start_video_filter_hour').value;
	
	//console.log('Start:' + dateValue);
	if(! moment(dateValue).isValid()) {
		console.log('Not a valid date');
	}
	return moment(dateValue);
}

getEndDateForVideoFilter = function() {
	var dateValue = dojo.byId('end_video_filter_year').value + '-' + (dojo.byId('end_video_filter_month').selectedIndex + 1) + '-' + dojo.byId('end_video_filter_date').value;
	dateValue += ' ' + dojo.byId('end_video_filter_hour').value;
	
	//console.log('End:' + dateValue);
	return moment(dateValue);
}

filterVideosNew = function() {
	
	var camera_id = dojo.byId('selected_camera_id_video_filter').value;
	
	if(dojo.string.trim(camera_id).length <= 0) {
		dojo.byId('video_filter_error_status').innerHTML = 'Failed to get the selected camera details.';
		return;
	}
	var cameraDetails = getCameraDetailsById(camera_id);
	if(cameraDetails == null || cameraDetails == undefined) {
		dojo.byId('video_filter_error_status').innerHTML = 'Failed to get the selected camera details.';
		return;
	}
	
	
	dojo.byId('video_filter_error_status').innerHTML = '';
	var startDateTime = getStartDateForVideoFilter();
	var endDateTime = getEndDateForVideoFilter();
	console.log('END MOMENT is:'  + endDateTime + ', START MOMENT:' + startDateTime);
	
	if(endDateTime.diff(startDateTime) <= 0) {
		dojo.byId('video_filter_error_status').innerHTML = 'End date has to be greater than Start date.';
		return;
	}
	videoFilterStartDateSelected = startDateTime;
	videoFilterEndDateSelected = endDateTime;
	
	var startTime = startDateTime.millisecond();
	var endTime = endDateTime.millisecond();
	console.log('Start:' + startTime + ', End:' + endTime);
	
	if(currentCameraVideoList.length <= 0) {
		dojo.byId('video_filter_error_status').innerHTML = 'No Videos are found for the selected camera.';
		return;
	}
	
	var totalSize = 0;
	var totalDuration = moment.duration(0);

	var filteredVideos = [];
	currentCameraVideoList.forEach(function(video) {
		
		var videoMoment = moment(video['timestamp']);
		console.log('Checking:' + videoMoment.format('MM/DD/YYYY HH:mm') + ',' + startDateTime.format('MM/DD/YYYY HH:mm') + ',' + endDateTime.format('MM/DD/YYYY HH:mm'));
		if(videoMoment.diff(startDateTime) >= 0  && endDateTime.diff(videoMoment) >= 0) {
			filteredVideos.push(video);
			//console.log('Adding:' + video['timestamp']);
			var currentMoment = moment.duration(video['Duration']);
			totalDuration.add(currentMoment);
			
			totalSize += video['Size'];
		}
	});
	
	if(filteredVideos.length <= 0) {
		dojo.byId('video_filter_error_status').innerHTML = 'No Videos are found for the selected duration.';
		return;
	}
	var totalDurationDisplay = '';
	var totalRecordDays = Math.floor(totalDuration.asMilliseconds()/(86400 * 1000));
	var totalRecordInMilliseconds = totalDuration.asMilliseconds() % (86400 * 1000)
	var totalRecordInDay = moment.utc(totalRecordInMilliseconds);
	var recordDurationDisplay = totalRecordInDay.format("HH") + ' hours, ' + totalRecordInDay.format("mm") + ' mins, ' + totalRecordInDay.format("ss") + ' seconds';
	if(totalRecordDays > 0) {
		totalDurationDisplay =  totalRecordDays + ' days, ' + recordDurationDisplay;
	} else {
		totalDurationDisplay =  recordDurationDisplay;
	}
	console.log('Total Duration:' + totalDurationDisplay);
	console.log('Total size:' + humanFileSizeNew(totalSize));
	
	loadImagesFromCameraForFilteredVideos(filteredVideos, cameraDetails['node_name'], cameraDetails['node_id'], totalDurationDisplay, totalSize);
	hideVideoFilterDlgNew();
}

loadImagesFromCameraForFilteredVideos = function(videos, node_name, node_id, total_record_duration, total_size) {
	
	var videoIndex = 0;
	currentPlayingVideoID = -1;
	var totalNoOfVideos = 0;
	videos.forEach(function(video) {
		if(video['Normal_Image'] !== undefined) {
			totalNoOfVideos ++;
		}
	});
	var data = '<div class="row">';
	data += '<div class="col-xs-12">'; 
	//data += '<div class="list-group"><a class="list-group-item active">';
	//data += '<span id="noOfVideoFilesInSelectedCamera" class="badge badge-default"></span>';
	//data += 'Total no. of files:<span class="left">' + totalNoOfVideos + '</span></a>';
	//data += '</div>';
	data += '<div class="panel panel-primary"><div class="panel-heading"><h3 class="panel-title">';
	//data += '&nbsp;&nbsp;';
	
	//data += '<span class="badge  badge-default"><a id="selectUnSelectVideoFiles" href="javascript:selectAllVideosInCurrentCamera(' + node_id + ');">Select All</a></span>&nbsp;&nbsp;';
	
	data += '<button type="button" class="btn btn-primary" data-color="primary" onClick="javascript:selectAllVideosInCurrentCamera(' + node_id + ')";><i id="selectUnselectAllVideos" class="glyphicon glyphicon-unchecked"></i><input type="checkbox" id="checkSelectUnselectAllVideos" class="hidden"></button>';

	data += '<button type="button" class="btn btn-primary" onClick="javascript:loadVideosFromCamera(' + node_id + ');"><i class="glyphicon glyphicon-refresh"></i></button>';
	
	data += '<button type="button" class="btn btn-primary dropdown-toggle" data-toggle="dropdown"><i class="glyphicon glyphicon-filter"></i><span class="caret"></span></button>';
	data += '<ul class="dropdown-menu" role="menu"><li class="dropdown-submenu"><a href="#">Filter Videos captured in Last</a>';
	data += '<ul class="dropdown-menu">';
	data += '<li><a href="javascript:filterVideosInLastHour(' + node_id + ', 1);">1 hour</a></li>';
	data += '<li><a href="javascript:filterVideosInLastHour(' + node_id + ', 2);">2 hour</a></li>';
	data += '<li><a href="javascript:filterVideosInLastHour(' + node_id + ', 3);">3 hour</a></li>';
	data += '<li><a href="javascript:filterVideosInLastHour(' + node_id + ', 4);">4 hour</a></li>';
	data += '<li><a href="javascript:filterVideosInLastHour(' + node_id + ', 5);">5 hour</a></li';
	data += '<li><a href="javascript:filterVideosInLastHour(' + node_id + ', 6);">6 hour</a></li>';
	data += '</ul>';
	data += '<li><a href="javascript:showFilterDialogNew(' + node_id + ', 6);">Custom Filter</a></li>';
	data += '</ul>';
	
	//data += '<span class="badge  badge-default"><a href="javascript:showFilterDialogNew(' + node_id + ');"><img alt="Filter Videos" src="./img/filter-16.png"/></a></span>&nbsp;&nbsp;';
	data += '<button type="button" class="btn btn-primary" onClick="javascript:deleteSelectedVideosNew(' + node_id + ');"><i class="glyphicon glyphicon-trash"></i></button>';
	data += '<button type="button" class="btn btn-primary" data-color="primary" onClick="javascript:showBackupSelectedVideosDialog(' + node_id + ')";><i class="glyphicon glyphicon-share"></i></button>&nbsp;&nbsp;';

	data += '<span>No. of files selected <span id="noOfSelectedFiles" class="badge badge-default">0</span></span>';
	data += '<span class="pull-right">Total no. of files:<span class="badge badge-default">' +totalNoOfVideos + '</span>&nbsp;&nbsp;';
	data += 'Usage:<span class="badge badge-default">' + humanFileSizeNew(total_size, 1024) + '</span>&nbsp;&nbsp;';
	data+= 'Total Recorded Duration:<span class="badge badge-default">' + total_record_duration + '</span></span>';
	data +='</h3></div></div>';
	data += '</div>';
	data += '</div>';
	data += '<div id="cameraListVideosContainer">';	
	data += '<div class="row">';
	data += '<div class="col-xs-12">'; 
	
		
	console.log('No. of videos:' + totalNoOfVideos);
	var index = 0;
	if(videos.length > 0) {
		videos.forEach(function(video) {
			if(video['Normal_Image'] !== undefined) {
				var prevVideo = null;
				var nextVideo = null;
				if(index != 0) {
					prevVideo = videos[index - 1];
				}
				if(index < (totalNoOfVideos - 1)) {
					nextVideo = videos[index + 1];
				}
				data += getVideoThumbnail(video, videoIndex, prevVideo, nextVideo);
				videoIndex ++;
				if(videoIndex % no_of_videos_per_row == 0) {
					data += '</div></div><div class="row"><div class="col-xs-12">';
				}
			} else {
				console.log('Normal image is not found for:' + video['timestamp']);
			}
			index ++;
		});
	} else {
		data += '<div class="col-xs-12 text-center"><span class="label label-info">No files are present in the video store of selected camera</span></div>';
	}
	data += '</div></div>';
	data += '</div>';
	dojo.byId('currentCameraDetails').innerHTML = data;
	//dojo.byId('noOfVideoFilesInSelectedCamera').innerHTML =  videoIndex;
	dojo.addClass('openVideosListOfSelectedCamera', 'active');
	dojo.removeClass('openLiveViewSelectedCamera', 'active');
}
