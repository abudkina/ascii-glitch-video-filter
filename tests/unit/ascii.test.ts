import { describe, it, expect } from 'vitest';
import {
  яркостьПикселя,
  размерБлока,
  индексСимвола,
  применитьAscii,
  кадрВТекстAscii,
  СИМВОЛЫ_ASCII,
} from '../../src/filters/ascii';

function создатьImageData(ширина: number, высота: number, r = 0, g = 0, b = 0): ImageData {
  const данные = new Uint8ClampedArray(ширина * высота * 4);
  for (let i = 0; i < данные.length; i += 4) {
    данные[i] = r;
    данные[i + 1] = g;
    данные[i + 2] = b;
    данные[i + 3] = 255;
  }
  return new ImageData(данные, ширина, высота);
}

describe('яркостьПикселя', () => {
  it('чёрный = 0', () => {
    expect(яркостьПикселя(0, 0, 0)).toBe(0);
  });

  it('белый = 255', () => {
    expect(яркостьПикселя(255, 255, 255)).toBe(255);
  });

  it('учитывает веса каналов', () => {
    const ярG = яркостьПикселя(0, 255, 0);
    const ярR = яркостьПикселя(255, 0, 0);
    expect(ярG).toBeGreaterThan(ярR);
  });
});

describe('размерБлока', () => {
  it('на силе 0 возвращает минимум', () => {
    expect(размерБлока(0)).toBe(4);
  });

  it('на силе 100 возвращает максимум', () => {
    expect(размерБлока(100)).toBe(16);
  });

  it('растёт с силой', () => {
    expect(размерБлока(50)).toBeGreaterThan(размерБлока(10));
  });
});

describe('индексСимвола', () => {
  it('для 0 — первый символ', () => {
    expect(индексСимвола(0)).toBe(0);
  });

  it('для 255 — последний символ', () => {
    expect(индексСимвола(255)).toBe(СИМВОЛЫ_ASCII.length - 1);
  });
});

describe('применитьAscii', () => {
  it('сохраняет размеры кадра', () => {
    const вход = создатьImageData(32, 24, 128, 128, 128);
    const выход = применитьAscii(вход, 50);
    expect(выход.width).toBe(32);
    expect(выход.height).toBe(24);
  });

  it('рисует зелёный канал ярче красного на светлом кадре', () => {
    const вход = создатьImageData(16, 16, 255, 255, 255);
    const выход = применитьAscii(вход, 40);
    let суммаG = 0;
    let суммаR = 0;
    for (let i = 0; i < выход.data.length; i += 4) {
      суммаR += выход.data[i]!;
      суммаG += выход.data[i + 1]!;
    }
    expect(суммаG).toBeGreaterThan(суммаR);
  });

  it('тёмный кадр остаётся почти чёрным', () => {
    const вход = создатьImageData(16, 16, 0, 0, 0);
    const выход = применитьAscii(вход, 50);
    let ярких = 0;
    for (let i = 0; i < выход.data.length; i += 4) {
      if (выход.data[i + 1]! > 50) ярких++;
    }
    expect(ярких).toBe(0);
  });
});

describe('кадрВТекстAscii', () => {
  it('возвращает непустую строку', () => {
    const вход = создатьImageData(32, 16, 200, 200, 200);
    const текст = кадрВТекстAscii(вход.data, 32, 16, 50);
    expect(текст.length).toBeGreaterThan(0);
    expect(текст.includes('\n')).toBe(true);
  });

  it('для чёрного кадра использует тёмные символы', () => {
    const вход = создатьImageData(16, 8, 0, 0, 0);
    const текст = кадрВТекстAscii(вход.data, 16, 8, 0);
    const первый = текст.replace(/\n/g, '')[0];
    expect(первый).toBe(СИМВОЛЫ_ASCII[0]);
  });
});
