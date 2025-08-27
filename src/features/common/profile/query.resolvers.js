const { prisma } = require('../../../prisma')

const welcomeResolvers = {
  Query: {
    userByEmail: (_parent, { email }, _ctx, _info) => {
      if (!email) return null
      return prisma().appUser.findUnique({ where: { email } })
    },
    tagList: () =>
      prisma().tag.findMany({ orderBy: { name: 'asc' } })
    ,
    weightedTagList: () =>
      prisma().userXTag.findMany({})
  },
  AppUser: {
    weightedTags: async ({ id }) => {
        const rows = await prisma().userXTag.findMany({
          where: { userId: id },
          include: { tag: true }
        })
        return rows.map(r => ({ ...r.tag,  weight: r.weight, tagId: r.tagId }))
    }
  }
}
module.exports = welcomeResolvers
