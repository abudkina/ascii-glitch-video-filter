import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import { применитьAscii } from '../../src/filters/ascii';
import { применитьGlitch } from '../../src/filters/glitch';
import { кодироватьGifБайты } from '../../src/recorder/GifEncoder';

describe('генерация demo-loop.gif', () => {
  it('пишет файл в docs/', () => {
    const w = 120;
    const h = 90;
    const кадры = [];

    for (let f = 0; f < 10; f++) {
      const данные = new Uint8ClampedArray(w * h * 4);
      const фаза = f * 0.5;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4;
          const dx = x / w - 0.5;
          const dy = y / h - 0.5;
          const r = Math.sqrt(dx * dx + dy * dy);
          const v = Math.round(30 + Math.max(0, 1 - r * 1.4) * (120 + 80 * Math.sin(r * 10 - фаза)));
          данные[i] = v;
          данные[i + 1] = v;
          данные[i + 2] = v;
          данные[i + 3] = 255;
        }
      }
      const исходный = new ImageData(данные, w, h);
      const кадр = f < 5 ? применитьAscii(исходный, 60) : применитьGlitch(исходный, 70);
      кадры.push({ данные: кадр.data, ширина: w, высота: h, задержкаСс: 14 });
    }

    const bytes = кодироватьGifБайты(кадры);
    mkdirSync(resolve('docs'), { recursive: true });
    writeFileSync(resolve('docs/demo-loop.gif'), Buffer.from(bytes));
    expect(bytes.length).toBeGreaterThan(100);
  });
});
