/**
 * Avaliador de expressões de decisão para o nó de "Decisão"
 */

function getNestedValue(obj: any, path: string): any {
  if (!obj || !path) return undefined;
  const parts = path.split('.');
  let current = obj;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    current = current[part];
  }
  return current;
}

export interface DecisionConfig {
  field?: string;
  operator?: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'is_truthy';
  value?: any;
}

export function evaluateCondition(config: DecisionConfig, statePayload: any): boolean {
  if (!config || !config.field) {
    // Se nenhuma regra for configurada, consideramos verdadeiro por padrão
    return true;
  }

  const actualValue = getNestedValue(statePayload, config.field);
  const targetValue = config.value;
  const operator = config.operator || 'equals';

  switch (operator) {
    case 'equals':
      return String(actualValue).trim().toLowerCase() === String(targetValue).trim().toLowerCase();

    case 'not_equals':
      return String(actualValue).trim().toLowerCase() !== String(targetValue).trim().toLowerCase();

    case 'contains':
      if (typeof actualValue === 'string') {
        return actualValue.toLowerCase().includes(String(targetValue).toLowerCase());
      }
      if (Array.isArray(actualValue)) {
        return actualValue.includes(targetValue);
      }
      return false;

    case 'greater_than':
      return Number(actualValue) > Number(targetValue);

    case 'less_than':
      return Number(actualValue) < Number(targetValue);

    case 'is_truthy':
      return Boolean(actualValue);

    default:
      return false;
  }
}
