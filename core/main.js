var path = require('path');
var fs = require('fs');
var winston = require('winston');
var fileWatcher = require('./fileWatcher.js');
var ds = require('./synoFileStation.js');
var uTorrentClient = require('./uTorrent.js');
var config = require('./config.js');
var redisDb = require('./cache.js');
var FTP = require('./ftpClient.js');
const { emit } = require('process');


var uTorrentBuildNum = 0; //default - invalid state

/**
 * Instantiate Logger
 */
const logger = winston.createLogger({
    level: 'debug',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.prettyPrint(),
        winston.format.splat(),
        winston.format.printf(info => `[${info.timestamp}] [${info.level}] : ${info.message}`)
    ),
    transports: [
        new winston.transports.File({
            filename: 'dsFileCopyEventsCombined.log',
            dailyRotateFile: {
                colorize: 'true',
                filename: 'dsFileCopyEventsCombined.log',
                datePattern: '.yyyy-MM-dd',
                maxsize: 20000
            }
        }),
        new winston.transports.Console()
    ],
    exceptionHandlers: [
        new winston.transports.File({
            filename: 'dsFileCopyExceptions.log',
            dailyRotateFile: {
                colorize: 'true',
                filename: 'dsFileCopyExceptions.log',
                datePattern: '.yyyy-MM-dd',
                maxsize: 20000
            }
        })
    ],
    exitOnError: true
});


let io;
let torrentFiles = [];
let torrentQueue = [];
let queue = [];
let myRedisClient;

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
                    logger.log({
                        level: 'error',
                        message: err
                    });
                    return null;
                } else {
                    logger.log({
                        level: 'info',
                        message: 'REDIS: Flushed all connections',
                    });
                }
                process.exit(2);
            });
    }
}

var myCleanUp = require('./cleanUp.js').Cleanup(cleanUp);

/**
 * Instantiate REDIS
 */



redisDb.create().then(
    (client) => {
        myRedisClient = client;
        myRedisClient.flushall((err, reply) => {
            logger.log({
                level: 'info',
                message: 'REDIS: Flushed all',
            });
        });
    }).catch((err) => {
        logger.debug(err);
    });



/**
 * Declare media file reader
 */

let readMediaFolder = () => {
    fs.readdir(config.mediaFolder, (err, list) => {
        if (err) {
            console.debug(err);
        } //to be implemented 
        let isDirectory = src => fs.lstatSync(src).isDirectory();
        list = list.map(name => path.join(config.mediaFolder, name)).filter(isDirectory);
        let tmpList = list.filter(x => !config.excludedMediaFolders.map(y => y.toLowerCase()).includes(x.toLowerCase()));
        if (tmpList.length > 0) {
            emitMediaFolders(tmpList);
        }
    });
};

// Init Call
readMediaFolder();

/**
 * Instantiate File Watcher
 */
let watcher = fileWatcher.startWatching(logger, config.watchPath);
watcher.on("add", filePath => {
    logger.log('info', 'File %s has been added', filePath);
    queue.push(filePath);
    emitEvent(' File ' + path.basename(filePath) + ' added at path ' + filePath, false);
    emitFileQueue();
}).on('unlink', filePath => {
    logger.log('info', 'File %s has been deleted', filePath);
    if (queue.indexOf(filePath) > -1) {
        queue.splice(queue.indexOf(filePath), 1);
        emitEvent('File ' + path.basename(filePath) + ' removed at path ' + filePath, false);
        emitFileQueue();
    }
}).on('addDir', dirPath => {
    logger.log('info', 'Folder %s has been added', dirPath);
    emitEvent('Directory ' + path.basename(dirPath) + ' added at path ' + dirPath, false);
    emitFileQueue();
});

/**
 * Media Folder Watcher
 */

let mediaFolderWatcher = fileWatcher.startWatching(logger, config.mediaFolder);

