var config = require('./config');
var request = require('request');

var uTorrentClient = {
    token: '',
    cookies: request.jar(),
    login: function () {
        return new Promise((resolve, reject) => {
            //returns a list of torrents currently in queue
            let opts = {
                'uri': 'http://' + config.uTorrent.ipV4 + ':' + config.uTorrent.port + '/gui/token.html',
                'auth': {
                    'user': config.uTorrent.userName,
                    'pass': config.uTorrent.password,
                    'sendImmediately': false
                },
                'jar': this.cookies
            };
            //call make request
            this.makeRequest(opts, function (err, res) {
                if (err) {
                    reject(err);
                } else {
                    let regex = new RegExp('<div id=(?:\'|")token(?:\'|")[^>]+>(.*)</div>');
                    let matches = regex.exec(res);
                    resolve(matches[1]);
                }
            });
        });
    },
    getSettings: function (token) {
        return new Promise((resolve, reject) => {
            let opts = {
                'uri': 'http://' + config.uTorrent.ipV4 + ':' + config.uTorrent.port + '/gui/',
                'method': 'GET',
                'qs': {
                    token: token,
                    action: 'getsettings'
                },
                'auth': {
                    'user': config.uTorrent.userName,
                    'pass': config.uTorrent.password,
                    'sendImmediately': false
                },
                'jar': this.cookies
            };
            this.makeRequest(opts, (err, res) => {
                err ? reject(err) : resolve(res);
            });
        });
    },
    listTorrents: function (token) {
        return new Promise((resolve, reject) => {
            let opts = {
                'uri': 'http://' + config.uTorrent.ipV4 + ':' + config.uTorrent.port + '/gui/',
                'method': 'GET',
                'qs': {
                    token: token,
                    list: '1',
                },
                'auth': {
                    'user': config.uTorrent.userName,
                    'pass': config.uTorrent.password,
                    'sendImmediately': false
                },
                'jar': this.cookies
            };
            this.makeRequest(opts, (err, res) => {
                err ? reject(err) : resolve(res);
            });
        });

    },
    listFilesForTorrent: function (token, hash) {
        return new Promise((resolve, reject) => {
            let opts = {
                'uri': 'http://' + config.uTorrent.ipV4 + ':' + config.uTorrent.port + '/gui/',
                'method': 'GET',
                'qs': {
                    token: token,
                    action: 'getfiles',
                    hash: hash
                },
                'auth': {
                    'user': config.uTorrent.userName,
                    'pass': config.uTorrent.password,
                    'sendImmediately': false
                },
                'jar': this.cookies
            };
            this.makeRequest(opts, (err, res) => {
                err ? reject(err) : resolve(res);
            });
        });
    },
    removeTorrent: function (token, hash) {
        return new Promise((resolve, reject) => {
            let opts = {
                'uri': 'http://' + config.uTorrent.ipV4 + ':' + config.uTorrent.port + '/gui/',
                'method': 'GET',
                'qs': {
                    token: token,
                    action: 'remove',
                    hash: hash
                },
                'auth': {
                    'user': config.uTorrent.userName,
                    'pass': config.uTorrent.password,
                    'sendImmediately': false
                },
                'jar': this.cookies
            };
            this.makeRequest(opts, (err, res) => {
                err ? reject(err) : resolve(res);
            });
        });
    },
    makeRequest: function (options, callback) {
        request(options, function (err, res, body) {
            if (err) {
                if ('code' in err && err.code == 'ECONNREFUSED') {
                    callback('uTorrent not running...', null);
                } else {
                    callback(err, null);
                }

            } else if (typeof body == 'object' && 'error' in body) {
                callback(body.error, null);

            } else if (res.statusCode != 200) {
                if (res.statusCode == 401) {
                    callback('Bad username or password.', null);
                } else if (res.statusCode == 400) {
                    callback('uTorrent API returned status code : 400', null);
                } else {
                    callback('uTorrent API returned status code : ' + res.statusCode, null);
                }

            } else {
                //console.log(body);
                callback(null, body);
            }
        });
    }
};

module.exports = uTorrentClient;