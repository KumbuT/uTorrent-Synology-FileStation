var https = require('https');
var path = require('path');
var fs = require('fs');
var winston = require('winston');
var fileWatcher = require('./fileWatcher.js');
var ds = require('./synoFileStation.js');
var uTorrentClient = require('./uTorrent.js');
var config = require('./config.js');
var redisDb = require('./cache.js');

let sid;
let io;
let myServer;
let torrentFiles = [];
let torrentQueue = [];
let queue = [];
let myRedisClient;
let logger;

/**
 * cleanup
 */

function cleanUp() {
    console.log('Cleaning up before exiting...');
    if (myRedisClient) {
        myRedisClient.flushall(
            (err, reply) => {
                if (err) {
                    console.error(err);
                    return null;
                } else {
                    console.info(`REDIS: Flushed all connections`);
                }
                process.exit(2);
            });
    }
}

var myCleanUp = require('./cleanUp.js').Cleanup(cleanUp);

/**
 * Instantiate Logger
 */
logger = new(winston.Logger)({
    transports: [
        new(winston.transports.File)({
            name: 'file-logger',
            filename: 'syno-ds-xfer.log',
            level: 'debug'
        }),
        new(winston.transports.File)({
            filename: 'exceptions.log',
            handleExceptions: true,
            humanReadableUnhandledException: true
        }),
        new(winston.transports.Console)()
    ]
});

/**
 * Instantiate REDIS
 */



redisDb.create().then(
    (client) => {
        myRedisClient = client;
        myRedisClient.flushall((err, reply) => {
            console.info(`REDIS: Flushed All`);
        });
    }).catch((err) => {
    logger.debug(err);
});


/**
 * Instantiate File Watcher
 */

let watcher = fileWatcher.startWatching();
watcher.on("add", filePath => {
    console.log(`File ${filePath} has been added`);
    queue.push(filePath);
    emitEvent(' File ' + path.basename(filePath) + ' added at path ' + filePath, false);
    emitFileQueue();
}).on('unlink', filePath => {
    console.log(`File ${filePath} has been deleted`);
    if (queue.indexOf(filePath) > -1) {
        queue.splice(queue.indexOf(filePath), 1);
        emitEvent('File ' + path.basename(filePath) + ' removed at path ' + filePath, false);
        emitFileQueue();
    }
}).on('addDir', dirPath => {
    console.log(`Directory ${dirPath} has been added`);
    emitEvent('Directory ' + path.basename(dirPath) + ' added at path ' + dirPath, false);
    emitFileQueue();
});

let UTorrentCallback = function () {
    uTorrentClient.login().then((token) => {
        emitUtStatus([{
            online: 'Online'
        }]);
        uTorrentClient.listTorrents(token).then((res) => {
            torrentQueue = JSON.parse(res);
            torrentQueue.torrents.map((cur, index, torrents) => {
                uTorrentClient.listFilesForTorrent(token, cur[0]).then((files) => {
                    //console.log(`uTorrent: Files for torrent ${cur[0]}: ${files}`);
                    files = JSON.parse(files);
                    let pos = torrentFiles.map((torrent) => {
                        return torrent.files[0];
                    }).indexOf(files.files[0]);
                    if (pos > -1) {
                        torrentFiles[pos] = files;
                    } else {
                        torrentFiles.push(files);
                    }
                    emitTorrentQueue();
                }, (err) => {
                    console.log(`uTorrent: An error occurred - ${err}`);
                });
                if (cur[21].includes('Seeding')) {
                    uTorrentClient.removeTorrent(token, cur[0]).then((res) => {
                        console.log(`uTorrent:  Successfully removed torrent ${cur[2]}`);
                        let pos = torrentFiles.map((torrent) => {
                            return torrent.files[0];
                        }).indexOf(cur[0]);
                        processTorrent(cur, torrentFiles[pos]);
                    }, (err) => {
                        console.error(`uTorrent:  Failed to remove torrent ${cur[2]}`);
                    });
                }
            });
        }, (err) => {
            console.log(`uTorrent could not be reached because ${err.message}`);
            emitEvent("uTorrent could not be reached because " + err.message, true);
        });
    }, (err) => {
        console.error(`uTorrent could not be reached because: ${err}`);
        if (err === "uTorrent API returned status code : 400") {
            emitEvent("uTorrent could not be reached because " + err, true);
        }
        emitUtStatus([{
            online: 'Offline'
        }]);
    });
};
let torrentCheckerTimer = setInterval(UTorrentCallback, 10000);