mediaFolderWatcher.on("add", filePath => {
    logger.log('info', 'File %s has been added', filePath);
    readMediaFolder();
}).on('unlink', filePath => {
    logger.log('info', 'File %s has been deleted', filePath);
    readMediaFolder();
}).on('addDir', dirPath => {
    logger.log('info', 'Folder %s has been added', dirPath);
    readMediaFolder();
}).on('unlinkDir', folderPath => {
    logger.log('info', 'Folder %s has been deleted', folderPath);
    readMediaFolder();
});

/**
 * 
 * @param {*} torrent 
 * @param {*} filesList 
 */

 let getSynoFSInfo =  function(){
    ds.getInfo(logger).then((res) => {
        //logger.log('info', res.data.hostname + " is online.");
        let synoStatus = [{
            status: "Online",
            hostname:  res.data.hasOwnProperty("hostname") ? res.data.hostname: "Unknown Host"
        }];
        emitSynoStatus(synoStatus);
    }, (err) => {
        let synoStatus = [{
            status: "Offline",
            hostname:  ""
        }];
        logger.log('info', "Diskstation is offline");
        emitSynoStatus(synoStatus);
    }).catch((err) => {
        logger.log('error', JSON.stringify(err));
        let synoStatus = [{
            status: "Offline",
            hostname:  ""
        }];
        emitSynoStatus(synoStatus);
    });
};

let UTorrentCallback = function () {
    uTorrentClient.login().then((token) => {
        if (uTorrentBuildNum == 0) {
            uTorrentClient.getSettings(token).then((status) => {
                // console.log(status);
                status = JSON.parse(status);
                uTorrentBuildNum = parseInt(status.build);
            }).catch((err) => {
                throw new Error(err);
            });
        }
        emitUtStatus([{
            online: 'Online',
            build: uTorrentBuildNum
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
                    logger.log('error', 'uTorrent: An error occurred - ', err);
                });
                if (cur[21].includes('Seeding')) {
                    uTorrentClient.removeTorrent(token, cur[0]).then((res) => {
                        logger.log('info', 'uTorrent:  Successfully removed torrent ', cur[2]);
                        let pos = torrentFiles.map((torrent) => {
                            return torrent.files[0];
                        }).indexOf(cur[0]);
                        processTorrent(cur, torrentFiles[pos]);
                    }, (err) => {
                        logger.log('error', 'uTorrent:  Failed to removed torrent ', cur[2]);
                    });
                }
            });
        }, (err) => {
            logger.log('info', 'uTorrent could not be reached because: %s', err ? err : "of unknown issues.");
            emitEvent("uTorrent could not be reached because " + err ? err.message : "of unknown issues.", true);
        });
    }, (err) => {
        logger.log('info', 'uTorrent could not be reached because: %s', err ? err : "of unknown issues.");
        if (err === "uTorrent API returned status code : 400") {
            emitEvent(`uTorrent could not be reached because ${err ? err : "of unknown issues."}`, true);
        }
        emitUtStatus([{
            online: 'Offline'
        }]);
    });
};

/**
 * All Timers
 */
let synoHeartBeat =  setInterval(getSynoFSInfo, 10000);
let torrentCheckerTimer = setInterval(UTorrentCallback, 1000);

/**
 * processing torrent after completion of download of a torrent
 * @param {*} torrent 
 * @param {*} filesList 
 */

