var fs = require('fs');
var path = require('path');
var config = require('../config.js');
var child_process = require('child_process');

var width = 16, height = 9, frameSize = width*height*3;


// Load mask
var maskBin = fs.readFileSync(path.resolve(__dirname, 'mask.raw'));
var mask = [], maskSum = 0;
for (var i = 0; i < frameSize; i++) {
	mask[i] = maskBin.readUInt8(i)/255;
	maskSum += mask[i];
}


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

function segmentStrip(video, cb) {
	var windowSize = 3;
	var n = 2*windowSize+1;
	var slideThreshold = 0.05;
	var dupThreshold = 2.0;
	var minLength = 50;

	var data = fs.readFileSync(path.resolve(config.mainFolder, video.stripFilename));
	var frameCount = data.length/frameSize;

	// Find segments
	var segments = [];
	var t0 = 0;
	for (var i = windowSize; i < frameCount-windowSize-1; i++) {
		var sumDif = 0;
		for (var b = 0; b < frameSize; b++) {
			var s1 = 0, s2 = 0;
			for (var w = -windowSize; w <= windowSize; w++) {
				var v = data.readUInt8((i + w)*frameSize + b);
				s1 += v;
				s2 += v*v
			}
			sumDif += (s2/n-sqr(s1/n))*mask[b];
		}
		sumDif /= maskSum;
		if (sumDif > slideThreshold) {
			if (i - t0 > minLength+2) {
				segments.push({start:t0+1, end:i-1});
			}
			t0 = i;
		}
	}

	// Generate vector
	segments.forEach(function (segment) {
		var img = new Array(frameSize);
		var tMid = Math.round((segment.start + segment.end)/2);
		for (var b = 0; b < frameSize; b++) img[b] = data.readUInt8(tMid*frameSize + b);
		segment.img = img;
		segment.duration = segment.end - segment.start;
	})

	// Find duplicates
	for (var i = 0; i < segments.length; i++) {
		if (segments[i].delete) continue;

		for (var j = i+1; j < segments.length; j++) {
			if (segments[i].delete) break;
			if (segments[j].delete) continue;

			var diff = 0;
			for (var b = 0; b < frameSize; b++) diff += mask[b]*sqr(segments[i].img[b] - segments[j].img[b]);
			diff /= maskSum

			if (diff < dupThreshold) {
				if (segments[i].duration < segments[j].duration) {
					segments[i].delete = true;
				} else {
					segments[j].delete = true;
				}
			}
		}
	}

	// remove duplicates
	segments = segments.filter(function (s) { return !s.delete });

	// cleanup results
	segments = segments.map(function (s,i) {
		return {
			index:    i,
			start:    s.start,
			end:      s.end,
			duration: s.duration
		}
	})

	video.segmentFilename = path.join(config.segmentFolder, video.id+'.json');

	fs.writeFileSync(
		path.resolve(config.mainFolder, video.segmentFilename),
		JSON.stringify(segments, null, '\t'),
		'utf8'
	);

	cb()
}

function sqr(x) {
	return x*x
}


module.exports = {
	stripVideo: stripVideo,
	segmentStrip: segmentStrip
}