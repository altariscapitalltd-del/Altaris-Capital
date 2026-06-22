import crypto from 'crypto'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'
import { secp256k1 } from '@noble/curves/secp256k1'
import { ed25519 } from '@noble/curves/ed25519'
import { sha256 } from '@noble/hashes/sha256'
import { ripemd160 } from '@noble/hashes/ripemd160'
import { bech32, base58, base58xrp } from '@scure/base'

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

// ── Native non-EVM chains (BTC / SOL / XRP), built from @noble + @scure ──────
export type ChainWallet = { address: string; encryptedKey: string }
export type ChainWallets = { btc: ChainWallet; sol: ChainWallet; xrp: ChainWallet }

function concatBytes(...arrs: Uint8Array[]): Uint8Array {
  let total = 0
  for (let i = 0; i < arrs.length; i++) total += arrs[i].length
  const out = new Uint8Array(total)
  let off = 0
  for (let i = 0; i < arrs.length; i++) { out.set(arrs[i], off); off += arrs[i].length }
  return out
}

// BTC native SegWit (P2WPKH, bech32 "bc1…")
function btcWallet() {
  const priv = crypto.randomBytes(32)
  const pub = secp256k1.getPublicKey(priv, true)
  const h160 = ripemd160(sha256(pub))
  const words = bech32.toWords(h160)
  words.unshift(0) // witness version 0
  const address = bech32.encode('bc', words)
  return { address, key: '0x' + priv.toString('hex') }
}

// Solana (ed25519, base58 address; key = 64-byte secret in Phantom format)
function solWallet() {
  const seed = crypto.randomBytes(32)
  const pub = ed25519.getPublicKey(seed)
  const secretKey = concatBytes(new Uint8Array(seed), pub)
  return { address: base58.encode(pub), key: base58.encode(secretKey) }
}

// XRP classic address (secp256k1, base58-ripple with double-sha256 checksum)
function xrpWallet() {
  const priv = crypto.randomBytes(32)
  const pub = secp256k1.getPublicKey(priv, true)
  const acc = ripemd160(sha256(pub))
  const payload = concatBytes(new Uint8Array([0]), acc)
  const checksum = sha256(sha256(payload)).slice(0, 4)
  const address = base58xrp.encode(concatBytes(payload, checksum))
  return { address, key: '0x' + priv.toString('hex') }
}

/** Generate BTC + SOL + XRP wallets, private keys returned encrypted. */
export function createChainWallets(): ChainWallets {
  const btc = btcWallet(), sol = solWallet(), xrp = xrpWallet()
  return {
    btc: { address: btc.address, encryptedKey: encryptSecret(btc.key) },
    sol: { address: sol.address, encryptedKey: encryptSecret(sol.key) },
    xrp: { address: xrp.address, encryptedKey: encryptSecret(xrp.key) },
  }
}
