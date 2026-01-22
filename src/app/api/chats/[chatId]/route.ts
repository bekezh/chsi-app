import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/chats/[chatId] - получить чат с сообщениями
export async function GET(
  request: NextRequest,
  { params }: { params: { chatId: string } }
) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const chat = await prisma.chat.findFirst({
    where: {
      id: params.chatId,
      userId: session.user.id,
    },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!chat) {
    return NextResponse.json({ error: 'Chat not found' }, { status: 404 })
  }

  return NextResponse.json(chat)
}

// DELETE /api/chats/[chatId] - удалить чат
export async function DELETE(
  request: NextRequest,
  { params }: { params: { chatId: string } }
) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const chat = await prisma.chat.findFirst({
    where: {
      id: params.chatId,
      userId: session.user.id,
    },
  })

  if (!chat) {
    return NextResponse.json({ error: 'Chat not found' }, { status: 404 })
  }

  await prisma.chat.delete({
    where: { id: params.chatId },
  })

  return NextResponse.json({ success: true })
}

// PATCH /api/chats/[chatId] - обновить название чата
export async function PATCH(
  request: NextRequest,
  { params }: { params: { chatId: string } }
) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { title } = await request.json()

  const chat = await prisma.chat.findFirst({
    where: {
      id: params.chatId,
      userId: session.user.id,
    },
  })

  if (!chat) {
    return NextResponse.json({ error: 'Chat not found' }, { status: 404 })
  }

  const updated = await prisma.chat.update({
    where: { id: params.chatId },
    data: { title },
  })

  return NextResponse.json(updated)
}
