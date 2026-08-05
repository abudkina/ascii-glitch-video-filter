import { кодироватьGif, type КадрGif } from './GifEncoder';
import { ОшибкаПриложения, сообщениеОшибкиЗаписи } from '../utils/errors';
import { логгер } from '../utils/logger';
import type { ФорматЗаписи, СостояниеЗаписи } from '../types';

const ДЛИТЕЛЬНОСТЬ_МС = 3000;

/**
 * Запись короткой петли: WebM через MediaRecorder или GIF через захват кадров.
 */
export class СервисЗаписи {
  private рекордер: MediaRecorder | null = null;
  private куски: Blob[] = [];
  private кадрыGif: КадрGif[] = [];
  private таймер: ReturnType<typeof setTimeout> | null = null;
  private интервалGif: ReturnType<typeof setInterval> | null = null;
  private _состояние: СостояниеЗаписи = 'ожидание';
  private _результат: Blob | null = null;
  private _формат: ФорматЗаписи = 'webm';

  get состояние(): СостояниеЗаписи {
    return this._состояние;
  }

  get результат(): Blob | null {
    return this._результат;
  }

  get формат(): ФорматЗаписи {
    return this._формат;
  }

  /**
   * Начать запись с холста.
   * Для WebM — захват потока холста; для GIF — сэмплирование ImageData.
   */
  async начать(
    холст: HTMLCanvasElement,
    формат: ФорматЗаписи,
    получитьКадр: () => ImageData | null,
  ): Promise<void> {
    if (this._состояние === 'запись') {
      throw new ОшибкаПриложения('запись-идёт', 'Запись уже идёт.');
    }

    this._формат = формат;
    this._результат = null;
    this.куски = [];
    this.кадрыGif = [];
    this._состояние = 'запись';

    try {
      if (формат === 'webm') {
        await this.записатьWebm(холст);
      } else {
        await this.записатьGif(получитьКадр);
      }
    } catch (ошибка) {
      this._состояние = 'ошибка';
      this.очиститьТаймеры();
      логгер.ошибка('Ошибка записи', ошибка);
      throw new ОшибкаПриложения('запись', сообщениеОшибкиЗаписи(ошибка), ошибка);
    }
  }

  /** Принудительная остановка */
  остановить(): void {
    if (this.рекордер && this.рекордер.state !== 'inactive') {
      this.рекордер.stop();
    }
    this.очиститьТаймеры();
  }

  private очиститьТаймеры(): void {
    if (this.таймер) {
      clearTimeout(this.таймер);
      this.таймер = null;
    }
    if (this.интервалGif) {
      clearInterval(this.интервалGif);
      this.интервалGif = null;
    }
  }

  private async записатьWebm(холст: HTMLCanvasElement): Promise<void> {
    if (typeof MediaRecorder === 'undefined') {
      throw new ОшибкаПриложения('медиарекордер', 'MediaRecorder не поддерживается в этом браузере.');
    }

    const поток = холст.captureStream(15);
    const mime = подобратьMimeWebm();
    if (!mime) {
      throw new ОшибкаПриложения(
        'формат-webm',
        'Запись WebM не поддерживается. Выберите формат GIF.',
      );
    }

    this.рекордер = new MediaRecorder(поток, { mimeType: mime, videoBitsPerSecond: 1_500_000 });
    this.куски = [];

    const готово = new Promise<Blob>((resolve, reject) => {
      this.рекордер!.ondataavailable = (e) => {
        if (e.data.size > 0) this.куски.push(e.data);
      };
      this.рекордер!.onerror = () => {
        reject(new ОшибкаПриложения('запись-webm', 'Сбой MediaRecorder.'));
      };
      this.рекордер!.onstop = () => {
        const blob = new Blob(this.куски, { type: mime });
        resolve(blob);
      };
    });

    this.рекордер.start(200);
    await ждать(ДЛИТЕЛЬНОСТЬ_МС);
    if (this.рекордер.state !== 'inactive') {
      this.рекордер.stop();
    }

    this._результат = await готово;
    this._состояние = 'готово';
    логгер.инфо('WebM запись готова', { размер: this._результат.size });
  }

  private async записатьGif(получитьКадр: () => ImageData | null): Promise<void> {
    const готово = new Promise<Blob>((resolve, reject) => {
      const старт = Date.now();
      this.интервалGif = setInterval(() => {
        try {
          const кадр = получитьКадр();
          if (кадр) {
            // Уменьшаем для лёгкого GIF
            const уменьшенный = уменьшитьКадр(кадр, 240);
            this.кадрыGif.push({
              данные: уменьшенный.data,
              ширина: уменьшенный.width,
              высота: уменьшенный.height,
              задержкаСс: 10,
            });
          }
          if (Date.now() - старт >= ДЛИТЕЛЬНОСТЬ_МС) {
            this.очиститьТаймеры();
            try {
              const blob = кодироватьGif(this.кадрыGif);
              resolve(blob);
            } catch (e) {
              reject(e);
            }
          }
        } catch (e) {
          this.очиститьТаймеры();
          reject(e);
        }
      }, 100);
    });

    this._результат = await готово;
    this._состояние = 'готово';
    логгер.инфо('GIF запись готова', { кадров: this.кадрыGif.length, размер: this._результат.size });
  }
}

function подобратьMimeWebm(): string | null {
  const варианты = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ];
  for (const m of варианты) {
    if (MediaRecorder.isTypeSupported(m)) return m;
  }
  return null;
}

function ждать(мс: number): Promise<void> {
  return new Promise((r) => setTimeout(r, мс));
}

/** Уменьшение кадра для GIF через временный canvas */
function уменьшитьКадр(кадр: ImageData, максШирина: number): ImageData {
  if (кадр.width <= максШирина) {
    return new ImageData(new Uint8ClampedArray(кадр.data), кадр.width, кадр.height);
  }

  const масштаб = максШирина / кадр.width;
  const w = максШирина;
  const h = Math.max(1, Math.round(кадр.height * масштаб));

  const источник = document.createElement('canvas');
  источник.width = кадр.width;
  источник.height = кадр.height;
  источник.getContext('2d')!.putImageData(кадр, 0, 0);

  const цель = document.createElement('canvas');
  цель.width = w;
  цель.height = h;
  const ctx = цель.getContext('2d')!;
  ctx.drawImage(источник, 0, 0, w, h);
  return ctx.getImageData(0, 0, w, h);
}

/** Скачать Blob как файл */
export function скачатьBlob(blob: Blob, имяФайла: string): void {
  const url = URL.createObjectURL(blob);
  const ссылка = document.createElement('a');
  ссылка.href = url;
  ссылка.download = имяФайла;
  ссылка.rel = 'noopener';
  document.body.appendChild(ссылка);
  ссылка.click();
  ссылка.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
