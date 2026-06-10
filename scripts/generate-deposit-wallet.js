/**
 * ONE-TIME SETUP SCRIPT — run once, then DELETE this file from the machine
 * (do not commit the output; the mnemonic is your master key).
 *
 * Usage:
 *   node scripts/generate-deposit-wallet.js
 *
 * What it does:
 *   1. Generates a fresh BIP-39 24-word mnemonic (256-bit entropy)
 *   2. Derives the account-level HD key at path m/44'/60'/0'
 *   3. Prints the XPUB (public key only — safe to store in env)
 *
 * What to do with the output:
 *   - MNEMONIC  →  write it on paper, store it OFFLINE, NEVER put it in a file or env var
 *   - XPUB      →  copy it into DEPOSIT_WALLET_XPUB in your Vercel env vars (or .env.local)
 */

'use strict'

const { generateMnemonic, mnemonicToSeedSync } = require('@scure/bip39')
const { wordlist } = require('@scure/bip39/wordlists/english')
const { HDKey } = require('@scure/bip32')

// 256-bit entropy → 24 words
const mnemonic = generateMnemonic(wordlist, 256)
const seed = mnemonicToSeedSync(mnemonic)

// Standard Ethereum derivation: m/44'/60'/0'
// We export the ACCOUNT-level xpub so the app derives m/44'/60'/0'/0/N per user.
const root = HDKey.fromMasterSeed(seed)
const account = root.derive("m/44'/60'/0'")
const xpub = account.publicExtendedKey

console.log('\n' + '═'.repeat(72))
console.log(' ALTARIS CAPITAL — HD WALLET SETUP')
console.log('═'.repeat(72))
console.log('\n⚠️  MNEMONIC (24 words) — YOUR MASTER KEY')
console.log('    Write this on paper. NEVER store it digitally.\n')
console.log('    ' + mnemonic.split(' ').reduce((acc, w, i) => {
  const num = String(i + 1).padStart(2, ' ')
  const word = `${num}. ${w.padEnd(10)}`
  return acc + word + ((i + 1) % 4 === 0 ? '\n    ' : '')
}, ''))

console.log('\n' + '─'.repeat(72))
console.log('\n✅  XPUB — copy this into Vercel → Environment Variables\n')
console.log('    DEPOSIT_WALLET_XPUB=' + xpub)
console.log('\n' + '─'.repeat(72))
console.log('\nNext steps:')
console.log('  1. Write the mnemonic on paper and store it somewhere safe offline.')
console.log('  2. Add DEPOSIT_WALLET_XPUB to your Vercel project env vars.')
console.log('  3. Delete this script (or at least never commit it after running).')
console.log('  4. Redeploy on Vercel so the new env var takes effect.')
console.log('\n' + '═'.repeat(72) + '\n')
