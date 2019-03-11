var https = require('https');
var config = require('./config.js');
var fs = require('fs');
var FormData = require('form-data');
var request = require('request');

var synoFileStation = {
    "sid": "",
    "heartBeat": function () {

    },
    "auth": function (method) {
        return new Promise((resolve, reject) => {
            let maxVersion = 1;
            try {
                this.getMaxVersionPromise('SYNO.API.Auth').then(function (data) {
                    maxVersion = data;
                    if (!maxVersion) {
                        //if an error occurred and false was returned
                        return reject({
                            success: false,
                            error: {
                                code: 10000
                            }
                        });
                    }
                    let opts = {
                        hostname: config.synology.ipV4.toString(),
                        port: 5001
                    };
                    switch (method) {
                        case "login":
                            opts.path = '/webapi/auth.cgi?api=SYNO.API.Auth&version=' + maxVersion + '&method=login&account=' + config.synology.userName + '&passwd=' + config.synology.password + '&session=FileStation&format=cookie';
                            break;
                        case "logout":
                            opts.path = '/webapi/auth.cgi?api=SYNO.API.Auth&version=' + maxVersion + '&method=logout&account=' + config.synology.userName + '&passwd=' + config.synology.password + '&session=FileStation&format';
                            break;
                        default:
                            reject(JSON.stringify({
                                success: false,
                                error: {
                                    code: 1000
                                }
                            }));
                    }
                    https.get(opts, (res) => {
                        if (res.statusCode >= 400) {
                            reject(res);
                        }
                        let responseBody = '';

                        res.on('end', () => {
                                responseBody = JSON.parse(responseBody);
                                if (responseBody.success) {
                                    this.sid = responseBody.data.sid;
                                    resolve(this.sid);
                                } else {
                                    reject(responseBody);
                                }
                            })
                            .on('data', (data) => responseBody += data.toString())
                            .on('error', (e) => {
                                reject(e)
                            });
                    });
                }, (data) => reject({
                    success: false,
                    error: {
                        code: 1001,
                        message: data
                    }
                }))
            } catch (err) {
                reject(err);
            }
        });
    },
    getSharedFolderList: function (sid) {
        return new Promise((resolve, reject) => {
            let maxVersion = 1;
            let listFolders = function () {
                if (!maxVersion) {
                    //if an error occurred and false was returned
                    return reject({
                        success: false,
                        error: {
                            code: 10000
                        }
                    });
                }
                let opts = {
                    hostname: config.synology.ipV4,
                    port: 5001,
                    path: '/webapi/entry.cgi?api=SYNO.FileStation.List&version=' + maxVersion + '&method=list_share&additional=%5B%22real_path%22%2C%22volume_status%22%5D&_sid=' + this.sid
                };
                https.get(opts, (res) => {
                    if (res.statusCode >= 400) {
                        reject(res);
                    }
                    let responseBody = '';
                    res.on('data', chunk => responseBody += chunk)
                        .on('error', err => reject(err))
                        .on('end', () => {
                            if (JSON.parse(responseBody).success) {
                                resolve(responseBody);
                            } else {
                                reject(responseBody);
                            }
                        });
                });
            }
            if (typeof sid === 'undefined') {
                this.auth('login').then((sid) => {
                    return this.getMaxVersionPromise('SYNO.FileStation.List')
                }).then((maxV) => {
                    maxVersion = maxV;
                    listFolders();
                }).catch((err) => {
                    reject(err);
                });
            } else {
                this.getMaxVersionPromise('SYNO.FileStation.List').then((maxV) => {
                    maxVersion = maxV;
                    listFolders();
                }).catch((err) => {
                    reject(err);
                });
            }
        });
    },
    uploadFile: function (filePath, destPath, sid) {
        return new Promise((resolve, reject) => {
            let maxVersion = 1;
            let processUpload = function () {
                try {
                    fs.accessSync(filePath, fs.constants.R_OK);
                    let form = new FormData();

                    form.append('api', 'SYNO.FileStation.Upload');
                    form.append('version', maxVersion);
                    form.append('method', 'upload');
                    form.append('path', destPath);
                    form.append('create_parents', 'true');
                    form.append('overwrite', 'true');
                    form.append('file', fs.createReadStream(filePath.toString()));

                    form.submit({
                        headers: {},
                        protocol: 'https:',
                        host: config.synology.ipV4,
                        port: 5001,
                        path: '/webapi/entry.cgi?_sid=%22' + this.sid + '%22',
                        method: 'POST'
                    }, (err, res) => {
                        if (err) {
                            reject(err);
                        }
                        res.on('data', res => {
                            if (res.statusCode >= 400) {
                                reject(res);
                            } else {
                                res = JSON.parse(res);
                                if (res.success) {
                                    resolve(res);
                                } else {
                                    reject(res);
                                }
                            }
                        }).on('error', err => {
                            reject(err);
                        });
                    });
                } catch (err) {
                    reject(err);
                }
            }
            if (typeof sid === 'undefined') {
                this.auth('login').then((sid) => {
                    return this.getMaxVersionPromise('SYNO.FileStation.Upload');
                }).then((maxV) => {
                    maxVersion = maxV;
                    processUpload();
                }).catch((err) => {
                    reject(err);
                });

            } else {
                this.getMaxVersionPromise('SYNO.FileStation.Upload').then(function (data) {
                    maxVersion = data;
                    processUpload();
                }).catch((err) => {
                    reject(err)
                });
            }

        });
    },
    getMaxVersionPromise: function (apiName) {
        return new Promise((resolve, reject) => {
            let opts = {
                hostname: config.synology.ipV4,
                port: 5001,
                path: '/webapi/query.cgi?api=SYNO.API.Info&version=1&method=query&query=' + apiName
            };
            let req = https.get(opts, (res) => {
                if (res.statusCode >= 400) {
                    reject(`Request to ${res.url} failed with status ${res.statusMessage}`);
                }
                let responseBody = '';
                res.on('error', (err) => reject(`Request to ${res.url} failed with status ${res.statusMessage}`));
                res.on('data', chunk => responseBody += chunk.toString());

                res.on('end', () => {
                    //console.log(responseBody);
                    resolve(JSON.parse(responseBody).data[apiName].maxVersion)
                });
            }).on('error', (err) => {
                reject(err)
            });
        });
    },
    getDirInfo: function (dirPath, sid) {
        //authentication needed and relies on SYNO.
        return new Promise((resolve, reject) => {
            let maxVersion = 1;
            let dirInfo = function () {
                if (!maxVersion) {
                    //if an error occurred and false was returned
                    return reject({
                        success: false,
                        error: {
                            code: 10000
                        }
                    });
                }
                let opts = {
                    hostname: config.synology.ipV4,
                    port: 5001,
                    method: 'GET',
                    path: '/webapi/entry.cgi?api=SYNO.FileStation.List&version=' + maxVersion + '&method=getinfo&path=%5B%22' + dirPath.replace(/\//g, "%2F") + '%22%5D&additional=%5B%22size%22%5D&_sid=' + this.sid
                };
                https.get(opts, (res) => {
                    if (res.statusCode >= 400) {
                        reject(res);
                    }
                    let responseBody = '';
                    res.on('data', (chunk) => {
                            responseBody += chunk
                        })
                        .on('end', () => {
                            resolve(responseBody)
                        })
                        .on('error', (err) => {
                            reject(err)
                        });
                });
            }

            if (typeof sid === 'undefined') {
                this.auth('login').then((sid) => {
                    return this.getMaxVersionPromise('SYNO.FileStation.List');
                }).then((maxV) => {
                    maxVersion = maxV;
                    processUpload();
                }).catch((err) => {
                    reject(err);
                });
            } else {
                this.getMaxVersionPromise('SYNO.FileStation.List').then((maxV) => {
                    maxVersion = maxV;
                    processUpload();
                }).catch((err) => {
                    reject(err);
                });
            }
        });
    }
};

module.exports = synoFileStation;