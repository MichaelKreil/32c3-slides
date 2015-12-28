var fs = require('fs');
var path = require('path');
var async = require('async');
var config = require(path.resolve(__dirname, '../config.js'));
var videolist = require(path.resolve(__dirname, '../modules/videolist.js'));
var network = require(path.resolve(__dirname, '../modules/network.js'));
var videoprocess = require(path.resolve(__dirname, '../modules/videoprocess.js'));

var sessions = {};

async.series([
	getSessions,
	getVideos,
	stripVideos
], function () {
	console.log('finished');
});



function getSessions(cb) {
	network.getJSON('http://data.conference.bits.io/data/32c3/sessions.json', function (entries) {
		entries.forEach(function (entry) {
			var id = entry.id.match(/^32c3-([0-9]{4})$/);
			if (!id) return;
			id = id[1];
			sessions[id] = entry;
		})
		cb();
	})
}

function getVideos(cb) {
	network.getHTMLLinks('http://berlin.ftp.media.ccc.de/congress/32C3/h264-hd/', function (entries) {
		var todos = [];

		entries.forEach(function (entry) {
			var video = videolist.get(entry.id);
			video.filename = path.join(config.videoFolder, entry.id+'.mp4');
			video.url = entry.url;
			videolist.set(video.id, video);

			if (fs.existsSync(path.resolve(config.mainFolder, video.filename)) && video.downloaded) return;
			todos.push(video);
		})
		
		async.eachLimit( todos,	1,
			function (video, callback) {
				network.downloadFile(video, function (finished, progress) {
					video.downloaded = true;
					videolist.set(video.id, video);
					callback();
				})
			},	cb
		)
	})
}

function stripVideos() {
	async.eachLimit(
		videolist.getList().filter(function (v) { return !v.stripped }),
		1,
		function (video, cb) {
			console.log('strip '+video.id);
			videoprocess.stripVideo(video, function () {
				video.stripped = true;
				videolist.set(video.id, video);
				cb()
			});
		}
	)
}

