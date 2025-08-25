const { prisma } = require('../../../prisma')
const { map } = require('ramda')

const conferenceQueryResolvers = {
  Query: {
    conferenceList: async (_parent, { filters }, _ctx, _info) => {
      let where = undefined
      if (filters) where = {}
      if (filters?.startDate) where.startDate = { gte: new Date(filters.startDate) }
      if (filters?.endDate) where.endDate = { lte: new Date(filters.endDate) }

      return prisma().conference.findMany({ where })
    },
    conference: async (_parent, { id }, _ctx, _info) => {
        return prisma().conference.findUnique({ where: { id } })
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
      const result = await prisma().conferenceXAttendee.findUnique({
        where: {
          conferenceId: id,
          attendeeEmail: userEmail
        },
        include: { dictionaryStatus: true }
      })

      return result?.dictionaryStatus
    }
  },
  Location: {
    city: ({ cityId }) => prisma().dictionaryCity.findUnique({ where: { id: cityId } }),
    county: ({ countyId }) => prisma().dictionaryCounty.findUnique({ where: { id: countyId } }),
    country: ({ countryId }) => prisma().dictionaryCountry.findUnique({ where: { id: countryId } })
  }
}
module.exports = conferenceQueryResolvers