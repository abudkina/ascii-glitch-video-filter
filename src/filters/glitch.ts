/**
 * Glitch-фильтр: пиксельная сортировка по яркости и сдвиг RGB-каналов.
 * Вайб — киберпанк.
 */

import { яркостьПикселя } from './ascii';
import { ограничить } from '../utils/errors';

/**
 * Сдвиг RGB-каналов: красный влево, синий вправо.
 * @param сила 0–100
 */
export function сдвигКаналов(исходные: ImageData, сила: number): ImageData {
  const { width: ширина, height: высота, data: вход } = исходные;
  const выход = new ImageData(ширина, высота);
  const сдвиг = Math.round((сила / 100) * Math.max(2, ширина * 0.08));

  for (let y = 0; y < высота; y++) {
    for (let x = 0; x < ширина; x++) {
      const i = (y * ширина + x) * 4;
      const xR = ограничить(x - сдвиг, 0, ширина - 1);
      const xB = ограничить(x + сдвиг, 0, ширина - 1);
      const iR = (y * ширина + xR) * 4;
      const iB = (y * ширина + xB) * 4;

      выход.data[i] = вход[iR]!; // R со сдвигом влево
      выход.data[i + 1] = вход[i + 1]!; // G на месте
      выход.data[i + 2] = вход[iB + 2]!; // B со сдвигом вправо
      выход.data[i + 3] = 255;
    }
  }

  return выход;
}

/**
 * Сортировка пикселей в строке по яркости на случайных сегментах.
 * @param сила 0–100 — доля строк и длина сегментов
 */
export function сортировкаПикселей(исходные: ImageData, сила: number): ImageData {
  const { width: ширина, height: высота } = исходные;
  const выход = new ImageData(new Uint8ClampedArray(исходные.data), ширина, высота);
  const data = выход.data;

  const доляСтрок = 0.1 + (сила / 100) * 0.7;
  const максДлина = Math.max(8, Math.round((сила / 100) * ширина * 0.6));

  // Детерминированный «рандом» от силы и номера строки (стабильные кадры для тестов)
  const семя = Math.floor(сила * 97);

  for (let y = 0; y < высота; y++) {
    const хэш = (y * 1103515245 + семя) >>> 0;
    if ((хэш % 1000) / 1000 > доляСтрок) continue;

    const длина = 8 + (хэш % Math.max(1, максДлина - 7));
    const старт = хэш % Math.max(1, ширина - длина);
    const конец = Math.min(ширина, старт + длина);

    const пиксели: { яр: number; r: number; g: number; b: number; a: number }[] = [];
    for (let x = старт; x < конец; x++) {
      const i = (y * ширина + x) * 4;
      const r = data[i]!;
      const g = data[i + 1]!;
      const b = data[i + 2]!;
      const a = data[i + 3]!;
      пиксели.push({ яр: яркостьПикселя(r, g, b), r, g, b, a });
    }

    пиксели.sort((a, b) => a.яр - b.яр);

    for (let k = 0; k < пиксели.length; k++) {
      const x = старт + k;
      const i = (y * ширина + x) * 4;
      const p = пиксели[k]!;
      data[i] = p.r;
      data[i + 1] = p.g;
      data[i + 2] = p.b;
      data[i + 3] = p.a;
    }
  }

  return выход;
}

/**
 * Горизонтальные «срезы» — сдвиг целых полос (глитч-артефакт).
 */
export function сдвигПолос(исходные: ImageData, сила: number): ImageData {
  const { width: ширина, height: высота } = исходные;
  const выход = new ImageData(new Uint8ClampedArray(исходные.data), ширина, высота);
  const data = выход.data;
  const копия = new Uint8ClampedArray(исходные.data);

  const числоПолос = Math.round(1 + (сила / 100) * 8);
  const максСдвиг = Math.round((сила / 100) * ширина * 0.15);
  const семя = Math.floor(сила * 53);

  for (let n = 0; n < числоПолос; n++) {
    const хэш = (n * 2654435761 + семя) >>> 0;
    const y0 = хэш % высота;
    const h = 2 + (хэш % Math.max(2, Math.round(высота * 0.08)));
    const dx = (хэш % (максСдвиг * 2 + 1)) - максСдвиг;

    for (let y = y0; y < Math.min(высота, y0 + h); y++) {
      for (let x = 0; x < ширина; x++) {
        const sx = (x + dx + ширина) % ширина;
        const di = (y * ширина + x) * 4;
        const si = (y * ширина + sx) * 4;
        data[di] = копия[si]!;
        data[di + 1] = копия[si + 1]!;
        data[di + 2] = копия[si + 2]!;
        data[di + 3] = копия[si + 3]!;
      }
    }
  }

  return выход;
}

/** Полный пайплайн глитч-эффекта */
export function применитьGlitch(исходные: ImageData, сила: number): ImageData {
  const s = ограничить(сила, 0, 100);
  if (s === 0) {
    return new ImageData(new Uint8ClampedArray(исходные.data), исходные.width, исходные.height);
  }

  let кадр = сдвигКаналов(исходные, s);
  кадр = сортировкаПикселей(кадр, s);
  if (s > 30) {
    кадр = сдвигПолос(кадр, s);
  }
  return кадр;
}
