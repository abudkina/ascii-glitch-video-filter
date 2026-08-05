/**
 * Простой логгер приложения.
 * В UI не показывается; только для диагностики в режиме разработки.
 */
type Уровень = 'отладка' | 'инфо' | 'предупреждение' | 'ошибка';

const префиксы: Record<Уровень, string> = {
  отладка: '[ОТЛАДКА]',
  инфо: '[ИНФО]',
  предупреждение: '[ПРЕДУПРЕЖДЕНИЕ]',
  ошибка: '[ОШИБКА]',
};

function форматировать(уровень: Уровень, сообщение: string, детали?: unknown): string {
  const время = new Date().toISOString();
  const база = `${время} ${префиксы[уровень]} ${сообщение}`;
  if (детали === undefined) return база;
  try {
    return `${база} | ${JSON.stringify(детали)}`;
  } catch {
    return `${база} | [несериализуемые детали]`;
  }
}

export const логгер = {
  отладка(сообщение: string, детали?: unknown): void {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.debug(форматировать('отладка', сообщение, детали));
    }
  },

  инфо(сообщение: string, детали?: unknown): void {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.info(форматировать('инфо', сообщение, детали));
    }
  },

  предупреждение(сообщение: string, детали?: unknown): void {
    // eslint-disable-next-line no-console
    console.warn(форматировать('предупреждение', сообщение, детали));
  },

  ошибка(сообщение: string, детали?: unknown): void {
    // eslint-disable-next-line no-console
    console.error(форматировать('ошибка', сообщение, детали));
  },
};
