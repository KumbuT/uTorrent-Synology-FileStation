var config = require('./config.js');
var http = require("https");
var ptt = require("parse-torrent-title");

var movieInfo = {
    getMovieByKeyword: (torrentName) => {
        return new Promise((resolve, reject) => {
            let year = 0;
            let yearMatches = torrentName.match(/[0-9]{4}/g);
            if (yearMatches === null || yearMatches.length === 0) {
                //do nothing
            } else {
                yearMatches.forEach(element => {
                    if (parseInt(element) > 1900) {
                        year = element;
                    }
                });
            }
            let torrentData = ptt.parse(torrentName);
            let options = {
                "method": "GET",
                "hostname": config.tmdb.hostName,
                "port": null,
                "path": encodeURI("/3/search/movie?include_adult=false&page=1&query=" + torrentData.title + "&language=en-US&year=" + ((year > 0) ? year : '') + "&api_key=" + config.tmdb.apiKey),
                "headers": {}
            };
            var req = http.request(options, function (res) {
                let responseBody = '';
                if (res.statusCode >= 400) {
                    reject(res);
                }
                res.on("data", function (chunk) {
                    responseBody += chunk;
                });
                res.on("end", function () {
                    //console.log(body.toString());
                    responseBody = JSON.parse(responseBody);
                    if (responseBody.results.length > 0) {
                        let originalTitle = responseBody.results[0].original_title;
                        let year = responseBody.results[0].release_date.toString().match(/\d{4}/);
                        movieFileName = (originalTitle + "[" + year + "]" + ((torrentData.resolution === undefined) ? '' : "(" + torrentData.resolution + ")")).replace(/\s+/gm, " ").trimRight();
                        resolve(movieFileName);
                    } else {
                        resolve(torrentName);
                    }

                });
            });
            req.on("error", (err) => {
                reject(err);
            });
            req.end();
        });

    }
};

module.exports = movieInfo;