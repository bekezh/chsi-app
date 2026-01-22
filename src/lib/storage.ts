// Локальное хранилище чатов в localStorage

export interface StoredMessage {
  role: 'user' | 'assistant'
  content: string
  documentUrl?: string
  documentName?: string
}

export interface StoredChat {
  id: string
  title: string
  messages: StoredMessage[]
  createdAt: string
  updatedAt: string
}

const STORAGE_KEY = 'chsi_chats'

export function getChats(): StoredChat[] {
  if (typeof window === 'undefined') return []

  try {
    const data = localStorage.getItem(STORAGE_KEY)
    if (!data) return []
    return JSON.parse(data)
  } catch {
    return []
  }
}

export function saveChats(chats: StoredChat[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(chats))
}

export function createChat(): StoredChat {
  const chat: StoredChat = {
    id: crypto.randomUUID(),
    title: 'Новый чат',
    messages: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  const chats = getChats()
  chats.unshift(chat)
  saveChats(chats)

  return chat
}

export function getChat(id: string): StoredChat | null {
  const chats = getChats()
  return chats.find(c => c.id === id) || null
}

export function updateChat(id: string, updates: Partial<StoredChat>): void {
  const chats = getChats()
  const index = chats.findIndex(c => c.id === id)

  if (index !== -1) {
    chats[index] = {
      ...chats[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    }
    saveChats(chats)
  }
}

export function addMessageToChat(chatId: string, message: StoredMessage): void {
  const chats = getChats()
  const index = chats.findIndex(c => c.id === chatId)

  if (index !== -1) {
    chats[index].messages.push(message)
    chats[index].updatedAt = new Date().toISOString()

    // Обновляем название по первому сообщению пользователя
    if (chats[index].title === 'Новый чат' && message.role === 'user') {
      chats[index].title = message.content.slice(0, 40) + (message.content.length > 40 ? '...' : '')
    }

    saveChats(chats)
  }
}

export function deleteChat(id: string): void {
  const chats = getChats()
  const filtered = chats.filter(c => c.id !== id)
  saveChats(filtered)
}
