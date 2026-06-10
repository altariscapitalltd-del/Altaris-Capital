import { HDKey, publicKeyToAddress } from 'viem/accounts'
import { secp256k1 } from '@noble/curves/secp256k1'
import { getAddress } from 'viem'
import { DEPOSIT_WALLET_XPUB } from '@/lib/config/deposits'

// Derive the deposit address for a given index from the platform account-level
// xpub (path m/44'/60'/0'/0). Pure public-key math — never touches private keys.
//
// The xpub must be the CHANGE-level extended public key so that deriveChild(index)
// yields the standard EVM address at m/44'/60'/0'/0/index — identical to what a
// wallet like MetaMask shows for "account index". Verified against viem's
// mnemonicToAccount ground truth.
export function deriveDepositAddress(index: number): string {
  if (!DEPOSIT_WALLET_XPUB) {
    throw new Error('DEPOSIT_WALLET_XPUB is not configured')
  }
  if (!Number.isInteger(index) || index < 0) {
    throw new Error(`Invalid derivation index: ${index}`)
  }

  const node = HDKey.fromExtendedKey(DEPOSIT_WALLET_XPUB)
  const child = node.deriveChild(index)
  if (!child.publicKey) {
    throw new Error('Failed to derive child public key from xpub')
  }

  // HDKey gives a compressed (33-byte) public key; the Ethereum address is the
  // last 20 bytes of keccak256 over the uncompressed (65-byte) key.
  const uncompressed = secp256k1.ProjectivePoint.fromHex(child.publicKey).toRawBytes(false)
  const hex = `0x${Buffer.from(uncompressed).toString('hex')}` as `0x${string}`
  return getAddress(publicKeyToAddress(hex))
}

// Cheap sanity check that an xpub is well-formed before we trust it.
export function isValidXpub(xpub: string): boolean {
  try {
    HDKey.fromExtendedKey(xpub.trim())
    return true
  } catch {
    return false
  }
}
