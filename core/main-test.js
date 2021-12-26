var ds = require('./synoFileStation.js');
var path = require('path');
var config = require('./config.js');
//var netScan = require('./networkScanner.js');
var cache = require('./cache.js');
var movieInfo = require('./mediaInfo.js');
var socket_io = require('socket.io');
var FTP = require('./ftpClient.js');
var winston = require('winston');



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
            filename: 'debug-dsFileCopyEventsCombined.log',
            dailyRotateFile: {
                colorize: 'true',
                filename: 'debug-dsFileCopyEventsCombined.log',
                datePattern: '.yyyy-MM-dd',
                maxsize: 20000
            }
        }),
        new winston.transports.Console()
    ],
    exceptionHandlers: [
        new winston.transports.File({
            filename: 'debug-dsFileCopyExceptions.log',
            dailyRotateFile: {
                colorize: 'true',
                filename: 'debug-dsFileCopyExceptions.log',
                datePattern: '.yyyy-MM-dd',
                maxsize: 20000
            }
        })
    ],
    exitOnError: true
});


// /**
//  * Redis test
//  */
// // let redisClient = undefined;

// // cache.create().then(
// //     (client) => {
// //         redisClient = client;
// //     }).then(() => {
// //     for (var index = 0; index < 5; index++) {
// //         redisClient.LPUSH("list", "{'One':" + index + "}", (err, reply) => {
// //             if (err) {
// //                 console.error(index + "\n" + err);
// //             } else {
// //                 console.info(reply);
// //             }
// //         });
// //     }
// //     redisClient.lrange("list", 0, -1, (err, reply) => {
// //         if (err) {
// //             console.error(index + "\n" + err);
// //         } else {
// //             console.info(reply);
// //         }
// //     });
// // }).then(()=>{
// //     redisClient.flushall((err,reply)=>{
// //         console.log(`${err} || flushed all`);
// //     });
// // }).catch((err) => {
// //     //do nothing
// // });

// /**TMDB test */

// movieInfo.getMovieByKeyword("Blade.Runner(1997)").then((data) => {
//     console.log(data);
// }).catch((err) => {
//     console.error(err);
// });


// Test Method
// ds.auth('login').then(res => {
//     //res = JSON.parse(res);
//     console.log(res);
//     if (res.success) {
//         sid = res.data.sid;
//         console.log(`Logged into DS with sid ${sid}`);
//         // ds.uploadFile('./Untitled-1.txt', '/home/test', sid).then((res) => {
//         //     console.log(res);
//         // }, (err) => {
//         //     console.error(err);
//         // });
//     }
// }, err => {
//     console.error(err);
// }).catch((err) => {
//     console.log(JSON.stringify(err))
// });

// /** Test for remove torrent
// uTorrentClient.login().then((token)=>{
//     uTorrentClient.removeTorrent(token,'6D001F3C54814DCD59E9BD81F41F8935F494D557').then((res)=>{
//         console.log(`${res}`);
//     },(err)=>{
//         console.error(`${err}`)
//     });
// },(err)=>{});
//  */

// ds.getSharedFolderList().then((res) => {
//     console.log(res);
// }, (err) => {
//     console.log(err);
// });

// let filPat = 'C:\\Users\\apteja\\Videos\\Deception Pass\\Deception Pass 2014.mp4';
// let dstPat = '/video/Movies/' + path.dirname(filPat).split(path.sep).pop().replace(/\\/g, '/');

// ds.uploadFile(filPat, dstPat).then((res) => {
//     console.log('Successfully uploaded file');
// }, (err) => {
//     console.error(`Failed to upload file: ${filPat} with message ${JSON.stringify(err)}`);
//     console.error(`Failed to upload file: ${filPat} with message ${err.toString()}`);
// }).catch((err) => {
//     console.error(err);
// });


// ds.getInfo(logger).then((res) => {
//     console.log(res);
//     logger.log('info', res);
// }, (err) => {
//     logger.log('error',err);
// }).catch((err) => {
//     logger.log('error',err);
// });

// // netScan.getInterfaces().then(netScan.discover()).then((rep) => {
// //     //console.log(JSON.stringify(rep));
// //     let hosts = rep['10.0.1.1-255'].host;
// //     for (i = 0; i < hosts.length; i++) {
// //         hosts[i].address.map((cur, index, addresses) => {
// //             console.log(`Address: ${cur.addr}\nAddress Type: ${cur.addrtype}`);
// //             if (cur.hasOwnProperty('vendor')) {
// //                 console.log(`Vendor: ${cur.vendor}`);
// //             }
// //         });
// //     }

// // }).catch((err) => {
// //     console.log(err);
// // });

// // netScan.getInterfaces().then((iFaces) => {
// //     Object.keys(iFaces).forEach((ifName) => {
// //         var alias = 0;
// //         iFaces[ifName].forEach(function (iface) {
// //             if ('IPv4' !== iface.family || iface.internal !== false) {
// //                 // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
// //                 return;
// //             }
// //             if (!ifName.includes('Loopback')) {
// //                 console.log(`This should only show once ${iface.address}`);
// //             }
// //             if (alias >= 1) {
// //                 // this single interface has multiple ipv4 addresses
// //                 console.log(ifName + ':' + alias, iface.address);
// //             } else {
// //                 // this interface has only one ipv4 adress
// //                 console.log(`Interface Name:${ifName}\nAddress:${iface.address}\nNet Mask:${iface.netmask}\n-------------------`);
// //             }
// //             ++alias;
// //         });
// //     });
// // }).catch((err) => {
// //     console.log(err);
// // });


let mediainfo = require('./mediaInfo');
try {
    console.log(process.argv[2]);
    mediainfo.getMovieByKeyword(process.argv[2] ? process.argv[2]: "Yellowstone", "tv", "Yellowstone.S01.E03.1080p.mp4").then((fileName) => {
        console.log(fileName);
    }).catch((err) => {
        console.error(err);
    });

} catch (e) {
    console.error(e);
}


// setInterval(emitTorrentQueue, 5000);

// let emitTorrentQueue = function () {
//     socket.emit(torrentQueue, '')
// };


// ds.getFileStationInfo().then((res) => {
//     console.log("Response Block");
//     console.log(JSON.stringify(res));
// }).catch((err) => {
//     console.log("Error block");
//     console.log(JSON.stringify(err));
//     });


/**FTP test cases */

// FTP.connect(logger, true).then(() => {
//     console.log("Success");
// }).catch((err) => {
//     console.error("failure");
// });

// let file2 = {
//         'filePath': "C:\\Users\\apteja\\Videos\\17 Again (2009) [1080p]\\17.Again.(2009)[1080p].mp4",
//         'destPath': '/video/Movies/17 Again (2009) [1080p]/17.Again.(2009)[1080p].mp4'
//     },
//     file1 = {
//         'filePath': "C:\Users\\apteja\\Videos\\17 Again (2009) [1080p]\\17.Again.(2009)[1080p].srt",
//         'destPath': '/video/Movies/17 Again (2009) [1080p]/17.Again.(2009)[1080p].srt'
//     };
// FTP.connect(logger, true).then((c) => {
//     console.log(`Connected! ${c}`);
// }, (err) => {
//     console.error(err);
// }).catch((err) => {
//     console.error(err);
// });
// Promise.all([FTP.upload(logger, file1, true), FTP.upload(logger, file2, true)]).then(() => {
//     console.log("Uploaded!");
// }).catch((err) => {
//     console.log(err.toString());
// });