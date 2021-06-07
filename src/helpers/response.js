const HttpStatus = require('http-status-codes');
const {Logger} = require('../loaders/logger');

function success(
  req,
  res,
  statusCode = HttpStatus.OK,
  data = null,
  message = ''
) {
  return res
    .status(statusCode)
    .send({
      message,
      data,
    })
    .end();
}

function failure(
  req,
  res,
  statusCode = HttpStatus.BAD_REQUEST,
  data = null,
  message = ''
) {
  Logger.error('🔥 API Error : %o %o', message, data);
  const response = {};
  if (!Array.isArray(data)) {
    response.errors = [].push(data);
  } else {
    response.errors = data;
  }
  return res
    .status(statusCode)
    .send(response)
    .end();
}

module.exports = {
  success,
  failure,
};
