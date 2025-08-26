const { prisma } = require('../../prisma')

const welcomeResolvers = {
  Query: {
    userByEmail: (_parent, { email }, _ctx, _info) => {
      if (!email) return null
      return prisma().appUser.findUnique({ where: { email } })
    },
  },
}

module.exports = welcomeResolvers
