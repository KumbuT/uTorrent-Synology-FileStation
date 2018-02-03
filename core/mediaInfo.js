var config = require('./config.js');
var http = require("https");

var movieInfo = {
    getMovieByKeyword: (keyword) => {
        return new Promise((resolve, reject) => {
            keyword = keyword.replace(/[^a-zA-Z]/g, " ");
            let options = {
                "method": "GET",
                "hostname": config.tmdb.hostName,
                "port": null,
                "path": encodeURI("/3/search/movie?include_adult=false&page=1&query=" + keyword + "&language=en-US&api_key=" + config.tmdb.apiKey),
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
                        movieFileName = originalTitle + "[" + year + "]";
                        resolve(movieFileName);
                    } else {
                        resolve(keyword);
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