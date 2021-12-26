const express = require('express');
const router = express.Router();
const https = require('https');
const querystring = require('querystring');
const pageSize = 10; //Between 1 and 50

let getMovies = function (req, res, next) {
  let errHandler = function (err, queryParams, res) {
    console.error('Error : ' + err.toString());
    let errResp = {};
    if (queryParams) {
      errResp.draw = queryParams.draw;
      errResp.recordsTotal = queryParams.recordsTotal;
      errResp.recordsFiltered = queryParams.recordsFiltered;
    }
    errResp.data = [];
    errResp.error = err.toString();
    res.send(errResp);
  };

  try {
    let queryParam = {};

    //add throw error if these query params are not present
    queryParam.limit = pageSize;

    queryParam.minimum_rating = req.query.hasOwnProperty('rating') ? parseInt(req.query.rating) : parseInt('0');
    queryParam.genre = req.query.hasOwnProperty('genre') ? req.query.genre.toString() : "all";

    console.log(`${req.query.genre} \n ${req.query.rating}`);
    //queryParam.length = req.query.hasOwnProperty('length') ? parseInt(req.query.length) : 0 ;
    if (req.query.hasOwnProperty('search') && req.query.search.value.length > 0) {
      queryParam.query_term = req.query.search.value;
    }
    queryParam.order_by = (req.query.hasOwnProperty('order') && req.query.order.length > 0) ? req.query.order[0].dir : "desc";
    queryParam.with_rt_ratings = true; //default
    queryParam.sort_by = "date_added"; //default

    if (req.query.hasOwnProperty('order') && req.query.order.length > 0) {
      switch (req.query.columns[parseInt(req.query.order[0].column)].data) {
        case 'year':
          queryParam.sort_by = "year";
          break;
        case 'rating':
          queryParam.sort_by = "rating";
          break;
        case 'title_english':
          queryParam.sort_by = "title_english";
          break;
        case 'date_uploaded':
          queryParam.sort_by = "date_added";
          break;
      }
    }
    let draw = req.query.hasOwnProperty('draw') ? parseInt(req.query.draw) : '';
    let start = req.query.hasOwnProperty('start') ? parseInt(req.query.start) : '';
    //computePage

    if (start != 0) {
      queryParam.page = (start / pageSize) + 1;
    } else {
      queryParam.page = 1;
    }

    let callback = (response) => {
      let responseObj = {};
      try {
        let moviesJson = '';
        response.on('data', (chunk) => {
          moviesJson += chunk.toString('utf-8');
        });

        response.on('end', () => {
          let movies = JSON.parse(moviesJson);
          let moviesArray = movies.data.movies;
          let totalMovies = movies.data.movie_count;

          responseObj.data = moviesArray ? moviesArray : [];
          responseObj.draw = draw;
          responseObj.recordsTotal = totalMovies;
          responseObj.recordsFiltered = totalMovies; //filtering not supported yet. So sending the same number as totalMovies

          res.send(responseObj);
        });

      } catch (err) {
        errHandler(err, queryParam, res);
      }
    };


    var opts = {
      host: 'yts.mx',
      path: `/api/v2/list_movies.json?${querystring.stringify(queryParam)}`,
      method: 'GET'
    };
    let request = https.request(opts, callback);

    request.on('error', function (err) {
      errHandler(err, queryParam, res);
    });
    request.end();
  } catch (err) {
    errHandler(err, undefined, res);
  }

};

/* POST pagination information and return page data */
router.get('/', getMovies);

module.exports = router;