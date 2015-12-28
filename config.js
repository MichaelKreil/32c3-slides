var path = require('path');

module.exports = {
	statusFile:    path.resolve(__dirname, 'data/videos.json'),
	mainFolder:    __dirname,
	videoFolder:   'data/videos',
	stripFolder:   'data/strips',
	segmentFolder: 'data/segments',
	pngFolder:     'data/slides/png',
	jpgFolder:     'web/slides/',
	thumbFolder:   'web/thumbs/'
}