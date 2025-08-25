const welcomeResolvers = {
  Query: {
    helloWorld: async (_parent, _arguments, _context, _info) => {
      return 'Hello World!👋'
    }
  }
}
module.exports = welcomeResolvers