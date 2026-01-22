import {
  Document,
  Paragraph,
  TextRun,
  AlignmentType,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  Packer,
} from 'docx'

export type DocumentType =
  | 'resolution_initiation'
  | 'bank_request'
  | 'debtor_notice'
  | 'property_inventory'

interface DocumentData {
  [key: string]: string | number | undefined
}

export function detectDocumentType(text: string): DocumentType | null {
  const lower = text.toLowerCase()

  if (lower.includes('постановлени') && (lower.includes('возбужден') || lower.includes('исполнительн'))) {
    return 'resolution_initiation'
  }
  if (lower.includes('запрос') && lower.includes('банк')) {
    return 'bank_request'
  }
  if (lower.includes('уведомлен') && lower.includes('должник')) {
    return 'debtor_notice'
  }
  if (lower.includes('акт') && lower.includes('опис')) {
    return 'property_inventory'
  }

  return null
}

function formatDate(date?: string): string {
  if (date) return date
  const now = new Date()
  return now.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function createHeader(text: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        bold: true,
        size: 28,
      }),
    ],
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
  })
}

function createParagraph(text: string, options: {
  bold?: boolean
  alignment?: typeof AlignmentType[keyof typeof AlignmentType]
  spacing?: { before?: number; after?: number }
} = {}): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        bold: options.bold,
        size: 24,
      }),
    ],
    alignment: options.alignment || AlignmentType.JUSTIFIED,
    spacing: options.spacing || { after: 120 },
  })
}

// Постановление о возбуждении исполнительного производства
function createResolutionInitiation(data: DocumentData): Document {
  const sections = [
    createParagraph(`г. ${data.city || '_______________'}`, { alignment: AlignmentType.RIGHT }),
    createParagraph(formatDate(data.date as string), { alignment: AlignmentType.RIGHT }),
    createParagraph(''),
    createHeader('ПОСТАНОВЛЕНИЕ'),
    createHeader('о возбуждении исполнительного производства'),
    createParagraph(''),
    createParagraph(
      `Частный судебный исполнитель ${data.executor_name || '_______________'}, ` +
      `исполнительный округ ${data.district || '_______________'}, ` +
      `рассмотрев исполнительный документ:`
    ),
    createParagraph(''),
    createParagraph(
      `Исполнительный лист № ${data.exec_doc_number || '_______________'} ` +
      `от ${data.exec_doc_date || '_______________'} г., ` +
      `выданный ${data.court_name || '_______________'}`
    ),
    createParagraph(''),
    createParagraph(`Взыскатель: ${data.creditor_name || '_______________'}`),
    createParagraph(`ИИН/БИН: ${data.creditor_iin || '_______________'}`),
    createParagraph(`Адрес: ${data.creditor_address || '_______________'}`),
    createParagraph(''),
    createParagraph(`Должник: ${data.debtor_name || '_______________'}`),
    createParagraph(`ИИН/БИН: ${data.debtor_iin || '_______________'}`),
    createParagraph(`Адрес: ${data.debtor_address || '_______________'}`),
    createParagraph(''),
    createParagraph(`Предмет исполнения: ${data.subject || 'взыскание денежных средств'}`),
    createParagraph(`Сумма взыскания: ${data.amount || '_______________'} тенге`),
    createParagraph(''),
    createParagraph(
      'Руководствуясь статьями 9, 37 Закона Республики Казахстан ' +
      '"Об исполнительном производстве и статусе судебных исполнителей",'
    ),
    createParagraph(''),
    createHeader('ПОСТАНОВЛЯЮ:'),
    createParagraph(''),
    createParagraph(
      `1. Возбудить исполнительное производство № ${data.case_number || '_______________'} ` +
      `о взыскании с ${data.debtor_name || '_______________'} в пользу ` +
      `${data.creditor_name || '_______________'} денежных средств в размере ` +
      `${data.amount || '_______________'} тенге.`
    ),
    createParagraph(''),
    createParagraph(
      '2. Должнику в течение 5 (пяти) дней со дня получения настоящего постановления ' +
      'предлагается добровольно исполнить требования исполнительного документа.'
    ),
    createParagraph(''),
    createParagraph(
      '3. В случае неисполнения требований исполнительного документа в срок для ' +
      'добровольного исполнения, будут приняты меры принудительного исполнения, ' +
      'предусмотренные законодательством Республики Казахстан.'
    ),
    createParagraph(''),
    createParagraph(
      '4. Настоящее постановление может быть обжаловано в суд в течение 10 (десяти) дней ' +
      'со дня его получения.'
    ),
    createParagraph(''),
    createParagraph(''),
    createParagraph(`Частный судебный исполнитель _________________ ${data.executor_name || '_______________'}`),
    createParagraph('М.П.', { alignment: AlignmentType.LEFT }),
  ]

  return new Document({
    sections: [{ children: sections }],
  })
}

