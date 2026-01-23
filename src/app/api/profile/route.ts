import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/profile - получить профиль пользователя
export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      displayName: true,
      position: true,
      region: true,
    },
  })

  return NextResponse.json(user || {})
}

// PUT /api/profile - обновить профиль пользователя
export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { displayName, position, region } = await request.json()

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      displayName,
      position,
      region,
    },
    select: {
      displayName: true,
      position: true,
      region: true,
    },
  })

  return NextResponse.json(user)
}