let processTorrent = function (torrent, filesList) {
    try {
        filesList.files[1].map((file) => {
            if (file[3] > 0) {
                let dsPath = helper.resolveFileTypeToDsPath(file[0], torrent[11]);
                if (typeof dsPath === 'undefined') {
                    return;
                }
                let pos = queue.map((filePath) => {
                    return path.basename(filePath);
                }).indexOf(file[0]);
                if (pos === -1) {
                    logger.log('error', 'Couldn\'t find file %s in local queue', file[0]);
                    return;
                }
                require('./mediaInfo.js').getMovieByKeyword(torrent[2], torrent[11], file[0])
                    .then((fileName) => {
                        emitEvent("File name will be " + fileName, false);
                        logger.log('info', 'File will be named: %s', fileName);
                        //path.relative(config.watchPath, queue[pos]).replace(/\\/g, '/')
                        let folderName = fileName; //path.basename(queue[pos], path.extname(queue[pos]));
                        fileName = fileName + path.extname(queue[pos]);
                        ds.uploadFile(queue[pos], dsPath + folderName + "/" + fileName, logger)
                            .then((res) => {
                                emitEvent('Uploaded file ' + file[0], false);
                                logger.log('info', 'Uploaded file %s', file[0]);
                                helper.removeFileAfterUpload(queue[pos]);
                            }, (err) => {
                                logger.log('error', 'Failed to upload file %s with message ', file, err);
                                emitEvent('Failed to upload file:' + file + 'with message' + JSON.stringify(err), true);
                                emitEvent(`Attempting to FTP upload file: ${file}`);
                                if (torrent[11] && torrent[11].toLowerCase() == "tv") {
                                    folderName = torrent[2];
                                }
                                helper.ftpFileUpload(queue[pos], dsPath + folderName + "/" + fileName, logger).then(() => {
                                    logger.log('info', `FTP: Uploaded file ${path.basename(queue[pos])}`);
                                    emitEvent('FTP: Uploaded file ' + path.basename(queue[pos]) + ' successfully to ' + dsPath + folderName, false);
                                    helper.removeFileAfterUpload(queue[pos]);
                                }).catch((err) => {
                                    logger.log('error', `FTP: ${err.toString()}`);
                                    emitEvent("Attempting to move file to local DLNA folder", false);
                                    helper.moveFileToDLNAFolder(fileName, queue[pos]);
                                });
                            }).catch((err) => {
                                logger.log('error', err.toString());
                                helper.ftpFileUpload(queue[pos], dsPath + folderName + "/" + fileName, logger).then(() => {
                                    logger.log('info', `FTP: Uploaded file ${path.basename(queue[pos])}`);
                                    emitEvent('FTP: Uploaded file ' + path.basename(queue[pos]) + ' successfully to ' + dsPath + folderName, false);
                                    helper.removeFileAfterUpload(queue[pos]);
                                }).catch((err) => {
                                    logger.log('error', `FTP: ${err.toString()}`);
                                    emitEvent("Attempting to move file to local DLNA folder", false);
                                    helper.moveFileToDLNAFolder(fileName, queue[pos]);
                                });
                            });
                    }).catch((err) => {
                        logger.log('error', `Error at getMovieByKeyword() ${err}`);
                        emitEvent('Error' + err);
                    });
            }
        });
    } catch (err) {
        emitEvent("Unknown Error:" + err);
        logger.log('error', 'Unknown Error:', err);
    }
};

/**
 * All Socket Emit Events to follow
 */

let emitSynoStatus =  function(status){
        io.emit('synostatus', status);
};

let emitMediaFolders = function (mediaFoldersList) {
    let mediaFoldersJSON = [];
    mediaFoldersList.map((folder, i) => {
        mediaFoldersJSON.push({
            'id': i + 1,
            'folderName': folder
        });
    });
    io.emit('mediaFolders', mediaFoldersJSON);
};


