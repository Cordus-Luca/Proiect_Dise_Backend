const { ApolloServer } = require('@apollo/server'),
  Koa = require('koa'),
  { ApolloServerPluginDrainHttpServer } = require('@apollo/server/plugin/drainHttpServer'),
  { ApolloLoggerPlugin } = require('@totalsoft/pino-apollo'),
  bodyParser = require('koa-bodyparser'),
  {
    errorHandlingMiddleware,
    // correlationMiddleware,
    loggingMiddleware,
    // jwtTokenValidation,
    // jwtTokenUserIdentification
  } = require('../middleware'),
  cors = require('@koa/cors'),
  // { publicRoute } = require('../utils/functions'),
  // ignore = require('koa-ignore'),
  { koaMiddleware } = require('@as-integrations/koa'),
  { schema, getDataSources, logger } = require('../startup'),
  { METRICS_ENABLED } = process.env,
  { createMetricsPlugin } = require('@totalsoft/metrics'),
  metricsEnabled = JSON.parse(METRICS_ENABLED)

const plugins = httpServer => {
  return [
    ApolloServerPluginDrainHttpServer({ httpServer }),
    new ApolloLoggerPlugin({ logger, securedMessages: false }),
    metricsEnabled ? createMetricsPlugin() : {}
  ]
}

const startApolloServer = async httpServer => {
  logger.info('Creating Apollo Server...')
  const apolloServer = new ApolloServer({
    schema,
    stopOnTerminationSignals: false,
    uploads: false,
    plugins: plugins(httpServer)
  })

  await apolloServer.start()

  const app = new Koa()
  app
    .use(loggingMiddleware)
    .use(errorHandlingMiddleware())
    .use(bodyParser())
    // .use(correlationMiddleware())
    .use(cors({ credentials: true }))
    // .use(ignore(jwtTokenValidation, jwtTokenUserIdentification).if(ctx => publicRoute(ctx)))
  app.use(
    koaMiddleware(apolloServer, {
      context: async ({ ctx }) => {
        const { token, state, externalUser, request, requestSpan } = ctx
        const { cache } = apolloServer
        const dataSources = getDataSources({ ...ctx, cache })
        return {
          token,
          state,
          externalUser,
          request,
          requestSpan,
          logger,
          dataSources
        }
      }
    })
  )

  httpServer.on('request', app.callback())

  return apolloServer
}

module.exports = { startApolloServer, plugins }
