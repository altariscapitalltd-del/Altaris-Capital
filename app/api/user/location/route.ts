import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { lat, lng, accuracy } = await req.json()

    // Reverse geocode with ip-api as fallback
    let city = '', country = ''
    try {
      const geo = await fetch(`https://ipapi.co/${req.headers.get('x-forwarded-for') || ''}/json/`)
      if (geo.ok) {
        const gd = await geo.json()
        city    = gd.city || ''
        country = gd.country_name || ''
      }
    } catch {}

    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastKnownLat: lat,
        lastKnownLng: lng,
        lastKnownCity: city,
        lastKnownCountry: country,
        locationUpdatedAt: new Date(),
      },
    })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false })
  }
}
