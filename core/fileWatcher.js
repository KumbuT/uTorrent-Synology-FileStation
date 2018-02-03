var chokidar = require('chokidar');
var timers = require('timers');
var fs = require('fs');
var path = require('path');
var config = require('./config.js');

var fileArray = [];

var filePurge = {
    startWatching: function () {
        var watcher = chokidar.watch(config.watchPath, {
            usePolling: false,
            ignoreInitial: true,
            depth: 2,
            awaitWriteFinish: true,
            ignorePermissionErrors: true,
            atomic: true
        });
        console.log('Started Watching Folder ' + config.watchPath);
        return watcher;
    }
};

module.exports = filePurge;