var fs = require('fs');
var path = require('path');
var async = require('async');
var config = require('../config.js');

var videoList = require('../modules/videolist.js');
var network = require('../modules/network.js');

network.getJSON('https://streaming.media.ccc.de/configs/conferences/32c3/vod.json', function (entries) {
	var todos = [];
	entries.forEach(function (entry) {
		if (entry.status != 'recorded') return;

		var video = videoList.get(entry.id);
		video.filename = path.resolve(config.videoFolder, entry.id+'.mp4');
		video.url = 'http:'+entry.mp4;
		videoList.set(video.id, video);

		if (fs.existsSync(video.filename) && video.downloaded) return;
		todos.push(video);
	})
	fetchVideos(todos);
})

function fetchVideos(videos) {
	async.eachLimit(videos, 1, function (video, callback) {

		network.downloadFile(video.url, video.filename, function (finished, progress) {
			if (finished) {
				videoList.set(video.id, {downloaded:true});
				callback();
			} else {
				console.log('   ' + (100*progress).toFixed(1) + '%');
			}
		})
	})
}

