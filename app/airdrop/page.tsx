export const dynamic = 'force-dynamic'

import nextDynamic from 'next/dynamic'

const AirdropClient = nextDynamic(() => import('./AirdropClient'), { ssr: false })

export default function AirdropPage() {
  return <AirdropClient />
}
