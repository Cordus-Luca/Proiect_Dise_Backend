const { PRISMA_DEBUG } = process.env
const { PrismaClient } = require('@prisma/client')
const isDebug = JSON.parse(PRISMA_DEBUG ?? false)

const cacheMap = new Map()
const prismaOptions = {
  log: isDebug ? ['query', 'info', 'warn', 'error'] : ['warn', 'error']
}

function prisma() {
  let prismaClient
  if (cacheMap.has('default')) return cacheMap.get('default')
  prismaClient = new PrismaClient(prismaOptions)
  cacheMap.set('default', prismaClient)

  return prismaClient
}

module.exports = { prisma }
