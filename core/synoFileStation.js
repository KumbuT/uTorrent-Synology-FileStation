var https = require('follow-redirects').https;
var config = require('./config.js');
var fs = require('fs');
var FormData = require('form-data');
var qs = require('querystring');
var request = require('request');
const {
    post
} = require('request');

var sid = "",
    synotoken = "";
var synoFileStation = {
    "heartBeat": function () {},
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
            "119": "SID not found",

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
                    var options = {
                        'method': 'POST',
                        'hostname': config.synology.ipV4,
                        'port': 5001,
                        'path': '/webapi/entry.cgi?api=SYNO.API.Auth',
                        'headers': {
                            'sec-ch-ua': '"Chromium";v="92", " Not A;Brand";v="99", "Microsoft Edge";v="92"',
                            'DNT': '1',
                            'sec-ch-ua-mobile': '?0',
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.131 Safari/537.36 Edg/92.0.902.67',
                            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                            'Accept': '*/*'
                        },
                        'maxRedirects': 20
                    };

                    var req = https.request(options, function (res) {
                        var chunks = [];

                        res.on("data", function (chunk) {
                            chunks.push(chunk);
                        });

                        res.on("end", function (chunk) {
                            var body = Buffer.concat(chunks);
                            let bodyJSON = JSON.parse(body.toString());
                            if (bodyJSON.hasOwnProperty("success")) {
                                sid = bodyJSON.data.hasOwnProperty("sid") ? bodyJSON.data.sid : "";
                                synotoken = bodyJSON.data.hasOwnProperty("synotoken") ? bodyJSON.data.synotoken : "";
                                console.log(`Successfully logged in: ${body.toString()}`);
                                resolve();
                            } else {
                                reject(bodyJSON);
                            }

                        });

                        res.on("error", function (error) {
                            console.error(error);
                        });
                    });


                    var postData = qs.stringify({
                        'account': config.synology.userName,
                        'api': 'SYNO.API.Auth',
                        'client': 'browser',
                        'enable_device_token': 'no',
                        'enable_syno_token': 'yes',
                        'logintype': 'local',
                        'method': 'login',
                        'otp_code': '',
                        'passwd': config.synology.password,
                        'rememberme': '0',
                        'session': 'webui',
                        'timezone': '-08:00',
                        'version': maxVersion ? maxVersion : 7
                    });
                    if (method.toLowerCase() == 'logout') {
                        postData.method = 'logout';
                    }

                    req.write(postData);
                    req.on('error', (err) => {
                        reject(err)
                    });
                    req.end();
                }, (data) => reject({
                    success: false,
                    error: {
                        code: 1001,
                        message: data
                    }
                }));
            } catch (err) {
                reject(err);
            }
        });
    },
    uploadFile: function (filePath, destPath, logger) {
        return new Promise((resolve, reject) => {
            let maxVersion = 2;
            let data = "";
            filePath = filePath.toString();
            let processUpload = function () {
                try {
                    if (logger) {
                        logger.log('info', 'Uploading file %s to destination %s', filePath, destPath);
                    }

                    fs.accessSync(filePath, fs.constants.R_OK);

                    let form = new FormData();
                    form.append('create_parents', 'true');
                    form.append('overwrite', 'true');
                    form.append('path', destPath);
                    form.append('filename', fs.createReadStream(filePath));

                    form.submit({
                        headers: {
                            'Content-Type': 'multipart/form-data; boundary=' + form.getBoundary(),
                            'Cookie': 'id=' + sid,
                            'X-SYNO-TOKEN': synotoken,
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.131 Safari/537.36 Edg/92.0.902.67',
                            'Accept': '*/*'
                        },
                        protocol: 'https:',
                        host: config.synology.ipV4,
                        port: 5001,
                        path: '/webapi/entry.cgi?api=SYNO.FileStation.Upload&method=upload&version=2&create_parents=true&SynoToken=' + synotoken + '&sid=' + sid,
                        method: 'POST'
                    }, (err, res) => {
                        if (err) {
                            reject(err);
                        } else {
                            res.resume();
                        }
                        res.on("error", function (error) {
                            console.error(error);
                        });

                        var chunks = [];
                        res.on("data", function (chunk) {
                            chunks.push(chunk);
                        });

                        res.on("end", function (chunk) {
                            var body = Buffer.concat(chunks);
                            let JSONBody = JSON.parse(body.toString());
                            if (JSONBody.hasOwnProperty("data")) {
                                if (JSONBody.hasOwnProperty("success") && JSONBody.success) {
                                    resolve(JSONBody);
                                } else {
                                    reject(JSONBody);
                                }
                            }
                            console.log(body.toString());
                        });
                    });
                } catch (err) {
                    reject(err);
                }
            };
            if (sid === '') {
                this.auth('login').then(() => {
                        return this.getMaxVersionPromise('SYNO.FileStation.Upload');
                    }).then((maxV) => {
                        maxVersion = maxV;
                        processUpload(this.synotoken, this.sid);
                    })
                    .catch((err) => {
                        reject(err);
                    });
            } else {
                this.getMaxVersionPromise('SYNO.FileStation.Upload').then(function (data) {
                    maxVersion = data;
                    processUpload();
                }).catch((err) => {
                    reject(err);
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
                    resolve(JSON.parse(responseBody).data[apiName].maxVersion);
                    //return 3; //Debug hadcoded max version
                });
            }).on('error', (err) => {
                reject(err);
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
                            responseBody += chunk;
                        })
                        .on('end', () => {
                            resolve(responseBody);
                        })
                        .on('error', (err) => {
                            reject(err);
                        });
                });
            };

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