import { describe, it, expect } from 'vitest';
import { кодироватьGif } from '../../src/recorder/GifEncoder';

describe('кодироватьGif', () => {
  it('создаёт Blob типа image/gif', () => {
    const ширина = 8;
    const высота = 8;
    const данные = new Uint8ClampedArray(ширина * высота * 4);
    for (let i = 0; i < данные.length; i += 4) {
      данные[i] = 0;
      данные[i + 1] = 255;
      данные[i + 2] = 0;
      данные[i + 3] = 255;
    }

    const blob = кодироватьGif([
      { данные, ширина, высота, задержкаСс: 10 },
      { данные: new Uint8ClampedArray(данные), ширина, высота, задержкаСс: 10 },
    ]);

    expect(blob.type).toBe('image/gif');
    expect(blob.size).toBeGreaterThan(20);
  });

  it('бросает ошибку без кадров', () => {
    expect(() => кодироватьGif([])).toThrow();
  });
});
