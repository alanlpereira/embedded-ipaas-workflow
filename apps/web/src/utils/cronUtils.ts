import { ScheduleNodeConfig } from '@ipaas/shared-types';

export interface ScheduleInputData {
  recurrenceType: 'daily' | 'weekly' | 'monthly';
  time: string; // "HH:MM" ex: "09:00"
  daysOfWeek?: number[]; // [0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sáb]
  dayOfMonth?: number; // 1-31
}

/**
 * Converte as opções da UI em uma expressão Cron de 5 campos (minutagem hora dia-do-mês mês dia-da-semana).
 */
export function generateCronExpression(data: ScheduleInputData): string {
  const timeStr = data.time || '09:00';
  const parts = timeStr.split(':');
  const minute = parseInt(parts[1], 10) || 0;
  const hour = parseInt(parts[0], 10) || 0;

  if (data.recurrenceType === 'daily') {
    return `${minute} ${hour} * * *`;
  }

  if (data.recurrenceType === 'weekly') {
    const days = data.daysOfWeek && data.daysOfWeek.length > 0
      ? [...data.daysOfWeek].sort((a, b) => a - b).join(',')
      : '*';
    return `${minute} ${hour} * * ${days}`;
  }

  if (data.recurrenceType === 'monthly') {
    const dom = Math.min(31, Math.max(1, data.dayOfMonth || 1));
    return `${minute} ${hour} ${dom} * *`;
  }

  return `${minute} ${hour} * * *`;
}

const DAY_NAMES_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const DAY_NAMES_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Retorna uma descrição em linguagem natural do agendamento configurado.
 */
export function formatScheduleSummary(config?: ScheduleNodeConfig, lang: 'pt' | 'en' = 'pt'): string {
  if (!config) return lang === 'en' ? 'Cron: * * * * *' : 'Cron: * * * * *';

  const time = config.time || '09:00';
  const days = lang === 'en' ? DAY_NAMES_EN : DAY_NAMES_PT;

  if (config.recurrenceType === 'daily') {
    return lang === 'en' ? `Daily at ${time}` : `Diário às ${time}`;
  }

  if (config.recurrenceType === 'weekly') {
    const selectedDays = (config.daysOfWeek || []).map((d) => days[d]).join(', ');
    return lang === 'en'
      ? `Weekly (${selectedDays || 'All'}) at ${time}`
      : `Semanal (${selectedDays || 'Todos'}) às ${time}`;
  }

  if (config.recurrenceType === 'monthly') {
    const dom = config.dayOfMonth || 1;
    return lang === 'en'
      ? `Monthly (Day ${dom}) at ${time}`
      : `Mensal (Dia ${dom}) às ${time}`;
  }

  return `Cron: ${config.cronExpression || '* * * * *'}`;
}