// Запрос в банк
function createBankRequest(data: DocumentData): Document {
  const sections = [
    createParagraph(`Исх. № ${data.outgoing_number || '_______________'}`, { alignment: AlignmentType.LEFT }),
    createParagraph(`от ${formatDate(data.date as string)}`, { alignment: AlignmentType.LEFT }),
    createParagraph(''),
    createParagraph(`В ${data.bank_name || '_______________'}`, { alignment: AlignmentType.RIGHT }),
    createParagraph(`${data.bank_address || '_______________'}`, { alignment: AlignmentType.RIGHT }),
    createParagraph(''),
    createHeader('ЗАПРОС'),
    createHeader('о наличии банковских счетов'),
    createParagraph(''),
    createParagraph(
      `В производстве частного судебного исполнителя ${data.executor_name || '_______________'} ` +
      `находится исполнительное производство № ${data.case_number || '_______________'} ` +
      `о взыскании денежных средств с:`
    ),
    createParagraph(''),
    createParagraph(`Должник: ${data.debtor_name || '_______________'}`),
    createParagraph(`ИИН/БИН: ${data.debtor_iin || '_______________'}`),
    createParagraph(`Адрес: ${data.debtor_address || '_______________'}`),
    createParagraph(''),
    createParagraph(`в пользу: ${data.creditor_name || '_______________'}`),
    createParagraph(`Сумма взыскания: ${data.amount || '_______________'} тенге`),
    createParagraph(''),
    createParagraph(
      'На основании статьи 64 Закона Республики Казахстан "Об исполнительном производстве ' +
      'и статусе судебных исполнителей" прошу предоставить информацию:'
    ),
    createParagraph(''),
    createParagraph(
      '1. О наличии/отсутствии банковских счетов, открытых на имя вышеуказанного должника.'
    ),
    createParagraph(
      '2. О наличии денежных средств на указанных счетах и их размере.'
    ),
    createParagraph(
      '3. О движении денежных средств по счетам за последние 3 (три) месяца.'
    ),
    createParagraph(''),
    createParagraph(
      'Ответ прошу направить в течение 3 (трех) рабочих дней по адресу: ' +
      `${data.executor_address || '_______________'}`
    ),
    createParagraph(''),
    createParagraph('Приложение: копия постановления о возбуждении исполнительного производства.'),
    createParagraph(''),
    createParagraph(''),
    createParagraph(`Частный судебный исполнитель _________________ ${data.executor_name || '_______________'}`),
    createParagraph('М.П.', { alignment: AlignmentType.LEFT }),
  ]

  return new Document({
    sections: [{ children: sections }],
  })
}