/**
 * processing torrent after completion of download
 */
let processTorrent = function (torrent, filesList) {
    ds.auth('login')
        .then((sid) => {
            console.log(`Logged into DS with sid ${sid}`);
            emitEvent('Logged into DS with ID:' + sid, false);
            filesList.files[1].map((file) => {
                if (file[3] > 0) {
                    let dsPath = helper.resolveFileTypeToDsPath(file[0]);
                    if (typeof dsPath === 'undefined') {
                        return;
                    }
                    let pos = queue.map((filePath) => {
                        return path.basename(filePath);
                    }).indexOf(file[0]);
                    if (pos === -1) {
                        return;
                    }
                    require('./mediaInfo.js').getMovieByKeyword(torrent[2])
                        .then((fileName) => {
                            //path.relative(config.watchPath, queue[pos]).replace(/\\/g, '/')
<<<<<<< HEAD
                            //let folderName = path.basename(queue[pos], path.extname(queue[pos]));
                            ds.uploadFile(queue[pos], dsPath + fileName)
=======
                            let folderName = path.basename(queue[pos], path.extname(queue[pos]));
                            ds.uploadFile(queue[pos], dsPath + folderName + "/" + fileName)
>>>>>>> b2dfd3f58bdc32686cf7da00af7745cf1c511ee4
                                .then((res) => {
                                    emitEvent('Uploaded file ' + file[0], false);
                                    helper.removeFileAfterUpload(queue[pos]);
                                }, (err) => {
                                    console.error(`Failed to upload file: ${file} with message ${JSON.stringify(err)}`);
                                    emitEvent('Failed to upload file:' + file + 'with message' + JSON.stringify(err), true);
                                });
                        }).catch((err) => {
                            console.error(err);
                        });
                }
            });

        }, (err) => {
            err = JSON.parse(err);
            console.error(`Could not login. Error: ${err.error.code} - ${JSON.stringify(err.error)}`);
        });
};

/**
 * All Socket Emit Events to follow
 */
let emitTorrentQueue = function () {
    let data = [];
    try {
        torrentQueue.torrents.map((torrent, index, torrents) => {
            let tmp = {
                QueueOrder: torrent[17],
                Name: torrent[2],
                Status: helper.resolveStatus(torrent[1]),
                Hash: torrent[0],
                ETA: torrent[10],
                DownSpeed: torrent[9],
                UpSpeed: torrent[8],
                nested: []
            };
            let pos = torrentFiles.map((tor) => {
                return tor.files[0];
            }).indexOf(torrent[0]);
            if (pos > -1) {
                torrentFiles[pos].files[1].map((file, index, files) => {
                    let fileTmp = {
                        FileName: file[0],
                        FileSize: file[1],
                        Downloaded: file[2],
                        Priority: file[3]
                    };
                    tmp.nested.push(fileTmp);
                });
            }
            data.push(tmp);
        });
        if (myRedisClient) {
            myRedisClient.LPUSH("torrentList", JSON.stringify(data), (err, reply) => {
                if (err) {
                    console.error(err);
                } else {
                    //do nothing
                }
            });
        }
        io.emit('torrentQueue', data);
    } catch (err) {
        emitEvent(err.toString(), true);
    }
};

