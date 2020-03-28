var https = require('https');
var config = require('./config.js');
var fs = require('fs');
var FormData = require('form-data');
var request = require('request');

var synoFileStation = {
    "sid": "",
    "heartBeat": function () {

    },
    "errorResolver": function (errorCode) {
        errorCode = errorCode.toString();
        let errorList = {
            "100": "Unknown error",
            "101": "No parameter of API, method or version",
            "102": "The requested API does not exist",
            "103": "The requested method does not exist",
            "104": "The requested version does not support the functionality",
            "105": "The logged in session does not have permission",
            "106": "Session timeout",
            "107": "Session interrupted by duplicate login",

            "400": "Invalid paramter of file operation",
            "401": "Unknown error of file operation",
            "402": "System is too busy",
            "403": "Invalid user does this file operation",
            "404": "Invalid group does this file operation",
            "405": "Invalid user and group does this operation",
            "406": "Can't get user/group information from the account server",
            "407": "Operation not permitted",
            "408": "No such file or directory",
            "409": "Non-supported file system",
            "410": "Failed to connect internet-based file system (ex: CIFS)",
            "411": "Read-only file system",
            "412": "Filename too long in the non-encrypted file system",
            "413": "Filename too long in the encrypted file system",
            "414": "File already exists",
            "415": "Disk quota exceeded",
            "416": "No space left on device",
            "417": "Input/ouput error",
            "418": "Illegal name or path",
            "419": "Illegal file name",
            "420": "Illegal file name on FAT file system",
            "421": "Device or resource busy",
            "599": "No such task of the file operation",

            "1800": "There is no Content-Length information in the HTTP header or the received size doesn’t match the value of Content-Length information in the HTTP header.",
            "1801": "Wait too long, no date can be received from client (Default maximum wait time is 3600 seconds).",
            "1802": "No filename information in the last part of file content.",
            "1803": "Upload connection is cancelled",
            "1804": "Failed to upload too big file to FAT file system",
            "1805": "Can’t overwrite or skip the existed file, if no overwrite parameter is given.",

            "1100": "Failed to create a folder. More information in <errors> object",
            "1101": "The number of folders to the parent folder would exceed the system limitation",

            "1000": "Failed to copy files/folders. More information in <errors> object.",
            "1001": "Failed to move files/folders. More information in <errors> object.",
            "1002": "An error occurred at the destination. More information in <errors> object",
            "1003": "Cannot overwrite or skip the existing file because no overwrite parameter is given.",
            "1004": "File cannot overwrite a folder with the same name, or folder cannot overwrite a file with the same name",
            "1006": "Cannot copy/move file/folder with special characters to a FAT32 file system.",
            "1007": "Cannot copy/move a file bigger than 4G to a FAT32 file system.",

            "1400": "Failed to extract files",
            "1401": "Cannot open the file as archive",
            "1402": "Failed to read archive data error",
            "1403": "Wrong password",
            "1404": "Failed to get the file and dir list in an archive",
            "1405": "Failed to find the item ID in an archive file",

            "1300": "Failed to compres files/folders",
            "1301": "Cannot create the archive beacause the given archive name is too long",
        };
        return ((errorList.hasOwnProperty(errorCode)) ? errorList.errorCode.toString() : "Undefined");
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
                            opts.path = '/webapi/auth.cgi?api=SYNO.API.Auth&version=' + 3 + '&method=login&account=' + config.synology.userName + '&passwd=' + config.synology.password + '&session=FileStation&format=sid';
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
    getFileStationInfo: function (sid) {
        return new Promise((resolve, reject) => {
            let maxVersion = 1;
            let getMaxV = function () {
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
                    path: '/webapi/entry.cgi?api=SYNO.FileStation.Info&version=1&method=getInfo&_sid=' + this.sid
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
                    return this.getMaxVersionPromise('SYNO.FileStation.Info')
                }).then((maxV) => {
                    maxVersion = maxV;
                    getMaxV();
                }).catch((err) => {
                    reject(err);
                });
            } else {
                this.getMaxVersionPromise('SYNO.FileStation.Info').then((maxV) => {
                    maxVersion = maxV;
                    getMaxV();
                }).catch((err) => {
                    reject(err);
                });
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
    uploadFile: function (filePath, destPath, logger) {
        return new Promise((resolve, reject) => {
            let maxVersion = 1;
            let data = "";
            filePath = filePath.toString();
            let processUpload = function () {
                try {
                    if (logger) {
                        logger.log('info', 'Uploading file %s to destination %s', filePath, destPath);
                    }
                    fs.accessSync(filePath, fs.constants.R_OK);

                    let form = new FormData();

                    form.append('api', 'SYNO.FileStation.Upload');
                    form.append('method', 'upload');
                    form.append('version', maxVersion);
                    //form.append('version', '1');
                    form.append('create_parents', 'true');
                    form.append('overwrite', 'true');
                    form.append('dest_folder_path', destPath);
                    form.append('filename', fs.createReadStream(filePath));

                    form.submit({
                        headers: {
                            'Content-Type': 'multipart/form-data; boundary=' + form.getBoundary(),
                            'Cookie': 'id=' + this.sid
                        },
                        protocol: 'https:',
                        host: config.synology.ipV4,
                        port: 5001,
                        //path: '/webapi/entry.cgi?_sid=' + this.sid,
                        path: '/webapi/entry.cgi',
                        method: 'POST'
                    }, (err, res) => {
                        if (err) {
                            reject(err);
                        } else {
                            res.resume();
                        }
                        res.on('data', res => {
                            try {
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
                            } catch (err) {
                                reject(err);
                            }
                        });
                    });
                } catch (err) {
                    reject(err);
                }
            };
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
                    //return 3; //Debug hadcoded max version
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