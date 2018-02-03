var scanner = require('libnmap');
var config = require('./config.js');
var os = require('os');
var opts = {
    range: [
        '10.0.1.1/24'
    ],
    flags: [
        // "-sn",
        // "-sL"
    ]
};
var netScanner = {
    getOpts: function () {
        return opts;
    },
    setOpts: function (options) {
        opts = options;
    },
    getInterfaces: function () {
        return new Promise((resolve, reject) => {
            try {
                iFaces = os.networkInterfaces();
                Object.keys(iFaces).forEach((ifName) => {
                    iFaces[ifName].forEach(function (iface) {
                        if ('IPv4' !== iface.family || iface.internal !== false) {
                            // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
                            return;
                        }
                        if (!ifName.includes('Loopback')) {
                            opts.range[0] = iface.address + "/24";
                            resolve(iface);
                        }
                    });
                });
            } catch (err) {
                reject(err);
            }
        });
    },
    discover: function () {
        return new Promise((resolve, reject) => {
            scanner.scan(opts, (err, report) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(report);
                }
            });
        });
    }
};

module.exports = netScanner;