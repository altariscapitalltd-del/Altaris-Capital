import crypto from 'crypto'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'

/**
 * Per-user custodial EVM wallet generation + at-rest encryption.
 *
 * SECURITY: private keys are encrypted with AES-256-GCM before they ever touch
 * the database. They are only decrypted server-side for the admin view (admin
 * auth required). Set WALLET_ENCRYPTION_KEY in the environment (Vercel) — a
 * long random string. If absent it derives from JWT_SECRET as a fallback so the
 * app keeps working, but a dedicated key is strongly recommended.
 *
 * Custodial key storage is inherently sensitive. Anyone with DB + encryption-key
 * access can move user funds. Treat WALLET_ENCRYPTION_KEY like a root secret.
 */

function encryptionKey(): Buffer {
  const secret =
    process.env.WALLET_ENCRYPTION_KEY ||
    process.env.JWT_SECRET ||
    'altaris-dev-wallet-key-change-me'
  return crypto.createHash('sha256').update(secret).digest() // 32 bytes
}

export function encryptSecret(plain: string): string {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv)
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${tag.toString('hex')}:${enc.toString('hex')}`
}

export function decryptSecret(blob: string): string {
  try {
    const [ivH, tagH, dataH] = blob.split(':')
    if (!ivH || !tagH || !dataH) return ''
    const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(ivH, 'hex'))
    decipher.setAuthTag(Buffer.from(tagH, 'hex'))
    return Buffer.concat([decipher.update(Buffer.from(dataH, 'hex')), decipher.final()]).toString('utf8')
  } catch {
    return ''
  }
}

export type GeneratedWallet = { address: string; privateKey: `0x${string}`; encryptedKey: string }

/** Generate a fresh EVM wallet (address + private key), key returned encrypted. */
export function createWallet(): GeneratedWallet {
  const privateKey = generatePrivateKey()
  const account = privateKeyToAccount(privateKey)
  return { address: account.address, privateKey, encryptedKey: encryptSecret(privateKey) }
}
