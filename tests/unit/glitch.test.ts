import { describe, it, expect } from 'vitest';
import {
  сдвигКаналов,
  сортировкаПикселей,
  сдвигПолос,
  применитьGlitch,
} from '../../src/filters/glitch';
import { применитьФильтр } from '../../src/filters';

function градиент(ширина: number, высота: number): ImageData {
  const данные = new Uint8ClampedArray(ширина * высота * 4);
  for (let y = 0; y < высота; y++) {
    for (let x = 0; x < ширина; x++) {
      const i = (y * ширина + x) * 4;
      const v = Math.round((x / Math.max(1, ширина - 1)) * 255);
      данные[i] = v;
      данные[i + 1] = 128;
      данные[i + 2] = 255 - v;
      данные[i + 3] = 255;
    }
  }
  return new ImageData(данные, ширина, высота);
}

describe('сдвигКаналов', () => {
  it('сохраняет размеры', () => {
    const вход = градиент(40, 20);
    const выход = сдвигКаналов(вход, 80);
    expect(выход.width).toBe(40);
    expect(выход.height).toBe(20);
  });

  it('при силе > 0 изменяет пиксели', () => {
    const вход = градиент(64, 16);
    const выход = сдвигКаналов(вход, 70);
    let отличий = 0;
    for (let i = 0; i < вход.data.length; i++) {
      if (вход.data[i] !== выход.data[i]) отличий++;
    }
    expect(отличий).toBeGreaterThan(0);
  });
});

describe('сортировкаПикселей', () => {
  it('не меняет размер буфера', () => {
    const вход = градиент(48, 24);
    const выход = сортировкаПикселей(вход, 90);
    expect(выход.data.length).toBe(вход.data.length);
  });

  it('детерминирована для одинаковой силы', () => {
    const вход = градиент(32, 16);
    const a = сортировкаПикселей(вход, 55);
    const b = сортировкаПикселей(вход, 55);
    expect(Array.from(a.data)).toEqual(Array.from(b.data));
  });
});

describe('сдвигПолос', () => {
  it('возвращает ImageData того же размера', () => {
    const вход = градиент(30, 30);
    const выход = сдвигПолос(вход, 60);
    expect(выход.width).toBe(30);
    expect(выход.height).toBe(30);
  });
});

describe('применитьGlitch', () => {
  it('при силе 0 копирует кадр', () => {
    const вход = градиент(20, 10);
    const выход = применитьGlitch(вход, 0);
    expect(Array.from(выход.data)).toEqual(Array.from(вход.data));
    expect(выход.data).not.toBe(вход.data);
  });

  it('при силе 100 искажает изображение', () => {
    const вход = градиент(64, 32);
    const выход = применитьGlitch(вход, 100);
    let отличий = 0;
    for (let i = 0; i < вход.data.length; i++) {
      if (вход.data[i] !== выход.data[i]) отличий++;
    }
    expect(отличий).toBeGreaterThan(100);
  });
});

describe('применитьФильтр', () => {
  it('маршрутизирует ascii', () => {
    const вход = градиент(16, 16);
    const выход = применитьФильтр(вход, 'ascii', 40);
    expect(выход.width).toBe(16);
  });

  it('маршрутизирует glitch', () => {
    const вход = градиент(16, 16);
    const выход = применитьФильтр(вход, 'glitch', 40);
    expect(выход.width).toBe(16);
  });
});
