var fs = require('fs');
var path = require('path');
var async = require('async');
var mustache = require('mustache');
var config = require(path.resolve(__dirname, '../config.js'));
var child_process = require('child_process');

var sessionTemplate = fs.readFileSync(path.resolve(config.mainFolder, 'templates/session.html'), 'utf8');

function generateSession(video, session, cb) {
	var segments = fs.readFileSync(path.resolve(config.mainFolder, video.segmentFilename));
	segments = JSON.parse(segments);

	async.parallel([
		generateJPEGs,
		generateThumbnails,
		//generateZIP,
		//generatePDF,
		generateHTML
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

	function generateThumbnails(cb) {
		if (video.hasWebThumbs) {
			cb();
			return;
		}

		console.log('   generate Thumbs')

		var args = [
			path.resolve(config.mainFolder, config.pngFolder, video.id)+'/%d.png[0-'+(segments.length-1)+']',
			'-strip',
			'-interlace', 'Plane',
			'-quality', '90%',
			'-geometry', '256x144+0+0',
			'-tile', '8x',
			ensureFolder(path.resolve(config.mainFolder, config.thumbFolder, video.id)+'.jpg')
		]
		var im = child_process.spawn('montage', args);

		im.stderr.on('data', function (data) { console.log(data.toString())	})

		im.on('close', function (code, signal) {
			if (code != 0) return console.log('child process terminated due to receipt of code "'+code+'" and signal "'+signal+'"');
			video.hasWebThumbs = true;
			cb()
		});
	}

	function generateHTML(cb) {
		console.log('   generate HTML');

		var data = {
			title:session.title,
			thumb_url:'thumbs/'+video.id+'.jpg',
			slides:segments.map(function (segment) {
				return {
					jpeg: 'slides/'+video.id+'/'+segment.index+'.jpg',
					offset_x: (segment.index % 8)*128,
					offset_y: Math.floor(segment.index/ 8)*72
				}
			})
		}
		var html = mustache.render(sessionTemplate, data);
		fs.writeFileSync(path.resolve(config.mainFolder, config.webFolder)+'/'+video.id+'.html', html, 'utf8');
		cb();
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

