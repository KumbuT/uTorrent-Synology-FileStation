const express = require('express');
const router = express.Router();
const https = require('https');
const querystring = require('querystring');
const movieInfo = require('../core/mediaInfo');


let getMovieInfo = function (req, res, next) {
  let errHandler = function (err, queryParams, res) {
    console.error('Error : ' + e.toString());
    let errResp = {};
    errResp.error = err.stack().toString();
    res.send(errResp);
  };

  try {
    let movieInfoJson = '';
    let callback = (response) => {
      response.on('data', (chunk) => {
        movieInfoJson += chunk.toString('utf-8');
      });

      response.on('end', () => {
        let movieInfoResponse = {};
        movieInfoResponse.data = [];
        movieInfoResponse.data[0] = JSON.parse(movieInfoJson).data.movie;
        movieInfoResponse.recordsTotal = 1;
        movieInfoResponse.recordsFiltered = 1;
        res.send(movieInfoResponse);
      });
    };

    let movieId = req.params.hasOwnProperty('movieId') ? parseInt(req.params.movieId) : -1;
    if (movieId == -1) {
      throw new error(`No movie id sent with the request. ${req.stack.toString()}`);
    }

    let queryParam = {};
    queryParam.movie_id = movieId;
    queryParam.with_images = true; //default
    queryParam.with_cast = true; //default

    let opts = {
      host: 'yts.mx',
      path: `/api/v2/movie_details.json?${querystring.stringify(queryParam)}`,
      method: 'GET'
    };
    let request = https.request(opts, callback);
    request.on('error', function (err) {
      errHandler(err, queryParam, res);
    });
    request.end();
  } catch (err) {
    errHandler(err);
  }


};

/* POST pagination information and return page data */
router.get('/:movieId', getMovieInfo);

module.exports = router;