const { prisma } = require('../../prisma')

const welcomeMutationResolvers = {
  Mutation: {
    getOrCreateUser: async (_parent, { input }, _ctx, _info) => {
      const { email, name, password } = input
      return prisma().$transaction(async (tx) => {
        // upsert by unique email
        return tx.appUser.upsert({
          where: { email: input.email },                    // <- camelCase
          update: { name: input.name ?? undefined, password: input.password ?? undefined },
          create: { email: input.email, name: input.name ?? null, password: input.password ?? null }
        })
      })
    }
  }
}

module.exports = welcomeMutationResolvers
