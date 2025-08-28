const { prisma } = require('../../../prisma')
const { map } = require('ramda')

const conferenceQueryResolvers = {
  Query: {
    conferenceList: async (_parent, { filters }, _ctx, _info) => {
      let where = undefined
      if (filters) where = {}
      if (filters?.startDate) where.startDate = { gte: new Date(filters.startDate) }
      if (filters?.endDate) where.endDate = { lte: new Date(filters.endDate) }
      if (filters?.name && filters.name.trim()) { where.name = { contains: filters.name.trim() } }
      if (filters?.tagIds?.length) {
        where.conferenceXTag = { some: { tagId: { in: filters.tagIds } } }
      }
      return prisma().conference.findMany({ where })
    },
    conference: async (_parent, { id }, _ctx, _info) => {
        return prisma().conference.findUnique({ where: { id } })
    },
    tagList: () =>
      prisma().tag.findMany({ orderBy: { name: 'asc' } })
    ,
    usedTagList: async () => {
      // Get distinct tagIds used in conferences
      const rows = await prisma().conferenceXTag.findMany({
        distinct: ['tagId'],
        include: { tag: true }
      })
      // Sort alphabetically client-side
      return rows
        .map(r => r.tag)
        .filter(Boolean)
        .sort((a, b) => a.name.localeCompare(b.name))
    },
    recommendedConferenceList: async (_p, { userEmail, filters, limit = 50 }) => {
      // 1) Resolve user
      const user = await prisma().appUser.findUnique({
        where: { email: userEmail },
        select: { id: true }
      })
      if (!user) return []

      // 2) Build conference filter (dates etc.)
      const whereConference = {}
      if (filters?.startDate) whereConference.startDate = { gte: new Date(filters.startDate) }
      if (filters?.endDate) whereConference.endDate = { lte: new Date(filters.endDate) }
      if (filters?.name && filters.name.trim()) { whereConference.name = { contains: filters.name.trim() } }

      // 3) Load user weights
      const prefs = await prisma().userXTag.findMany({
        where: { userId: user.id },
        select: { tagId: true, weight: true }
      })

      // Fallback: no preferences → just return upcoming (or random)
      if (prefs.length === 0) {
        return prisma().conference.findMany({
          where: whereConference,
          orderBy: [{ startDate: 'asc' }, { id: 'asc' }],
          take: limit
        })
      }

      const weightByTag = new Map(prefs.map(p => [p.tagId, Number(p.weight)]))
      const tagIds = prefs.map(p => p.tagId)

      // 4) Pull all conference–tag rows that intersect the user’s tags (and obey filters)
      const rows = await prisma().conferenceXTag.findMany({
        where: {
          tagId: { in: tagIds },
          conference: whereConference
        },
        select: { conferenceId: true, tagId: true }
      })

      // 5) Score per conference
      const scoreByConf = new Map()
      for (const r of rows) {
        const w = weightByTag.get(r.tagId) || 0
        scoreByConf.set(r.conferenceId, (scoreByConf.get(r.conferenceId) || 0) + w)
      }

      // 6) Sort by score desc, then stable by id asc, take limit
      const orderedIds = [...scoreByConf.entries()]
        .sort((a, b) => b[1] - a[1] || a[0] - b[0])
        .slice(0, limit)
        .map(([id]) => id)

      if (orderedIds.length === 0) {
        // No intersections → fallback
        return prisma().conference.findMany({
          where: whereConference,
          orderBy: [{ startDate: 'asc' }, { id: 'asc' }],
          take: limit
        })
      }

      // 7) Fetch conferences and re-order to match scoring
      const conferences = await prisma().conference.findMany({
        where: { id: { in: orderedIds } }
      })
      const byId = new Map(conferences.map(c => [c.id, c]))
      return orderedIds.map(id => byId.get(id)).filter(Boolean)
    },
    attendedConferenceList: async (_parent, { userEmail }) => {
      if (!userEmail) return []
      return prisma().conference.findMany({
        where: {
          conferenceXAttendee: {
            some: {
              attendeeEmail: userEmail,
              statusId: 3
            }
          }
        },
        orderBy: { startDate: 'desc' }
      })
    }
  },
  Conference: {
    type: ({ conferenceTypeId }) => prisma().dictionaryConferenceType.findUnique({ where: { id: conferenceTypeId } }),
    category: ({ categoryId }) => prisma().dictionaryCategory.findUnique({ where: { id: categoryId } }),
    location: ({ locationId }) => prisma().location.findUnique({ where: { id: locationId } }),
    speakers: async ({ id }) => {
	    const result = await prisma()
	      .conference.findUnique({ where: { id } })
	      .conferenceXSpeaker({ include: { speaker: true } })
	    return map(({ speaker, isMainSpeaker }) => ({ ...speaker, isMainSpeaker }), result)
	  },
    status: async ({ id }, { userEmail }) => {
      const result = await prisma().conferenceXAttendee.findFirst({
        where: {
          conferenceId: id,
          attendeeEmail: userEmail
        },
        include: { dictionaryStatus: true }
      })

      return result?.dictionaryStatus
    },
    tags: async ({ id }) => {
      const rows = await prisma().conferenceXTag.findMany({
        where: { conferenceId: id },
        include: { tag: true }
      })
      return rows.map(r => r.tag).filter(Boolean)
    },
  },
  Location: {
    city: ({ cityId }) => prisma().dictionaryCity.findUnique({ where: { id: cityId } }),
    county: ({ countyId }) => prisma().dictionaryCounty.findUnique({ where: { id: countyId } }),
    country: ({ countryId }) => prisma().dictionaryCountry.findUnique({ where: { id: countryId } })
  }
}

module.exports = conferenceQueryResolvers