// Уведомление должнику
function createDebtorNotice(data: DocumentData): Document {
  const sections = [
    createParagraph(`Исх. № ${data.outgoing_number || '_______________'}`, { alignment: AlignmentType.LEFT }),
    createParagraph(`от ${formatDate(data.date as string)}`, { alignment: AlignmentType.LEFT }),
    createParagraph(''),
    createParagraph(`${data.debtor_name || '_______________'}`, { alignment: AlignmentType.RIGHT }),
    createParagraph(`${data.debtor_address || '_______________'}`, { alignment: AlignmentType.RIGHT }),
    createParagraph(''),
    createHeader('УВЕДОМЛЕНИЕ'),
    createParagraph(''),
    createParagraph(
      `Уважаемый(ая) ${data.debtor_name || '_______________'}!`
    ),
    createParagraph(''),
    createParagraph(
      `Настоящим уведомляю Вас о том, что в производстве частного судебного исполнителя ` +
      `${data.executor_name || '_______________'} находится исполнительное производство ` +
      `№ ${data.case_number || '_______________'}, возбужденное на основании исполнительного листа ` +
      `№ ${data.exec_doc_number || '_______________'} от ${data.exec_doc_date || '_______________'} г., ` +
      `выданного ${data.court_name || '_______________'}.`
    ),
    createParagraph(''),
    createParagraph(`Взыскатель: ${data.creditor_name || '_______________'}`),
    createParagraph(`Предмет исполнения: ${data.subject || 'взыскание денежных средств'}`),
    createParagraph(`Сумма взыскания: ${data.amount || '_______________'} тенге`),
    createParagraph(''),
    createParagraph(
      'В соответствии со статьей 37 Закона Республики Казахстан "Об исполнительном производстве ' +
      'и статусе судебных исполнителей" Вам предоставляется срок для добровольного исполнения ' +
      'требований исполнительного документа - 5 (пять) дней со дня получения настоящего уведомления.'
    ),
    createParagraph(''),
    createParagraph(
      'В случае неисполнения требований исполнительного документа в установленный срок, ' +
      'к Вам будут применены меры принудительного исполнения, в том числе:'
    ),
    createParagraph('- обращение взыскания на денежные средства и иное имущество;'),
    createParagraph('- наложение ареста на имущество;'),
    createParagraph('- ограничение права выезда за пределы Республики Казахстан;'),
    createParagraph('- иные меры, предусмотренные законодательством.'),
    createParagraph(''),
    createParagraph(
      'Для решения вопросов по исполнительному производству Вы можете обратиться по адресу: ' +
      `${data.executor_address || '_______________'}, тел.: ${data.executor_phone || '_______________'}.`
    ),
    createParagraph(''),
    createParagraph(''),
    createParagraph(`Частный судебный исполнитель _________________ ${data.executor_name || '_______________'}`),
    createParagraph('М.П.', { alignment: AlignmentType.LEFT }),
  ]

  return new Document({
    sections: [{ children: sections }],
  })
}

