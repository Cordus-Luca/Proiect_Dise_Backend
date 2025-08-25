const { prisma } = require('../../prisma')

const dictionaryResolvers = {
  Query: {
    categoryList: async (_parent, _arguments, _ctx, _info) => {
      return prisma().dictionaryCategory.findMany()
    },
    typeList: async (_parent, _arguments, _ctx, _info) => {
      return prisma().dictionaryConferenceType.findMany()
    },
    countryList: async (_parent, _arguments, _ctx, _info) => {
      return prisma().dictionaryCountry.findMany()
    },
    countyList: async (_parent, _arguments, _ctx, _info) => {
      return prisma().dictionaryCounty.findMany()
    },
    cityList: async (_parent, _arguments, _ctx, _info) => {
      return prisma().dictionaryCity.findMany()
    }
  }
}

module.exports = dictionaryResolvers
