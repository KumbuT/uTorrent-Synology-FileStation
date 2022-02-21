var config = require('./config.js');
var http = require("https");
var ptt = require("parse-torrent-title");

var movieInfo = {
    getMovieByKeyword: (torrentName, mediaType, fileName) => {
        return new Promise((resolve, reject) => {

            try {
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
                if (mediaType && mediaType.toLowerCase() == "tv" && fileName && fileName.length > 0) {
                    let seasonAndEpisode = fileName.match(/[s|S][0-9]{2}[e|E][0-9]{2}/g);
                }
                let torrentData = ptt.parse(torrentName);
                let apiPath;
                if (fileName) {
                    fileName = fileName.replace(/((([A-Za-z]{3,9}:(?:\/\/)?)(?:[\-;:&=\+\$,\w]+@)?[A-Za-z0-9\.\-]+|(?:www\.|[\-;:&=\+\$,\w]+@)[A-Za-z0-9\.\-]+)((?:\/[\+~%\/\.\w\-_]*)?\??(?:[\-\+=&;%@\.\w_]*)#?(?:[\.\!\/\\\w]*))?)/g, "");
                }
                if (mediaType && fileName && mediaType.toLowerCase() == "tv") {
                    apiPath = encodeURI("/3/search/tv?include_adult=false&page=1&query=" + fileName + "&language=en-US&api_key=" + config.tmdb.apiKey);
                    let re = /.S(?<season>\d{1,2})E(?<episode>\d{1,2})./;
                    var matches = fileName.match(re);
                    if (matches && matches.length > 0) {
                        var season = matches.groups.season ? matches.groups.season : false;
                        var episode = matches.groups.episode ? matches.groups.episode : false;
                    }
                } else {
                    apiPath = encodeURI("/3/search/movie?include_adult=false&page=1&query=" + torrentData.title + "&language=en-US&year=" + ((year > 0) ? year : '') + "&api_key=" + config.tmdb.apiKey);
                }
                let options = {
                    "method": "GET",
                    "hostname": config.tmdb.hostName,
                    "port": null,
                    "path": apiPath,
                    "headers": {}
                };
                var req = http.request(options, function (res) {
                    let responseBody = '';
                    if (res.status_code >= 400) {
                        reject(res);
                    }
                    res.on("data", function (chunk) {
                        responseBody += chunk;
                    });
                    res.on("end", function () {
                        //console.log(body.toString());
                        try {
                            responseBody = JSON.parse(responseBody);

                            if (mediaType && mediaType.toLowerCase() == "tv" && responseBody.results.length > 0) {
                                let name = responseBody.results[0].hasOwnProperty('name') ? responseBody.results[0].name : fileName;
                                let tvFileName = (name + (season ? " S" + season : "") + (episode ? "E" + episode : " ") + (torrentData.resolution ? +"(" + torrentData.resolution + ")" : "")).replace(/\s+/gm, " ").trimEnd();
                                resolve(tvFileName);
                            }

                            if (responseBody.results.length > 0 || mediaType || mediaType.toLowerCase() != "tv") {
                                let title = responseBody.results[0].hasOwnProperty('title') ? responseBody.results[0].title : torrentName;
                                let year = responseBody.results[0].hasOwnProperty('release_date') ? responseBody.results[0].release_date.toString().match(/\d{4}/) : '';
                                movieFileName = (title + "[" + year + "]" + ((torrentData.resolution === undefined) ? '' : "(" + torrentData.resolution + ")")).replace(/\s+/gm, " ").trimEnd();
                                resolve(movieFileName);
                            } else {
                                (fileName && mediaType) ? resolve(fileName): resolve(torrentName);
                            }
                        } catch (err) {
                            reject(err);
                        }

                    });
                });
                req.on("error", (err) => {
                    throw err;
                });
                req.end();
            } catch (err) {
                reject(err);
            }

        });

    }
};

module.exports = movieInfo;