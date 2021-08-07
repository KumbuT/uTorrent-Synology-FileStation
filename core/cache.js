const redis = require('redis');
const config = require('./config.js');

let redisClient = {
    "client": undefined,
    "defaultOpts": {
        "host": config.redis.host,
        "port": config.redis.port,
        "retryStrategy": (options) => {
            if (options.error && options.error.code === 'ECONNREFUSED') {
                // End reconnecting on a specific error and flush all commands with
                // a individual error
                return new Error('The server refused the connection');
            }
            if (options.total_retry_time > 1000 * 60 * 60) {
                // End reconnecting after a specific timeout and flush all commands
                // with a individual error
                return new Error('Retry time exhausted');
            }
            if (options.attempt > 10) {
                // End reconnecting with built in error
                return undefined;
            }
            // reconnect after
            return Math.min(options.attempt * 100, 3000);
        }
    },
    "create": (opts) => {
        return new Promise((resolve, reject) => {
            try {
                this.client = redis.createClient(opts || this.defaultOpts);
                this.client.on("error", (err) => { console.log(err); });
                this.client.on("connect", () => {
                    console.log(`REDIS: A new connection made\n`);
                    resolve(this.client);
                });
            } catch (err) {
                reject(err);
            }
        });

    }
};

module.exports = redisClient;