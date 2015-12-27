var fs = require('fs');
var path = require('path');
var async = require('async');
var config = require('../config.js');
var URL = require('url');
var http = require('http');
var https = require('https');

var videoList = new VideoList();

getJSON('https://streaming.media.ccc.de/configs/conferences/32c3/vod.json', function (videos) {
	//console.dir(videos, {colors:true});

	var todos = [];
	videos.forEach(function (video) {
		if (video.status != 'recorded') return;
		var filename = path.resolve(config.videoFolder, video.id+'.mp4');
		if (fs.existsSync(filename)) return;
		todos.push({id: video.id, filename: filename, url: 'http:'+video.mp4});
	})
	fetchVideos(todos);
})

function fetchVideos(videos) {
	async.eachLimit(videos, 1, function (video, callback) {
		videoList.set(video.id, video);

		download(video.url, video.filename, function (finished, progress) {
			if (finished) {
				video.status = 'downloaded';
				videoList.set(video.id, video);
				callback();
			} else {
				console.log((100*progress).toFixed(1));
			}
		})
	})
}

function getJSON(url, cb) {
	var req = getRequest(url);
	req.on('response', function (res) {
		var data = '';
		res.on('data', function(chunk) { data += chunk; });
		res.on('end', function() { cb(JSON.parse(data)); })
		res.on('error', function(e) { console.error('Got error: ' + e.message); });
	});
}

function download(url, filename, cb) {
	console.log('Trying to download "'+url+'"');

	var req = getRequest(url);
	req.on('response', function (res) {
		if (res.statusCode == 302) {
			console.log('redirect "'+url+'" => "'+res.headers.location+'"');
			download(res.headers.location, filename, cb);
			return;
		}

		var maxSize = parseInt(res.headers['content-length'], 10);
		var size = 0;

		var interval = setInterval(function () {
			cb(false, size/maxSize);
		}, 5000)

		res.on('data', function (chunk) {
			size += chunk.length;
		})

		res.on('end', function () {
			clearInterval(interval);
			cb(true, 1);
		})

		res.pipe(fs.createWriteStream(filename));
	})
}

function getRequest(url) {
	var options = URL.parse(url);
	options.headers = {
		'Accept-Encoding':'identity',
		'Accept-Language':'en-US,en',
		'User-Agent':'Michael (32c3@michael-kreil.de)'
	};

	var protocol = false;
	switch (options.protocol) {
		case 'http:':  protocol = http;  break;
		case 'https:': protocol = https; break;
	}

	var req = protocol.request(options);
	req.on('error', function(e) { console.error('Got error: ' + e.message); });
	req.end();

	return req;
}

function protocol(url) {
}

function VideoList() {
	var list = {};
	if (fs.existsSync(config.statusFile)) list = JSON.parse(fs.readFileSync(config.statusFile, 'utf8'));
	var me = {
		set: function (id, newObj) {
			var obj = list[id] || (list[id] = {});
			Object.keys(newObj).forEach(function (key) {
				obj[key] = newObj[key];
			})

			me.save();
		},
		save: function () {
			fs.writeFileSync(config.statusFile, JSON.stringify(list, null, '\t'), 'utf8');
		}
	}
	return me;
}


