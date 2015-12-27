var fs = require('fs');
var config = require('../config.js');

var list = {};

if (fs.existsSync(config.statusFile)) list = JSON.parse(fs.readFileSync(config.statusFile, 'utf8'));

var me = {
	get: function (id) {
		if (!list[id]) list[id] = {id:id};
		return list[id];
	},
	set: function (id, newObj) {
		var obj = list[id] || (list[id] = {});
		Object.keys(newObj).forEach(function (key) {
			obj[key] = newObj[key];
		})

		me.save();
	},
	save: function () {
		fs.writeFileSync(config.statusFile, JSON.stringify(list, null, '\t'), 'utf8');
	}
}

module.exports = me;


