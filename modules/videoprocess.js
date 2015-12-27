var fs = require('fs');
var path = require('path');
var config = require('../config.js');
var child_process = require('child_process');

var width = 16, height = 12;


function stripVideo(video, cb) {
	video.stripFilename = path.resolve(config.stripFolder, entry.id+'.raw');
	var ffmpeg = child_process.spawn(
		'ffmpeg',
		[
			'-i', video.filename,
			'-an',
			'-vf', '"scale='+width+':'+height+'"',
			'-pix_fmt', 'rgb24',
			'-f', 'rawvideo',
			'-vcodec', 'rawvideo',
			video.stripFilename
		]
	);
	ffmpeg.on('close', function (code, signal) {
		console.log('child process terminated due to receipt of code "'+code+'" and signal "'+signal+'"');
		cb()
	});
}


module.exports = {

}