var fs = require('fs');
var path = require('path');
var async = require('async');
var config = require(path.resolve(__dirname, '../config.js'));
var child_process = require('child_process');

function generateSession(video, session, cb) {
	var segments = fs.readFileSync(path.resolve(config.mainFolder, video.segmentFilename));
	segments = JSON.parse(segments);

	async.parallel([
		generateJPEGs//,
		//generateZIP,
		//generatePDF,
		//generateHTML
	], cb)

	function generateJPEGs(cb) {
		if (video.hasWebJPEGs) {
			cb();
			return;
		}

		console.log('   generate JPEGs')

		var args = [
			'-strip',
			'-interlace', 'Plane',
			'-quality', '90%',
			path.resolve(config.mainFolder, config.pngFolder, video.id)+'/%d.png[0-'+(segments.length-1)+']',
			ensureFolder(path.resolve(config.mainFolder, config.jpgFolder, video.id)+'/%d.jpg')
		]
		var im = child_process.spawn('convert', args);

		im.stderr.on('data', function (data) { console.log(data.toString())	})

		im.on('close', function (code, signal) {
			if (code != 0) return console.log('child process terminated due to receipt of code "'+code+'" and signal "'+signal+'"');
			video.hasWebJPEGs = true;
			cb()
		});
	}
}

function ensureFolder(file) {
	var folder = path.dirname(file);
	if (!fs.existsSync(folder)) {
		ensureFolder(folder);
		fs.mkdirSync(folder);
	}
	return file;
}

module.exports = {
	generateSession: generateSession
}