let emitFileQueue = function () {
    let data = [];
    queue.map((file, index, files) => {
        let tmp = {
            fileName: path.basename(file),
            filePath: file
        };
        data.push(tmp);
    });
    if (myRedisClient) {
        myRedisClient.LPUSH("fileList", JSON.stringify(data), (err, reply) => {
            if (err) {
                console.error(err);
            } else {
                //do nothing
            }
        });
    }
    io.emit('fileQueue', data);
};

let emitEvent = function (eventString, isError) {
    //can emit error or regular event
    let data = {
        "dateTime": helper.getDateTime().toString(),
        "message": eventString.toString(),
        "isError": isError ? 'Error' : 'Info'
    };
    if (myRedisClient) {
        myRedisClient.LPUSH("eventList", JSON.stringify(data), (err, reply) => {
            if (err) {
                console.error(err);
            } else {
                //do nothing
            }
        });
    }
    io.emit('hearYe', data);
};

let emitUtStatus = function (data) {
    io.emit('uTorrentHealth', data);
};

let replayEvents = (socket, listName, eventName) => {
    myRedisClient.lrange(listName, 0, -1, (err, reply) => {
        if (err) {
            console.error(err);
        } else {
            var list = reply;
            list.forEach(function (data) {
                console.info(`Emitting to socket: ${socket.id} -data ${data}`);
                io.sockets.in(socket.id).emit(eventName, JSON.parse(data));
            }, this);
        }
    });
};
/**
 * Helper functions
 */

let helper = {
    getDateTime: function () {
        var date = new Date();
        var hour = date.getHours();
        hour = (hour < 10 ? "0" : "") + hour;
        var min = date.getMinutes();
        min = (min < 10 ? "0" : "") + min;
        var sec = date.getSeconds();
        sec = (sec < 10 ? "0" : "") + sec;
        var year = date.getFullYear();
        var month = date.getMonth() + 1;
        month = (month < 10 ? "0" : "") + month;
        var day = date.getDate();
        day = (day < 10 ? "0" : "") + day;
        return year + ":" + month + ":" + day + ":" + hour + ":" + min + ":" + sec;
    },
    resolveStatus: function (status) {
        let statusMsg = [];
        if (status & 1) {
            statusMsg.push('Started');
        }
        if (status & 2) {
            statusMsg.push('Checking');
        }
        if (status & 4) {
            statusMsg.push('Start after Check');
        }
        if (status & 8) {
            statusMsg.push('Checked');
        }
        if (status & 16) {
            statusMsg.push('Error');
        }
        if (status & 32) {
            statusMsg.push('Paused');
        }
        if (status & 64) {
            statusMsg.push('Queued');
        }
        if (status & 128) {
            statusMsg.push('Loaded');
        }
        return statusMsg.join();
    },
    resolveFileTypeToDsPath: function (filePath) {
        let video = ['.mp4', '.mkv', '.mpeg', '.mov', '.avi', '.srt'];
        let audio = ['.mp3', '.flac', '.m4a'];
        let fileProp = path.parse(filePath);
        if (video.includes(fileProp.ext)) {
            return '/video/Movies/';
        }
        if (audio.includes(fileProp.ext)) {
            return '/music/';
        }
        return undefined;
    },
    removeFileAfterUpload: function (filePath) {
        try {
            fs.unlink(filePath, (err) => {
                if (err) {
                    emitEvent('Unable to remove file ' + path.basename(filePath), true);
                } else {
                    emitEvent('Removed file' + path.basename(filePath), false);
                }
            });
        } catch (err) {
            //log error
        }
    }
};

module.exports.setIo = function (socket) {
    io = socket;
    io.on("connection", function (socket) {
        console.info(`A user connected: ${socket.client.id}`);
        replayEvents(socket, "eventList", "hearYe");
        replayEvents(socket, "torrentList", "torrentQueue");
        replayEvents(socket, "fileList", "fileQueue");
    });
};