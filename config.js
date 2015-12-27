var path = require('path');

module.exports = {
	statusFile:  path.resolve(__dirname, 'data/videos.json'),
	videoFolder: path.resolve(__dirname, 'data/videos'),
	stripFolder: path.resolve(__dirname, 'data/strips')
}