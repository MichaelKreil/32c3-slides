var fs = require('fs');
var path = require('path');
var async = require('async');
var config = require(path.resolve(__dirname, '../config.js'));
var videolist = require(path.resolve(__dirname, '../modules/videolist.js'));
var network = require(path.resolve(__dirname, '../modules/network.js'));
var videoprocess = require(path.resolve(__dirname, '../modules/videoprocess.js'));

network.getJSON('https://streaming.media.ccc.de/configs/conferences/32c3/vod.json', function (entries) {
	var todos = [];
	entries.forEach(function (entry) {
		if (entry.status != 'recorded') return;

		var video = videolist.get(entry.id);
		video.filename = path.resolve(config.videoFolder, entry.id+'.mp4');
		video.url = 'http:'+entry.mp4;
		videolist.set(video.id, video);

		if (fs.existsSync(video.filename) && video.downloaded) return;
		todos.push(video);
	})
	fetchVideos(todos);
})

function fetchVideos(videos) {
	async.eachLimit(
		videos,
		1,
		function (video, callback) {
			network.downloadFile(video.url, video.filename, function (finished, progress) {
				if (finished) {
					videolist.set(video.id, {downloaded:true});
					callback();
				} else {
					console.log('   ' + (100*progress).toFixed(1) + '%');
				}
			})
		},
		scanVideos
	)
}

function stripVideos() {
	async.eachLimit(
		videolist.getList().filter(function (v) { return !v.stripped }),
		1,
		function (video, cb) {
			console.log('strip '+video.id);
			videoprocess.stripVideo(video, cb);
		}
	)
}

