var path = require('path');

module.exports = {
	statusFile: path.resolve(__dirname, 'videos.json'),
	videoFolder: path.resolve(__dirname, 'videos'),
	stripFolder: path.resolve(__dirname, 'strips')
}