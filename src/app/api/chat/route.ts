import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import Anthropic from '@anthropic-ai/sdk'
import { generateDocument, DocumentType } from '@/lib/documents'
import { authOptions } from '@/lib/auth'

const SYSTEM_PROMPT = `Ты помощник частного судебного исполнителя в Казахстане. Помогаешь составлять документы и отвечаешь на вопросы по исполнительному производству.

Ты знаешь законодательство Республики Казахстан, в частности:
- Закон РК "Об исполнительном производстве и статусе судебных исполнителей"
- Гражданский процессуальный кодекс РК
- Гражданский кодекс РК

Когда пользователь просит составить документ, ты должен:
1. Уточнить необходимые данные (если не указаны): ФИО сторон, суммы, даты, номера дел и т.д.
2. Составить документ согласно требованиям законодательства РК
3. Оформить документ в соответствии с официальным стилем делопроизводства

Типовые документы которые ты можешь составить:
- Постановление о возбуждении исполнительного производства
- Запрос в банк о наличии счетов должника
- Уведомление должнику
- Акт описи имущества
- Постановление о наложении ареста на имущество
- Постановление об обращении взыскания на денежные средства

Если пользователь предоставил достаточно данных для документа, составь его полностью.
Если данных недостаточно, вежливо запроси недостающую информацию.

ВАЖНО: Когда составляешь документ, в конце своего ответа добавь специальный маркер в формате:
[DOCUMENT_DATA]
{
  "type": "тип документа",
  "title": "название документа",
  "data": {
    // все данные документа
  }
}
[/DOCUMENT_DATA]

Типы документов (type):
- "resolution_initiation" - Постановление о возбуждении ИП
- "bank_request" - Запрос в банк
- "debtor_notice" - Уведомление должнику
- "property_inventory" - Акт описи имущества

Всегда отвечай на русском языке.`

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { messages } = await request.json() as { messages: Message[] }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'API ключ не настроен. Добавьте ANTHROPIC_API_KEY в .env файл.' },
        { status: 500 }
      )
    }

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    })

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    })

    const assistantMessage = response.content[0].type === 'text'
      ? response.content[0].text
      : ''

    // Проверяем, есть ли в ответе данные для документа
    const documentMatch = assistantMessage.match(/\[DOCUMENT_DATA\]\s*([\s\S]*?)\s*\[\/DOCUMENT_DATA\]/)

    let cleanContent = assistantMessage
    let documentUrl: string | undefined
    let documentName: string | undefined

    if (documentMatch) {
      try {
        const documentDataStr = documentMatch[1].trim()
        const documentData = JSON.parse(documentDataStr)

        // Убираем маркер документа из текста ответа
        cleanContent = assistantMessage.replace(/\[DOCUMENT_DATA\][\s\S]*?\[\/DOCUMENT_DATA\]/, '').trim()

        // Генерируем документ
        const docBuffer = await generateDocument(documentData.type as DocumentType, documentData.data)

        // Конвертируем в base64 для передачи клиенту
        const base64Doc = Buffer.from(docBuffer).toString('base64')
        documentUrl = `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${base64Doc}`
        documentName = `${documentData.title || 'document'}.docx`
      } catch (docError) {
        console.error('Error generating document:', docError)
        // Если не удалось сгенерировать документ, просто возвращаем текст
      }
    }

    return NextResponse.json({
      content: cleanContent,
      documentUrl,
      documentName,
    })
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: 'Ошибка при обработке запроса' },
      { status: 500 }
    )
  }
}
