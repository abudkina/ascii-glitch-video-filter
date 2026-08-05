/**
 * Пользовательские ошибки с сообщениями на русском.
 */

export class ОшибкаПриложения extends Error {
  readonly код: string;
  readonly дляПользователя: string;

  constructor(код: string, дляПользователя: string, причина?: unknown) {
    super(дляПользователя);
    this.name = 'ОшибкаПриложения';
    this.код = код;
    this.дляПользователя = дляПользователя;
    if (причина !== undefined) {
      this.cause = причина;
    }
  }
}

/** Преобразует любую ошибку камеры в понятный русский текст */
export function сообщениеОшибкиКамеры(ошибка: unknown): string {
  if (ошибка instanceof ОшибкаПриложения) {
    return ошибка.дляПользователя;
  }

  if (ошибка instanceof DOMException) {
    switch (ошибка.name) {
      case 'NotAllowedError':
      case 'PermissionDeniedError':
        return 'Доступ к камере запрещён. Разрешите доступ в настройках браузера.';
      case 'NotFoundError':
      case 'DevicesNotFoundError':
        return 'Камера не найдена. Подключите устройство и попробуйте снова.';
      case 'NotReadableError':
      case 'TrackStartError':
        return 'Камера занята другим приложением. Закройте его и повторите.';
      case 'OverconstrainedError':
        return 'Камера не поддерживает запрошенные параметры.';
      case 'SecurityError':
        return 'Доступ к камере заблокирован политикой безопасности (нужен HTTPS или localhost).';
      case 'AbortError':
        return 'Запрос к камере был прерван.';
      default:
        return `Не удалось открыть камеру: ${ошибка.message || ошибка.name}`;
    }
  }

  if (ошибка instanceof Error) {
    return `Ошибка: ${ошибка.message}`;
  }

  return 'Произошла неизвестная ошибка. Попробуйте ещё раз.';
}

/** Сообщение об ошибке записи */
export function сообщениеОшибкиЗаписи(ошибка: unknown): string {
  if (ошибка instanceof ОшибкаПриложения) {
    return ошибка.дляПользователя;
  }
  if (ошибка instanceof Error) {
    return `Не удалось записать видео: ${ошибка.message}`;
  }
  return 'Не удалось записать видео. Попробуйте другой формат.';
}

/** Проверка валидности URL */
export function проверитьUrl(значение: string): { ок: true } | { ок: false; ошибка: string } {
  const обрезанное = значение.trim();
  if (!обрезанное) {
    return { ок: false, ошибка: 'Адрес не может быть пустым.' };
  }
  try {
    const url = new URL(обрезанное);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return { ок: false, ошибка: 'Разрешены только адреса http и https.' };
    }
    return { ок: true };
  } catch {
    return { ок: false, ошибка: 'Некорректный адрес. Пример: https://example.com' };
  }
}

/** Проверка файла изображения/видео */
export function проверитьФайл(
  файл: File,
  опции: { максРазмерМб?: number; типы?: string[] } = {},
): { ок: true } | { ок: false; ошибка: string } {
  const макс = (опции.максРазмерМб ?? 20) * 1024 * 1024;
  const типы = опции.типы ?? ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'video/webm', 'video/mp4'];

  if (!файл || !(файл instanceof File)) {
    return { ок: false, ошибка: 'Файл не выбран.' };
  }
  if (файл.size === 0) {
    return { ок: false, ошибка: 'Файл пустой или повреждён.' };
  }
  if (файл.size > макс) {
    return { ок: false, ошибка: `Файл слишком большой. Максимум ${опции.максРазмерМб ?? 20} МБ.` };
  }
  if (файл.type && !типы.includes(файл.type)) {
    return { ок: false, ошибка: `Формат «${файл.type}» не поддерживается.` };
  }
  return { ок: true };
}

/** Ограничение числа в диапазоне */
export function ограничить(значение: number, мин: number, макс: number): number {
  if (Number.isNaN(значение)) return мин;
  return Math.min(макс, Math.max(мин, значение));
}