// Акт описи имущества
function createPropertyInventory(data: DocumentData): Document {
  const sections: (Paragraph | Table)[] = [
    createParagraph(`г. ${data.city || '_______________'}`, { alignment: AlignmentType.RIGHT }),
    createParagraph(formatDate(data.date as string), { alignment: AlignmentType.RIGHT }),
    createParagraph(''),
    createHeader('АКТ'),
    createHeader('описи имущества'),
    createParagraph(''),
    createParagraph(
      `Частный судебный исполнитель ${data.executor_name || '_______________'}, ` +
      `исполнительный округ ${data.district || '_______________'}, ` +
      `в рамках исполнительного производства № ${data.case_number || '_______________'}`
    ),
    createParagraph(''),
    createParagraph(`Взыскатель: ${data.creditor_name || '_______________'}`),
    createParagraph(`Должник: ${data.debtor_name || '_______________'}`),
    createParagraph(`Сумма взыскания: ${data.amount || '_______________'} тенге`),
    createParagraph(''),
    createParagraph(
      `произвел опись имущества должника по адресу: ${data.inventory_address || '_______________'}`
    ),
    createParagraph(''),
    createParagraph('В присутствии понятых:', { bold: true }),
    createParagraph(`1. ${data.witness1_name || '_______________'}, проживающий: ${data.witness1_address || '_______________'}`),
    createParagraph(`2. ${data.witness2_name || '_______________'}, проживающий: ${data.witness2_address || '_______________'}`),
    createParagraph(''),
    createParagraph('Описи подвергнуто следующее имущество:', { bold: true }),
    createParagraph(''),
  ]

  // Таблица с имуществом
  const propertyItems = (data.property_items as string) || '1. _______________\n2. _______________\n3. _______________'
  const items = propertyItems.split('\n').filter(item => item.trim())

  const tableRows = [
    new TableRow({
      children: [
        new TableCell({
          children: [createParagraph('№ п/п', { bold: true, alignment: AlignmentType.CENTER })],
          width: { size: 10, type: WidthType.PERCENTAGE },
        }),
        new TableCell({
          children: [createParagraph('Наименование имущества', { bold: true, alignment: AlignmentType.CENTER })],
          width: { size: 50, type: WidthType.PERCENTAGE },
        }),
        new TableCell({
          children: [createParagraph('Кол-во', { bold: true, alignment: AlignmentType.CENTER })],
          width: { size: 15, type: WidthType.PERCENTAGE },
        }),
        new TableCell({
          children: [createParagraph('Примечание', { bold: true, alignment: AlignmentType.CENTER })],
          width: { size: 25, type: WidthType.PERCENTAGE },
        }),
      ],
    }),
    ...items.map((item, index) => {
      const parts = item.replace(/^\d+\.\s*/, '').split(',').map(p => p.trim())
      return new TableRow({
        children: [
          new TableCell({ children: [createParagraph(String(index + 1), { alignment: AlignmentType.CENTER })] }),
          new TableCell({ children: [createParagraph(parts[0] || '')] }),
          new TableCell({ children: [createParagraph(parts[1] || '1', { alignment: AlignmentType.CENTER })] }),
          new TableCell({ children: [createParagraph(parts[2] || '')] }),
        ],
      })
    }),
  ]

  const table = new Table({
    rows: tableRows,
    width: { size: 100, type: WidthType.PERCENTAGE },
  })

  sections.push(table)

  sections.push(
    createParagraph(''),
    createParagraph(
      `Имущество оставлено на ответственное хранение: ${data.storage_responsible || '_______________'}`
    ),
    createParagraph(
      'Хранителю разъяснена ответственность за сохранность имущества, предусмотренная ' +
      'статьей 360 Уголовного кодекса Республики Казахстан.'
    ),
    createParagraph(''),
    createParagraph('Замечания и заявления участников: ' + (data.remarks || 'не поступали')),
    createParagraph(''),
    createParagraph('Подписи:', { bold: true }),
    createParagraph(''),
    createParagraph(`Частный судебный исполнитель _________________ ${data.executor_name || '_______________'}`),
    createParagraph(''),
    createParagraph(`Понятой 1 _________________ ${data.witness1_name || '_______________'}`),
    createParagraph(''),
    createParagraph(`Понятой 2 _________________ ${data.witness2_name || '_______________'}`),
    createParagraph(''),
    createParagraph(`Должник _________________ ${data.debtor_name || '_______________'}`),
    createParagraph(''),
    createParagraph(`Хранитель _________________ ${data.storage_responsible || '_______________'}`),
  )

  return new Document({
    sections: [{ children: sections }],
  })
}

export async function generateDocument(type: DocumentType, data: DocumentData): Promise<Buffer> {
  let doc: Document

  switch (type) {
    case 'resolution_initiation':
      doc = createResolutionInitiation(data)
      break
    case 'bank_request':
      doc = createBankRequest(data)
      break
    case 'debtor_notice':
      doc = createDebtorNotice(data)
      break
    case 'property_inventory':
      doc = createPropertyInventory(data)
      break
    default:
      throw new Error(`Unknown document type: ${type}`)
  }

  const buffer = await Packer.toBuffer(doc)
  return Buffer.from(buffer)
}
