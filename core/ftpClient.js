let client = require('ftp');
let config = require('./config.js');
//let fs = require('fs');
let path = require('path');
const {
    synology
} = require('./config.js');
const {
    TLSSocket
} = require('tls');


let ftpClient = {
    retry: 2,
    secureOptions: true, //authenticate host cert in tls.connect()
    connect: function (logger, debug, host, secureOpts) {
        return new Promise((resolve, reject) => {
            try {
                logger.log('info', `FTP: Trying to connect ${host?host: config.synology.ipV4} and retries left: ${this.retry}`);
                console.log(`FTP: Trying to connect ${host? host: config.synology.ipV4} and retries left: ${this.retry}`);
                if (debug && typeof debug !== "boolean") {
                    reject(new Error('Parameter debug should be boolean'));
                } else {
                    let ftpConfig = {
                        'host': host ? host : config.synology.ipV4,
                        'port': config.synology.ftp.port,
                        'secure': config.synology.ftp.encryption,
                        'user': config.synology.ftp.user,
                        'password': config.synology.ftp.password,
                        'keepalive': config.synology.ftp.keepalive,
                        'secureOptions': {
                            rejectUnauthorized: (typeof secureOpts == "boolean" ? secureOpts : this.secureOptions)
                        }
                    };
                    var c = new client();

                    c.on('ready', function () {
                        if (logger) logger.log('info', `FTP: Successfully connected to server ${host? host: config.synology.ipV4}`);
                        resolve(c);
                    });
                    if (debug) {
                        c.end();
                    }
                    c.on('error', (err) => {
                        logger.log('error', `FTP: Connection to server ${config.synology.ipV4} failed with message ${err.toString()}`);
                        if (debug) console.log(err);
                        if (this.retry > 0) {
                            this.retry -= 1;
                            this.connect(logger, true, config.synology.localIpV4, false).then(resolve, reject).catch((err) => {
                                logger.log('error', `FTP Client hit a mysterious error: ${err}`);
                            });
                        } else {
                            reject(err);
                        }
                    });
                    c.connect(ftpConfig);
                }
            } catch (err) {
                reject(err);
            }
        });

    },
    upload: function (logger, file, debug) {
        /**file is an object with the structure [{'filePath': string?value, 'destPath': string?value}]*/
        return new Promise((resolve, reject) => {
            try {
                this.connect(logger, debug ? debug : false, config.synology.ipV4).then((client) => {
                    client.mkdir(path.dirname(file.destPath), true, (err) => {
                        if (err && logger) {
                            logger.log('error', `FTP: Failed to create the destination folder ${file.destPath} with error ${err}`);
                            reject(err);
                        } else {
                            client.cwd(path.dirname(file.destPath), (err, cwd) => {
                                if (err) throw err;
                                if (debug) {
                                    client.pwd((err, cwd) => {
                                        if (err) throw err;
                                        console.log(`Current Directory is ${cwd}`);
                                    });
                                }
                                client.put(file.filePath, file.destPath, (err) => {
                                    if (err && logger) {
                                        logger.log('error', `FTP: Failed to upload file ${file.filePath} to ${file.destPath} with err ${err}`);
                                        reject(err);
                                    }
                                    if (logger) {
                                        logger.log('info', `FTP: Successfully uploaded file  ${file.filePath} to ${file.destPath}`);
                                    }
                                    resolve();
                                });
                            });
                        }
                    });
                }).catch((err) => {
                    console.error(err.toString());
                    reject(err);
                });

            } catch (err) {
                if (logger) logger.log('error', `FTP: Error uploading file(s) ${err}`);
                reject(err);
            }

        });

    },
    'download': (logger, filePath, destPath) => {
        return;
    }
};


module.exports = ftpClient;