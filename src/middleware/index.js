const correlationMiddleware = require('./correlation/correlationMiddleware')
// const validateToken = require('./auth/auth')
const errorHandlingMiddleware = require('./errorHandling/errorHandlingMiddleware')
const loggingMiddleware = require('./logger/loggingMiddleware')

module.exports = {
  // ...validateToken,
  correlationMiddleware,
  errorHandlingMiddleware,
  loggingMiddleware
}
