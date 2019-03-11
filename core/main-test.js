var ds = require('./synoFileStation.js');
var path = require('path');
var config = require('./config.js');
var netScan = require('./networkScanner.js');
var cache = require('./cache.js');
var movieInfo = require('./mediaInfo.js');
var socket_io = require('socket.io');

/**
 * Redis test
 */
// let redisClient = undefined;

// cache.create().then(
//     (client) => {
//         redisClient = client;
//     }).then(() => {
//     for (var index = 0; index < 5; index++) {
//         redisClient.LPUSH("list", "{'One':" + index + "}", (err, reply) => {
//             if (err) {
//                 console.error(index + "\n" + err);
//             } else {
//                 console.info(reply);
//             }
//         });
//     }
//     redisClient.lrange("list", 0, -1, (err, reply) => {
//         if (err) {
//             console.error(index + "\n" + err);
//         } else {
//             console.info(reply);
//         }
//     });
// }).then(()=>{
//     redisClient.flushall((err,reply)=>{
//         console.log(`${err} || flushed all`);
//     });
// }).catch((err) => {
//     //do nothing
// });

/**TMDB test */

movieInfo.getMovieByKeyword("Blade.Runner(1997)").then((data) => {
    console.log(data);
}).catch((err) => {
    console.error(err);
});


/** Test Method
ds.auth('login').then(res => {
    res = JSON.parse(res);
    if (res.success) {
        sid = res.data.sid;
        console.log(`Logged into DS with sid ${sid}`);
        ds.uploadFile('./Untitled-1.txt','/home/test',sid).then((res)=>{
            console.log(res);
        },(err)=>{
            console.error(err);
        });
    }
}, err => {
    console.error(err);
});
 */
/** Test for remove torrent
uTorrentClient.login().then((token)=>{
    uTorrentClient.removeTorrent(token,'6D001F3C54814DCD59E9BD81F41F8935F494D557').then((res)=>{
        console.log(`${res}`);
    },(err)=>{
        console.error(`${err}`)
    });
},(err)=>{});
 */

// ds.getSharedFolderList().then((res) => {
//     console.log(res);
// }, (err) => {
//     console.log(err);
// });

// let filPat = 'C:\\Users\\apteja\\Downloads\\uTorrent\\Life (2017)\\Life.2017.720p.BluRay.x264-[YTS.AG].mp4';
// let dstPat = '/music/' + path.relative(config.watchPath, path.dirname(filPat)).replace(/\\/g, '/');

// ds.uploadFile(filPat, dstPat).then((res) => {
//     console.log('Successfully uploaded file');
// }, (err) => {
//     console.error(`Failed to upload file: ${filPat} with message ${JSON.stringify(err)}`);
// });

// netScan.getInterfaces().then(netScan.discover()).then((rep) => {
//     //console.log(JSON.stringify(rep));
//     let hosts = rep['10.0.1.1-255'].host;
//     for (i = 0; i < hosts.length; i++) {
//         hosts[i].address.map((cur, index, addresses) => {
//             console.log(`Address: ${cur.addr}\nAddress Type: ${cur.addrtype}`);
//             if (cur.hasOwnProperty('vendor')) {
//                 console.log(`Vendor: ${cur.vendor}`);
//             }
//         });
//     }

// }).catch((err) => {
//     console.log(err);
// });

// netScan.getInterfaces().then((iFaces) => {
//     Object.keys(iFaces).forEach((ifName) => {
//         var alias = 0;
//         iFaces[ifName].forEach(function (iface) {
//             if ('IPv4' !== iface.family || iface.internal !== false) {
//                 // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
//                 return;
//             }
//             if (!ifName.includes('Loopback')) {
//                 console.log(`This should only show once ${iface.address}`);
//             }
//             if (alias >= 1) {
//                 // this single interface has multiple ipv4 addresses
//                 console.log(ifName + ':' + alias, iface.address);
//             } else {
//                 // this interface has only one ipv4 adress
//                 console.log(`Interface Name:${ifName}\nAddress:${iface.address}\nNet Mask:${iface.netmask}\n-------------------`);
//             }
//             ++alias;
//         });
//     });
// }).catch((err) => {
//     console.log(err);
// });


let mediainfo = require('./core/mediaInfo.js');
try {
    console.log(process.argv[2]);
    mediainfo.getMovieByKeyword(process.argv[2]).then((fileName) => {
        console.log(fileName);
    }).catch((err) => {
        console.error(err);
    });

} catch (e) {
    console.error(e);
}


setInterval(emitTorrentQueue, 5000);

let emitTorrentQueue = function(){
    socket.emit(torrentQueue, '')
};