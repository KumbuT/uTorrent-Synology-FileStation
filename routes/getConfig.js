const express = require('express');
const router = express.Router();
const https = require('https');
const querystring = require('querystring');
const config = require('../core/config.js');


let getConfigs = function (req, res, next) {
  let errHandler = function (err, queryParams, res) {
    console.error('Error : ' + e.toString());
    let errResp = {};
    errResp.error = err.stack().toString();
    res.send(errResp);
  };

  try {
    res.send(config);
  } catch (err) {
    errHandler(err);
  }


};

/* POST pagination information and return page data */
router.get('/', getConfigs);

module.exports = router;