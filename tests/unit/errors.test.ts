import { describe, it, expect } from 'vitest';
import {
  ограничить,
  проверитьUrl,
  проверитьФайл,
  сообщениеОшибкиКамеры,
  ОшибкаПриложения,
} from '../../src/utils/errors';

describe('ограничить', () => {
  it('обрезает сверху и снизу', () => {
    expect(ограничить(150, 0, 100)).toBe(100);
    expect(ограничить(-1, 0, 100)).toBe(0);
    expect(ограничить(50, 0, 100)).toBe(50);
  });

  it('NaN → минимум', () => {
    expect(ограничить(Number.NaN, 0, 100)).toBe(0);
  });
});

describe('проверитьUrl', () => {
  it('принимает https', () => {
    expect(проверитьUrl('https://example.com/path')).toEqual({ ок: true });
  });

  it('отклоняет пустой', () => {
    const р = проверитьUrl('   ');
    expect(р.ок).toBe(false);
    if (!р.ок) expect(р.ошибка).toMatch(/пустым/i);
  });

  it('отклоняет некорректный', () => {
    const р = проверитьUrl('не адрес');
    expect(р.ок).toBe(false);
  });

  it('отклоняет ftp', () => {
    const р = проверитьUrl('ftp://files.example.com');
    expect(р.ок).toBe(false);
    if (!р.ок) expect(р.ошибка).toMatch(/http/i);
  });
});

describe('проверитьФайл', () => {
  it('принимает валидный png', () => {
    const файл = new File([new Uint8Array([1, 2, 3])], 'a.png', { type: 'image/png' });
    expect(проверитьФайл(файл)).toEqual({ ок: true });
  });

  it('отклоняет пустой файл', () => {
    const файл = new File([], 'пусто.png', { type: 'image/png' });
    const р = проверитьФайл(файл);
    expect(р.ок).toBe(false);
    if (!р.ок) expect(р.ошибка).toMatch(/пустой|повреждён/i);
  });

  it('отклоняет слишком большой', () => {
    const большой = new Uint8Array(2 * 1024 * 1024);
    const файл = new File([большой], 'big.png', { type: 'image/png' });
    const р = проверитьФайл(файл, { максРазмерМб: 1 });
    expect(р.ок).toBe(false);
    if (!р.ок) expect(р.ошибка).toMatch(/большой/i);
  });

  it('отклоняет неподдерживаемый тип', () => {
    const файл = new File([new Uint8Array([1])], 'a.exe', { type: 'application/octet-stream' });
    const р = проверитьФайл(файл);
    expect(р.ок).toBe(false);
  });
});

describe('сообщениеОшибкиКамеры', () => {
  it('возвращает текст ОшибкаПриложения', () => {
    const e = new ОшибкаПриложения('x', 'Камера недоступна');
    expect(сообщениеОшибкиКамеры(e)).toBe('Камера недоступна');
  });

  it('переводит NotAllowedError', () => {
    const e = new DOMException('denied', 'NotAllowedError');
    expect(сообщениеОшибкиКамеры(e)).toMatch(/запрещён/i);
  });

  it('переводит NotFoundError', () => {
    const e = new DOMException('missing', 'NotFoundError');
    expect(сообщениеОшибкиКамеры(e)).toMatch(/не найдена/i);
  });
});
