var fs = require('fs');
var path = require('path');
var async = require('async');
var mustache = require('mustache');
var config = require(path.resolve(__dirname, '../config.js'));
var child_process = require('child_process');

var sessionTemplate = fs.readFileSync(path.resolve(config.mainFolder, 'templates/session.html'), 'utf8');
var indexTemplate = fs.readFileSync(path.resolve(config.mainFolder, 'templates/index.html'), 'utf8');

function generateSession(video, session, cb) {
	var segments = fs.readFileSync(path.resolve(config.mainFolder, video.segmentFilename));
	segments = JSON.parse(segments);

	async.series([
		generateJPEGs,
		generateThumbnails,
		generateZIP,
		generatePDF,
		generateJSON,
		generateHTML
	], cb)

	function generateJPEGs(cb) {
		if (segments.length == 0) video.hasWebJPEGs = true;
		if (video.hasWebJPEGs) {
			cb();
			return;
		}

		console.log('   generate JPEGs')

		var jpgFolder = path.resolve(config.mainFolder, config.jpgFolder, video.id);
		if (fs.existsSync(jpgFolder)) child_process.execSync('rm -r "'+jpgFolder+'"')

		var args = [
			'-strip',
			'-interlace', 'Plane',
			'-quality', '90%',
			path.resolve(config.mainFolder, config.pngFolder, video.id)+'/%d.png[0-'+(segments.length-1)+']',
			ensureFolder(jpgFolder+'/%d.jpg')
		]
		var im = child_process.spawn('convert', args);

		im.stderr.on('data', function (data) { console.log(data.toString())	})

		im.on('close', function (code, signal) {
			if (code != 0) return console.log('child process terminated due to receipt of code "'+code+'" and signal "'+signal+'"');
			video.hasWebJPEGs = true;
			cb()
		});
	}

	function generateZIP(cb) {
		if (segments.length == 0) video.hasWebZIP = true;
		if (video.hasWebZIP) {
			cb();
			return;
		}

		console.log('   generate ZIP')

		var args = [
			'-r',
			path.resolve(config.mainFolder, config.jpgFolder, video.id)+'.zip',
			path.resolve(config.mainFolder, config.jpgFolder, video.id)
		]
		var zip = child_process.spawn('zip', args);

		//zip.stdout.on('data', function (data) { console.log(data.toString())	})

		zip.on('close', function (code, signal) {
			//console.log('ping', code, signal);
			if (code != 0) return console.log('child process terminated due to receipt of code "'+code+'" and signal "'+signal+'"');
			video.hasWebZIP = true;
			cb()
		});
	}

	function generatePDF(cb) {
		if (segments.length == 0) video.hasWebPDF = true;
		if (video.hasWebPDF) {
			cb();
			return;
		}

		console.log('   generate PDF')

		var args = [
			path.resolve(config.mainFolder, config.jpgFolder, video.id)+'/%d.jpg[0-'+(segments.length-1)+']',
			'-strip',
			path.resolve(config.mainFolder, config.jpgFolder, video.id)+'.pdf'
		]
		var im = child_process.spawn('convert', args);

		im.stderr.on('data', function (data) { console.log(data.toString())	})

		im.on('close', function (code, signal) {
			if (code != 0) return console.log('child process terminated due to receipt of code "'+code+'" and signal "'+signal+'"');
			video.hasWebPDF = true;
			cb()
		});
	}

	function generateJSON(cb) {
		if (video.hasWebJSON) {
			cb();
			return;
		}

		console.log('   generate JSON')

		fs.writeFileSync(
			path.resolve(config.mainFolder, config.jpgFolder, video.id)+'.json',
			JSON.stringify(segments, null, '\t'),
			'utf8'
		)

		video.hasWebJSON = true;
		cb();
	}

	function generateThumbnails(cb) {
		if (segments.length == 0) video.hasWebThumbs = true;
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
			description:session.description,
			speakers:session.speakers.map(function (s) { return s.name }).join(', '),
			thumb_url:'thumbs/'+video.id+'.jpg',
			id:video.id,
			noslides: (segments.length == 0),
			slides:segments.map(function (segment) {
				return {
					jpeg: 'slides/'+video.id+'/'+segment.index+'.jpg',
					offset_x: (segment.index % 8)*128,
					offset_y: Math.floor(segment.index/ 8)*72,
					time_start: ft(segment.start),
					time_end:   ft(segment.end)
				}
			})
		}
		var html = mustache.render(sessionTemplate, data);
		fs.writeFileSync(path.resolve(config.mainFolder, config.webFolder)+'/'+video.id+'.html', html, 'utf8');
		cb();

		function ft(frames) {
			var t = Math.round(frames/25);
			var s = t % 60;
			var m = Math.floor(t / 60) % 60;
			var h = Math.floor(t / 3600);
			return [
				h,
				(100+m).toFixed(0).substr(1),
				(100+s).toFixed(0).substr(1)
			].join(':')
		}
	}
}

function generateIndex(videos, sessions, cb) {
	var rooms = {};
	var width = 160, zoomHeight = 1/60000;

	videos.forEach(function (video) {
		var session = sessions[video.id];
		session.video = video;
		rooms[session.location.label_en] = true;
	})

	rooms = Object.keys(rooms);
	var temp = rooms.sort();
	rooms = {};
	temp.forEach(function (room, index) { rooms[room] = index });

	var sessionList = [];
	var startTime = (new Date('2015-12-27T04:00:00.000Z')).getTime();
	var maxHeight = 0;
	Object.keys(sessions).forEach(function (key) {
		session = sessions[key];
		session.room = session.location.label_en;
		if (rooms[session.room] === undefined) return;

		session.begin  = (new Date(session.begin)).getTime()-startTime;
		session.end    = (new Date(session.end  )).getTime()-startTime;
		session.left   = rooms[session.room]*width;
		session.top    = zoomHeight*(session.begin);
		session.height = zoomHeight*(session.end-session.begin)-1;
		session.width  = width-10;
		session.active = (session.video != undefined);

		var day = parseInt(session.day.id.split('-').pop(), 10);
		sessionList.push(session);

		if (maxHeight < session.top+session.height) maxHeight = session.top+session.height;
	})

	var days = [];
	for (var i = 0; i < 4; i++) {
		days.push({
			top: zoomHeight*((new Date('2015-12-'+(27+i)+'T06:00:00.000Z')).getTime() - startTime),
			width: width*Object.keys(rooms).length,
			text: 'Day '+(i+1)
		})
	}

	var data = { sessions:sessionList, maxHeight:maxHeight, days:days };
	var html = mustache.render(indexTemplate, data);
	fs.writeFileSync(path.resolve(config.mainFolder, config.webFolder)+'/index.html', html, 'utf8');
	cb();
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
	generateSession: generateSession,
	generateIndex: generateIndex
}

