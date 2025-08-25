const { makeExecutableSchema } = require('@graphql-tools/schema'),
  { loadFilesSync } = require('@graphql-tools/load-files'),
  { mergeResolvers, mergeTypeDefs } = require('@graphql-tools/merge'),
  { join } = require('path')

const typeDefs = mergeTypeDefs(loadFilesSync(join(__dirname, '../**/*.graphql')))
const resolvers = mergeResolvers(loadFilesSync(join(__dirname, '../**/*resolvers.{js,ts}')), {
  globOptions: { caseSensitiveMatch: false }
})

module.exports = makeExecutableSchema({ typeDefs, resolvers })
module.exports.tests = { typeDefs, resolvers }
