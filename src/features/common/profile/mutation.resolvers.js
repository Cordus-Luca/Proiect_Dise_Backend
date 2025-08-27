const { prisma } = require('../../../prisma')

// Helpers
const toNumber = v =>
  v == null ? null : (typeof v === 'object' && typeof v.toNumber === 'function') ? v.toNumber() : Number(v)

const clamp = (x, min, max) => Math.max(min, Math.min(max, x))

const profileMutationResolvers = {
  Mutation: {
    getOrCreateUser: async (_parent, { input }, _ctx, _info) => {
      // keep your existing logic
      return prisma().$transaction(async (tx) =>
        tx.appUser.upsert({
          where: { email: input.email },
          update: { name: input.name ?? undefined, password: input.password ?? undefined },
          create: { email: input.email, name: input.name ?? null, password: input.password ?? null }
        })
      )
    },

    saveProfile: async (_parent, { input }, _ctx, _info) => {
      const result = await prisma().$transaction(async (tx) => {
        const { id, email, name, tags = [], deletedTags = [] } = input

        // Upsert user (prefer id if present; otherwise unique email)
        const updatedUser = id
          ? await tx.appUser.upsert({
              where: { id },
              update: { email, name },
              create: { email, name }
            })
          : await tx.appUser.upsert({
              where: { email },
              update: { name },
              create: { email, name }
            })

        const userId = updatedUser.id

        // Normalize incoming tags to { tagId, weight }
        // Accept either tagId or id from the client
        const normalized = tags
          .map(t => {
            const tagId = typeof t.tagId === 'number' ? t.tagId : (typeof t.id === 'number' ? t.id : null)
            // if you use a 0..3 slider, clamp to [0,3]; adjust if your domain differs
            const weight = clamp(toNumber(t.weight ?? 1), 0, 3)
            return tagId != null ? { tagId, weight } : null
          })
          .filter(Boolean)

        // Explicit deletions (if UI tracks them)
        if (deletedTags?.length) {
          await tx.userXTag.deleteMany({
            where: { userId, tagId: { in: deletedTags } }
          })
        }

        // Replace semantics: remove links not in the new selection
        if (normalized.length > 0) {
          await tx.userXTag.deleteMany({
            where: { userId, tagId: { notIn: normalized.map(x => x.tagId) } }
          })
        } else {
          // No tags selected => clear all
          await tx.userXTag.deleteMany({ where: { userId } })
        }

        // Upsert each remaining tag with its weight using the composite unique key
        await Promise.all(
          normalized.map(({ tagId, weight }) =>
            tx.userXTag.upsert({
              where: { userId_tagId: { userId, tagId } }, // <- @@unique([userId, tagId])
              update: { weight },
              create: { userId, tagId, weight }
            })
          )
        )

        return updatedUser
      })

      return result
    }
  }
}

module.exports = profileMutationResolvers
