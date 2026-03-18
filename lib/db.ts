import { PrismaClient } from '@prisma/client'
import { ensureDatabaseCompatibility } from './db-bootstrap'

const globalForPrisma = globalThis as unknown as { prismaRaw?: PrismaClient; prisma?: PrismaClient }

const rawPrisma =
  globalForPrisma.prismaRaw ||
  new PrismaClient({ log: ['error'] })

export const prisma =
  globalForPrisma.prisma ||
  rawPrisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ args, query }) {
          await ensureDatabaseCompatibility(rawPrisma)
          return query(args)
        },
      },
    },
  }) as PrismaClient

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prismaRaw = rawPrisma
  globalForPrisma.prisma = prisma
}

export default prisma
