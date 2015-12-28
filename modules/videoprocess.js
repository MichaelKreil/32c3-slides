var fs = require('fs');
var path = require('path');
var config = require('../config.js');
var child_process = require('child_process');

var width = 16, height = 12;


function stripVideo(video, cb) {
	video.stripFilename = path.join(config.stripFolder, video.id+'.raw');

	var args = [
		'-i', path.resolve(config.mainFolder, video.filename),
		'-y',
		'-an',
		'-vf', 'scale='+width+':'+height,
		'-pix_fmt', 'rgb24',
		'-f', 'rawvideo',
		'-vcodec', 'rawvideo',
		path.resolve(config.mainFolder, video.stripFilename)
	]
	var ffmpeg = child_process.spawn('ffmpeg', args);

	var duration = 3600;
	var progress = 0;
	//Duration: 00:50:41.85 
	//not to do network security.
  //Duration: 00:50:41.85, start: 0.042667, bitrate: 1064 kb/s

	//console.log(args.join(' '));

	//ffmpeg.stdout.on('data', function (data) { console.log('stdout: ' + data); });
	ffmpeg.stderr.on('data', function (data) {
		data = data.toString();
		var m = data.match(/Duration: (\d+):(\d+):(\d+.\d+)/);
		if (m) {
			duration = parseFloat(m[1])*3600 + parseFloat(m[2])*60 + parseFloat(m[3]);
		}
		var m = data.match(/time=(\d+):(\d+):(\d+.\d+)/);
		if (m) {
			progress = parseFloat(m[1])*3600 + parseFloat(m[2])*60 + parseFloat(m[3]);
			progress = 100*progress/duration;
		}
	});

	var interval = setInterval(function () {
		console.log('   ' + progress.toFixed(1) + '%');
	}, 5000)

	ffmpeg.on('close', function (code, signal) {
		clearInterval(interval);
		if (code != 0) return console.log('child process terminated due to receipt of code "'+code+'" and signal "'+signal+'"');
		video.stripped = true;
		cb()
	});
}


module.exports = {
	stripVideo: stripVideo
}