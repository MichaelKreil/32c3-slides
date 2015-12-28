var fs = require('fs');
var URL = require('url');
var path = require('path');
var http = require('http');
var https = require('https');
var config = require('../config.js');

function getJSON(url, cb) {
	var req = getRequest(url);
	req.on('response', function (res) {
		var data = '';
		res.on('data', function(chunk) { data += chunk; });
		res.on('end', function() { cb(JSON.parse(data)); })
		res.on('error', function(e) { console.error('Got error: ' + e.message); });
	});
}

function getHTMLLinks(baseUrl, cb) {
	var req = getRequest(baseUrl);
	req.on('response', function (res) {
		var data = '';
		res.on('data', function(chunk) { data += chunk; });
		res.on('end', function() {
			data = data.match(/href=\".*?\"/g);
			data = data.map(function (entry) {
				var url = entry.match(/href=\"(.*?)\"/)[1];
				if (url[0] == '.') return false;
				var id = url.match(/^32c3-([0-9]{4})-/)[1];
				return {
					url: URL.resolve(baseUrl, url),
					id: id
				}
			})
			data = data.filter(function (entry) { return entry });
			cb(data);
		})
		res.on('error', function(e) { console.error('Got error: ' + e.message); });
	});
}

function downloadFile(video, cb) {
	var url = video.url;
	var filename = path.resolve(config.mainFolder, video.filename);
	console.log('Trying to download "'+url+'"');

	var req = getRequest(url);
	req.on('response', function (res) {
		if (res.statusCode == 302) {
			console.log('redirect "'+url+'" => "'+res.headers.location+'"');
			downloadFile(res.headers.location, filename, cb);
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

module.exports = {
	getJSON: getJSON,
	getHTMLLinks: getHTMLLinks,
	downloadFile: downloadFile
}