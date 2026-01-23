'use client'

import { useState, useRef, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/Sidebar'
import { ProfileModal } from '@/components/ProfileModal'

interface Message {
  role: 'user' | 'assistant'
  content: string
  documentUrl?: string
  documentName?: string
}

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [currentChatId, setCurrentChatId] = useState<string | undefined>()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [profileOpen, setProfileOpen] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition()
        recognition.continuous = false
        recognition.interimResults = true
        recognition.lang = 'ru-RU'

        recognition.onresult = (event) => {
          const transcript = Array.from(event.results)
            .map(result => result[0].transcript)
            .join('')
          setInput(transcript)
        }

        recognition.onend = () => {
          setIsRecording(false)
        }

        recognition.onerror = () => {
          setIsRecording(false)
        }

        recognitionRef.current = recognition
      }
    }
  }, [])

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert('Голосовой ввод не поддерживается в вашем браузере')
      return
    }

    if (isRecording) {
      recognitionRef.current.stop()
      setIsRecording(false)
    } else {
      setInput('')
      recognitionRef.current.start()
      setIsRecording(true)
    }
  }

  const loadChat = async (chatId: string) => {
    try {
      const response = await fetch(`/api/chats/${chatId}`)
      if (response.ok) {
        const chat = await response.json()
        setCurrentChatId(chatId)
        setMessages(chat.messages.map((m: Message) => ({
          role: m.role,
          content: m.content,
          documentUrl: m.documentUrl,
          documentName: m.documentName,
        })))
      }
    } catch (error) {
      console.error('Error loading chat:', error)
    }
  }

  const handleNewChat = () => {
    setCurrentChatId(undefined)
    setMessages([])
  }

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('')

    const userMsg: Message = { role: 'user', content: userMessage }
    setMessages(prev => [...prev, userMsg])

    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, { role: 'user', content: userMessage }],
          chatId: currentChatId,
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка сервера')
      }

      // Обновляем chatId если был создан новый чат
      if (data.chatId && !currentChatId) {
        setCurrentChatId(data.chatId)
      }

      const assistantMsg: Message = {
        role: 'assistant',
        content: data.content,
        documentUrl: data.documentUrl,
        documentName: data.documentName
      }

      setMessages(prev => [...prev, assistantMsg])
      setRefreshKey(prev => prev + 1)
    } catch (error) {
      console.error('Error:', error)
      const errorMsg: Message = {
        role: 'assistant',
        content: 'Произошла ошибка при обработке запроса. Пожалуйста, попробуйте снова.'
      }
      setMessages(prev => [...prev, errorMsg])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-gray-500">Загрузка...</div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar
        currentChatId={currentChatId}
        onNewChat={handleNewChat}
        onSelectChat={loadChat}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        refreshKey={refreshKey}
        onOpenProfile={() => setProfileOpen(true)}
      />
      <ProfileModal isOpen={profileOpen} onClose={() => setProfileOpen(false)} />

      <main className="flex-1 flex flex-col h-screen min-w-0">
        <header className="bg-white border-b px-4 py-3 flex items-center gap-3 shadow-sm">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xl">⚖️</span>
            <div>
              <h1 className="text-lg font-semibold text-gray-800">
                ЧСИ Помощник
              </h1>
              <p className="text-xs text-gray-500 hidden sm:block">
                Помощник частного судебного исполнителя
              </p>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-gray-500 mt-10 md:mt-20">
              <div className="text-5xl mb-4">⚖️</div>
              <p className="text-lg font-medium">Добро пожаловать!</p>
              <p className="mt-2 text-sm">
                Я помогу составить документы и отвечу на вопросы по исполнительному производству.
              </p>
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto text-sm">
                <button
                  onClick={() => setInput('Составь постановление о возбуждении исполнительного производства')}
                  className="p-3 bg-white rounded-lg border hover:border-blue-400 hover:bg-blue-50 transition text-left"
                >
                  📄 Постановление о возбуждении ИП
                </button>
                <button
                  onClick={() => setInput('Составь запрос в банк о наличии счетов должника')}
                  className="p-3 bg-white rounded-lg border hover:border-blue-400 hover:bg-blue-50 transition text-left"
                >
                  🏦 Запрос в банк
                </button>
                <button
                  onClick={() => setInput('Составь уведомление должнику')}
                  className="p-3 bg-white rounded-lg border hover:border-blue-400 hover:bg-blue-50 transition text-left"
                >
                  📨 Уведомление должнику
                </button>
                <button
                  onClick={() => setInput('Составь акт описи имущества')}
                  className="p-3 bg-white rounded-lg border hover:border-blue-400 hover:bg-blue-50 transition text-left"
                >
                  📋 Акт описи имущества
                </button>
              </div>
            </div>
          )}

          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] md:max-w-[75%] rounded-2xl px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border shadow-sm'
                }`}
              >
                <div className="whitespace-pre-wrap">{message.content}</div>
                {message.documentUrl && (
                  <a
                    href={message.documentUrl}
                    download={message.documentName}
                    className={`mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                      message.role === 'user'
                        ? 'bg-blue-500 hover:bg-blue-400'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Скачать {message.documentName}
                  </a>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white border shadow-sm rounded-2xl px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="border-t bg-white p-3 md:p-4">
          <div className="flex items-end gap-2 md:gap-3 max-w-4xl mx-auto">
            <button
              onClick={toggleRecording}
              className={`p-2.5 md:p-3 rounded-full transition flex-shrink-0 ${
                isRecording
                  ? 'bg-red-500 text-white animate-pulse'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title={isRecording ? 'Остановить запись' : 'Голосовой ввод'}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </button>

            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Введите сообщение..."
              className="flex-1 resize-none border rounded-xl px-4 py-2.5 md:py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent max-h-32 text-sm md:text-base"
              rows={1}
              disabled={isLoading}
            />

            <button
              onClick={sendMessage}
              disabled={isLoading || !input.trim()}
              className="p-2.5 md:p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex-shrink-0"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>

          {isRecording && (
            <p className="text-sm text-red-500 mt-2 text-center">
              🎤 Запись... Говорите
            </p>
          )}
        </div>
      </main>
    </div>
  )
}
