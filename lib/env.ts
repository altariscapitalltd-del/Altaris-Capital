import { z } from 'zod'

const isProd = process.env.NODE_ENV === 'production'

const schema = z.object({
  DATABASE_URL: isProd ? z.string().min(1, 'DATABASE_URL is required in production') : z.string().optional(),
  JWT_SECRET: isProd ? z.string().min(16, 'JWT_SECRET must be at least 16 chars in production') : z.string().optional(),
  ADMIN_JWT_SECRET: isProd ? z.string().min(16, 'ADMIN_JWT_SECRET must be at least 16 chars in production') : z.string().optional(),
})

export function validateEnv() {
  const result = schema.safeParse(process.env)
  if (!result.success) {
    const msg = result.error.flatten().fieldErrors
    throw new Error('Invalid env: ' + JSON.stringify(msg))
  }
  return result.data
}

// Call at app startup (e.g. server/index.js or instrumentation)
if (typeof window === 'undefined' && isProd) {
  try {
    validateEnv()
  } catch (e) {
    console.error((e as Error).message)
    process.exit(1)
  }
}