let emitTorrentQueue = function () {
    let data = [];
    try {
        torrentQueue.torrents.map((torrent, index, torrents) => {
            let tmp = {
                id: index + 1,
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
                torrentFiles[pos].files[1].map((file, fileIndex, files) => {
                    let fileTmp = {
                        id: torrentQueue.torrents.length + "." + (fileIndex + 1),
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
            myRedisClient.DEL("torrentList", (err, reply) => {
                if (err) {
                    logger.log('error', err.toString());
                } else {
                    //logger.log('info', reply.toString());
                    myRedisClient.LPUSH("torrentList", JSON.stringify(data), (err, reply) => {
                        if (err) {
                            console.error(err);
                        } else {
                            //do nothing
                        }
                    });
                }
            });

        }
        io.emit('torrentQueue', data);
    } catch (err) {
        emitEvent(err.toString(), true);
        logger.log('error', err);
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
            logger.log('error', err);
        } else {
            var list = reply;
            list.forEach(function (data) {
                //console.info(`Emitting to socket: ${socket.id} -data ${data}`);
                io.sockets.in(socket.id).emit(eventName, JSON.parse(data));
            }, this);
            // }
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
    resolveFileTypeToDsPath: function (filePath, labels) {
        let video = ['.mp4', '.mkv', '.mpeg', '.mov', '.avi', '.srt'];
        let audio = ['.mp3', '.flac', '.m4a'];
        let fileProp = path.parse(filePath);
        if (video.includes(fileProp.ext)) {
            if (labels && labels.toLowerCase() == "tv") {
                return '/video/TV/';
            } else {
                return '/video/Movies/';
            }

        }
        if (audio.includes(fileProp.ext)) {
            return '/music/';
        }
        return undefined;
    },
    ftpFileUpload: function (file, destPath, logger) {
        FTP.retry += 1;
        return FTP.upload(logger, {
            'filePath': file,
            'destPath': destPath
        }, true);
    },
    moveFileToDLNAFolder: function (videoName, srcPath) {
        let dirPath = 'C://Users//apteja//Videos//' + videoName.replace(/[\\\/*:\?"]/gi, "");
        let dstPath;
        if (helper.resolveFileTypeToDsPath(srcPath) == '/video/Movies/') {
            dstPath = dirPath + "//" + videoName.replace(/[\\\/*:\?"]/gi, "") + path.parse(srcPath).ext;
        } else {
            dstPath = dirPath + "//" + path.basename(srcPath).replace(/[\\\/*:\?"]/gi, "");
        }
        if (!fs.existsSync(dirPath)) {
            fs.mkdir(dirPath, (err, folder) => {
                if (err) {
                    emitEvent('Failed to create a folder ' + JSON.stringify(err), true);
                    logger.log('error', 'Failed to create a folder %s because \n', dirPath, err);
                    throw err;
                }
            });
        }
        let rs = fs.createReadStream(srcPath);
        rs.on('error', (err) => {
            throw err;
        });

        let ws = fs.createWriteStream(dstPath);
        ws.on("error", function (err) {
            throw err;
        });
        ws.on("close", function (ex) {
            emitEvent('Copied file ' + dstPath, false);
            logger.log('info', 'Moved file %s to DLNA folder', dirPath);
            helper.removeFileAfterUpload(srcPath);
        });
        rs.pipe(ws);
    },
    removeFileAfterUpload: function (filePath) {
        try {
            fs.unlink(filePath, (err) => {
                if (err) {
                    emitEvent('Unable to remove file ' + path.basename(filePath), true);
                } else {
                    emitEvent('Removed file ' + path.basename(filePath), false);
                    fs.rmdir(path.parse(filePath).dir, (err) => {
                        if (err) {
                            emitEvent("Unable to remove the folder" + path.parse(filePath).dir + " from download location.", true);
                        } else {
                            emitEvent('Removed folder ' + path.parse(filePath).dir + " from download location", false);
                        }
                    });
                }
            });
        } catch (err) {
            //log error
            logger.log('error', err);
        }
    }
};

module.exports.setIo = function (mySocket) {
    io = mySocket;
    io.on("connection", function (socket) {
        console.info(`A user connected: ${socket.client.id}`);
        replayEvents(socket, "eventList", "hearYe");
        replayEvents(socket, "torrentList", "torrentQueue");
        replayEvents(socket, "fileList", "fileQueue");
        readMediaFolder();
        socket.on("delete-folder", function (rowObject) {
            //delete the folder and it's contents
            let row = JSON.parse(rowObject);
            let directory = row.folderName;
            try {
                fs.readdir(directory, (err, files) => {
                    if (err) {
                        emitEvent(err.toString(), true);
                        return;
                    }
                    for (let file of files) {
                        if (fs.lstatSync(path.join(directory, file)).isDirectory()) {
                            continue;
                        }
                        fs.unlinkSync(path.join(directory, file));
                    }

                    fs.rmdir(directory, (err) => {
                        if (err) {
                            emitEvent(err.toString(), true);
                            return;
                        }
                        //tell all other clients to remove the directory
                        io.emit('updateMediaFolderList', rowObject);
                    });

                });
            } catch (err) {
                logger.log('error', err);
            }

        });
    });


};