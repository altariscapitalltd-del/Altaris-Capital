import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, getAdminUser } from '@/lib/auth'
import { pusher } from '@/lib/pusher'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const socketId = body.socket_id || body.socketId || body.socketId
  const channelName = body.channel_name || body.channelName

  if (!socketId || !channelName) {
    return NextResponse.json({ error: 'Missing socket_id or channel_name' }, { status: 400 })
  }

  const user = await getAuthUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Admins can join the admin channel
  if (channelName.startsWith('private-admin')) {
    const admin = await getAdminUser(req)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only allow users to subscribe to their own private channel
  if (channelName.startsWith('private-user-')) {
    const userId = channelName.replace('private-user-', '')
    if (userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const auth = pusher.authenticate(socketId, channelName)
  return NextResponse.json(auth)
}
