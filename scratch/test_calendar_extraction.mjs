import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const monthMap = {
  'janeiro': 0, 'fevereiro': 1, 'março': 2, 'marco': 2, 'abril': 3,
  'maio': 4, 'junho': 5, 'julho': 6, 'agosto': 7,
  'setembro': 8, 'outubro': 9, 'novembro': 10, 'dezembro': 11
};

export function extractLegalDeadlineAndEventTitle(params) {
  const {
    processNumber = '',
    actionRequired = '',
    movementText = '',
    deadlineText = '',
    baseDateStr = ''
  } = params;

  const combinedText = `${actionRequired} ${movementText} ${deadlineText}`.trim();
  const lowerText = combinedText.toLowerCase();

  // 1. Extração do Termo Processual / Nome do Evento
  let actionName = '';

  if (lowerText.includes('audiência de conciliação') || lowerText.includes('conciliação')) {
    actionName = 'Audiência de Conciliação';
  } else if (lowerText.includes('audiência de instrução') || lowerText.includes('instrução e julgamento')) {
    actionName = 'Audiência de Instrução e Julgamento';
  } else if (lowerText.includes('audiência de custódia')) {
    actionName = 'Audiência de Custódia';
  } else if (lowerText.includes('audiência')) {
    actionName = 'Audiência Judicial';
  } else if (lowerText.includes('contestação') || lowerText.includes('contestar')) {
    actionName = 'Apresentação de Contestação';
  } else if (lowerText.includes('juntada de documento') || lowerText.includes('juntada de documentos') || lowerText.includes('juntada')) {
    actionName = 'Juntada de Documentos';
  } else if (lowerText.includes('réplica') || lowerText.includes('impugnação à contestação')) {
    actionName = 'Réplica à Contestação';
  } else if (lowerText.includes('alegações finais') || lowerText.includes('memoriais')) {
    actionName = 'Alegações Finais';
  } else if (lowerText.includes('recurso de apelação') || lowerText.includes('apelação')) {
    actionName = 'Recurso de Apelação';
  } else if (lowerText.includes('agravo de instrumento') || lowerText.includes('agravo')) {
    actionName = 'Agravo de Instrumento';
  } else if (lowerText.includes('embargos de declaração') || lowerText.includes('embargos')) {
    actionName = 'Embargos de Declaração';
  } else if (lowerText.includes('laudo pericial') || lowerText.includes('perícia')) {
    actionName = 'Manifestação sobre Laudo Pericial';
  } else if (lowerText.includes('especificação de provas') || lowerText.includes('especificar provas')) {
    actionName = 'Especificação de Provas';
  } else if (lowerText.includes('cumprimento de despacho') || lowerText.includes('despacho')) {
    actionName = 'Cumprimento de Despacho';
  } else if (lowerText.includes('pagamento de custas') || lowerText.includes('guia de custas') || lowerText.includes('custas')) {
    actionName = 'Pagamento de Custas';
  } else if (actionRequired && actionRequired.length > 3 && actionRequired.length < 45) {
    actionName = actionRequired;
  } else {
    actionName = 'Prazo Processual PJe';
  }

  // 2. Extração da Data Alvo (Data Futura Mencionada no Texto)
  let targetDate = null;
  let targetHour = 17;
  let targetMinute = 0;

  // Tentar extrair horário (ex: "às 14:30", "14h30", "14:00", "09h")
  const timeMatch = combinedText.match(/\b([01]?\d|2[0-3])[:hH]([0-5]\d)?\b/);
  if (timeMatch) {
    targetHour = parseInt(timeMatch[1], 10);
    targetMinute = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
  } else if (actionName.includes('Audiência')) {
    targetHour = 14; // Default para audiências: 14:00
  }

  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);

  // A) Procurar formato DD/MM/YYYY no texto
  const dateRegexBr = /\b(0?[1-9]|[12]\d|3[01])\/(0?[1-9]|1[0-2])\/(\d{4})\b/g;
  let brMatch;
  while ((brMatch = dateRegexBr.exec(combinedText)) !== null) {
    const [, day, month, year] = brMatch;
    const candidate = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10), targetHour, targetMinute);
    if (candidate >= todayDate) {
      targetDate = candidate;
      break;
    }
  }

  // B) Procurar formato YYYY-MM-DD no texto
  if (!targetDate) {
    const dateRegexIso = /\b(\d{4})-(0?[1-9]|1[0-2])-(0?[1-9]|[12]\d|3[01])\b/g;
    let isoMatch;
    while ((isoMatch = dateRegexIso.exec(combinedText)) !== null) {
      const [, year, month, day] = isoMatch;
      const candidate = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10), targetHour, targetMinute);
      if (candidate >= todayDate) {
        targetDate = candidate;
        break;
      }
    }
  }

  // C) Procurar formato por Extenso ("25 de agosto de 2026", "5 de setembro")
  if (!targetDate) {
    const dateExtensoRegex = /\b(0?[1-9]|[12]\d|3[01])\s+de\s+([a-zA-ZçÇ]+)(?:\s+de\s+(\d{4}))?\b/gi;
    let extMatch;
    while ((extMatch = dateExtensoRegex.exec(combinedText)) !== null) {
      const day = parseInt(extMatch[1], 10);
      const monthName = extMatch[2].toLowerCase();
      const year = extMatch[3] ? parseInt(extMatch[3], 10) : todayDate.getFullYear();
      
      if (monthMap[monthName] !== undefined) {
        const candidate = new Date(year, monthMap[monthName], day, targetHour, targetMinute);
        if (candidate >= todayDate) {
          targetDate = candidate;
          break;
        }
      }
    }
  }

  // D) Calcular por contagem de dias se mencionado ("15 dias", "5 dias", "prazo de 10 dias")
  if (!targetDate) {
    const daysMatch = combinedText.match(/\b(\d+)\s*(dias|dia)\b/i);
    if (daysMatch) {
      const numDays = parseInt(daysMatch[1], 10);
      let baseDate = new Date();
      if (baseDateStr) {
        if (baseDateStr.includes('/')) {
          const [d, m, y] = baseDateStr.split('/');
          baseDate = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
        } else if (/^\d{4}-\d{2}-\d{2}$/.test(baseDateStr)) {
          const [y, m, d] = baseDateStr.split('-');
          baseDate = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
        }
      }
      targetDate = new Date(baseDate.getTime() + numDays * 86400000);
      targetDate.setHours(targetHour, targetMinute, 0, 0);
    }
  }

  // E) Fallback Padrão: 15 dias a partir da data de origem ou hoje
  if (!targetDate) {
    let baseDate = new Date();
    if (baseDateStr) {
      if (baseDateStr.includes('/')) {
        const [d, m, y] = baseDateStr.split('/');
        baseDate = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
      } else if (/^\d{4}-\d{2}-\d{2}$/.test(baseDateStr)) {
        const [y, m, d] = baseDateStr.split('-');
        baseDate = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
      }
    }
    targetDate = new Date(baseDate.getTime() + 15 * 86400000);
    targetDate.setHours(targetHour, targetMinute, 0, 0);
  }

  // Data Inicial e Data Final do Evento (Duração de 1 hora)
  const dStart = targetDate;
  const dFinal = new Date(dStart.getTime() + 60 * 60 * 1000);

  const cleanNum = String(processNumber || '').replace(/\D/g, '') || 'proc';
  const eventTitleFull = `⚖️ [Prazo PJe] ${actionName} - Proc. ${processNumber || ''}`;
  const details = `Evento Processual: ${actionName}\nAção Necessária: ${actionRequired || movementText}\nProcesso: ${processNumber}\nData do Prazo: ${dStart.toLocaleDateString('pt-BR')} às ${dStart.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  const location = 'PJe CNJ / Tribunal de Justiça';

  const pad = (n) => n.toString().padStart(2, '0');
  const fmtUtc = (d) => `${d.getUTCFullYear()}${pad(d.getUTCMonth()+1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Synapse IPaaS Legal//PT',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:pje-${cleanNum}-${dStart.getTime()}@synapse.legal`,
    `DTSTAMP:${fmtUtc(new Date())}`,
    `DTSTART:${fmtUtc(dStart)}`,
    `DTEND:${fmtUtc(dFinal)}`,
    `SUMMARY:${eventTitleFull}`,
    `DESCRIPTION:${details.replace(/\n/g, '\\n')}`,
    `LOCATION:${location}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  const startIso = dStart.toISOString();
  const endIso = dFinal.toISOString();

  const gCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventTitleFull)}&dates=${fmtUtc(dStart)}/${fmtUtc(dFinal)}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(location)}`;
  const outlookWebUrl = `https://outlook.live.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent&subject=${encodeURIComponent(eventTitleFull)}&startdt=${startIso}&enddt=${endIso}&body=${encodeURIComponent(details)}&location=${encodeURIComponent(location)}`;
  const office365Url = `https://outlook.office.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent&subject=${encodeURIComponent(eventTitleFull)}&startdt=${startIso}&enddt=${endIso}&body=${encodeURIComponent(details)}&location=${encodeURIComponent(location)}`;
  const icsDataUrl = `data:text/calendar;charset=utf8,${encodeURIComponent(icsContent)}`;

  return {
    actionName,
    eventTitleFull,
    targetDateStr: dStart.toLocaleDateString('pt-BR'),
    targetTimeStr: dStart.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    gCalUrl,
    outlookWebUrl,
    office365Url,
    icsDataUrl,
    icsFileName: `prazo_${actionName.toLowerCase().replace(/\s+/g, '_')}_${cleanNum}.ics`
  };
}

// Testar com cenários reais
console.log('⚡ Testando a extração dinâmica de prazos e títulos de eventos...');

const testCases = [
  {
    processNumber: '0001234-56.2026.8.13.0024',
    actionRequired: 'Audiência de Conciliação',
    movementText: 'Designada audiência de conciliação para o dia 05/09/2026 às 14:30 na 2ª Vara Cível.',
    deadlineText: '05/09/2026 às 14:30'
  },
  {
    processNumber: '0005678-12.2026.8.13.0024',
    actionRequired: 'Apresentar Contestação',
    movementText: 'Intimação do Réu para apresentar contestação no prazo de 15 dias.',
    baseDateStr: '2026-08-18'
  },
  {
    processNumber: '0009999-88.2026.8.13.0024',
    actionRequired: 'Juntada de Documentos',
    movementText: 'Determino a juntada de documentos comprobatórios até 30 de agosto de 2026.',
    deadlineText: '30 de agosto de 2026'
  }
];

testCases.forEach((tc, idx) => {
  const res = extractLegalDeadlineAndEventTitle(tc);
  console.log(`\n--- Teste ${idx + 1} ---`);
  console.log(`• Evento Identificado: "${res.actionName}"`);
  console.log(`• Título do Evento: "${res.eventTitleFull}"`);
  console.log(`• Data Extraída: ${res.targetDateStr} às ${res.targetTimeStr}`);
  console.log(`• Google Calendar URL: ${res.gCalUrl.slice(0, 140)}...`);
});
