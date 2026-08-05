/**
 * Полифилл ImageData для jsdom (Vitest).
 */
class ImageDataPolyfill {
  readonly data: Uint8ClampedArray;
  readonly width: number;
  readonly height: number;
  readonly colorSpace: PredefinedColorSpace = 'srgb';

  constructor(dataOrWidth: Uint8ClampedArray | number, widthOrHeight?: number, height?: number) {
    if (typeof dataOrWidth === 'number') {
      this.width = dataOrWidth;
      this.height = widthOrHeight ?? 0;
      this.data = new Uint8ClampedArray(this.width * this.height * 4);
    } else {
      this.data = dataOrWidth;
      this.width = widthOrHeight ?? 0;
      this.height = height ?? 0;
    }
  }
}

const g = globalThis as typeof globalThis & { ImageData?: typeof ImageData };

if (typeof g.ImageData === 'undefined') {
  g.ImageData = ImageDataPolyfill as unknown as typeof ImageData;
}
