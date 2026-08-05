import { МенеджерКамеры } from '../camera/CameraManager';
import { МостФильтрВоркера } from '../workers/FilterWorkerBridge';
import { СервисЗаписи, скачатьBlob } from '../recorder/MediaRecorderService';
import { привязатьСвайп } from '../ui/swipe';
import { показатьТост } from '../ui/toast';
import { загрузитьНастройки, сохранитьНастройки } from '../utils/storage';
import { ограничить, ОшибкаПриложения } from '../utils/errors';
import { обрезатьВКвадрат } from '../utils/square';
import { логгер } from '../utils/logger';
import type { РежимФильтра, ФорматЗаписи } from '../types';

/**
 * Главное приложение: камера → фильтр → холст → запись / фотобудка.
 */
export class Приложение {
  private видео: HTMLVideoElement;
  private холст: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private буфер: HTMLCanvasElement;
  private буферCtx: CanvasRenderingContext2D;

  private камера: МенеджерКамеры;
  private воркер: МостФильтрВоркера;
  private запись: СервисЗаписи;

  private режим: РежимФильтра = 'ascii';
  private сила = 50;
  private формат: ФорматЗаписи = 'webm';
  private фотобудка = false;
  private анимацияId = 0;
  private последнийКадр: ImageData | null = null;
  private снятьСвайп: (() => void) | null = null;
  private идётЗапись = false;

  constructor() {
    this.видео = mustEl('видео-источник', HTMLVideoElement);
    this.холст = mustEl('холст-вывода', HTMLCanvasElement);
    const ctx = this.холст.getContext('2d', { willReadFrequently: false });
    if (!ctx) throw new ОшибкаПриложения('холст', 'Не удалось получить контекст холста.');
    this.ctx = ctx;

    this.буфер = document.createElement('canvas');
    const bctx = this.буфер.getContext('2d', { willReadFrequently: true });
    if (!bctx) throw new ОшибкаПриложения('буфер', 'Не удалось создать буферный холст.');
    this.буферCtx = bctx;

    this.камера = new МенеджерКамеры(this.видео);
    this.воркер = new МостФильтрВоркера();
    this.запись = new СервисЗаписи();
  }

  инициализировать(): void {
    const настройки = загрузитьНастройки();
    this.режим = настройки.режим;
    this.сила = настройки.сила;
    this.формат = настройки.формат;
    this.фотобудка = настройки.фотобудка;

    this.синхронизироватьUi();
    this.привязатьСобытия();
    this.нарисоватьЗаглушку();

    const зона = mustEl('зона-свайпа', HTMLElement);
    this.снятьСвайп = привязатьСвайп(зона, (режим) => this.установитьРежим(режим));

    логгер.инфо('Приложение инициализировано');
  }

  уничтожить(): void {
    cancelAnimationFrame(this.анимацияId);
    void this.камера.выключить();
    this.воркер.уничтожить();
    this.снятьСвайп?.();
  }

  private привязатьСобытия(): void {
    mustEl('кнопка-камера', HTMLButtonElement).addEventListener('click', () => {
      void this.включитьКамеру();
    });
    mustEl('кнопка-стоп', HTMLButtonElement).addEventListener('click', () => {
      void this.остановитьКамеру();
    });
    mustEl('режим-ascii', HTMLButtonElement).addEventListener('click', () => {
      this.установитьРежим('ascii');
    });
    mustEl('режим-glitch', HTMLButtonElement).addEventListener('click', () => {
      this.установитьРежим('glitch');
    });

    const слайдер = mustEl('сила-эффекта', HTMLInputElement);
    слайдер.addEventListener('input', () => {
      this.сила = ограничить(Number(слайдер.value), 0, 100);
      слайдер.setAttribute('aria-valuenow', String(this.сила));
      mustEl('сила-значение', HTMLElement).textContent = String(this.сила);
      this.сохранить();
    });

    const фотобудка = mustEl('фотобудка', HTMLInputElement);
    фотобудка.addEventListener('change', () => {
      this.фотобудка = фотобудка.checked;
      if (this.фотобудка) {
        this.формат = 'gif';
        mustEl('формат-записи', HTMLSelectElement).value = 'gif';
        mustEl('формат-записи', HTMLSelectElement).disabled = true;
        показатьТост('Фотобудка: квадратный GIF-стикер', 'инфо');
      } else {
        mustEl('формат-записи', HTMLSelectElement).disabled = false;
      }
      this.синхронизироватьUi();
      this.сохранить();
      this.обновитьКнопкуЗаписи();
    });

    const формат = mustEl('формат-записи', HTMLSelectElement);
    формат.addEventListener('change', () => {
      const v = формат.value;
      if (v === 'webm' || v === 'gif') {
        this.формат = v;
        this.сохранить();
      } else {
        показатьТост('Неизвестный формат записи.', 'ошибка');
        формат.value = this.формат;
      }
    });

    mustEl('кнопка-запись', HTMLButtonElement).addEventListener('click', () => {
      void this.начатьЗапись();
    });
    mustEl('кнопка-скачать', HTMLButtonElement).addEventListener('click', () => {
      this.скачать();
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') this.установитьРежим('ascii');
      if (e.key === 'ArrowRight') this.установитьРежим('glitch');
    });
  }

  private сохранить(): void {
    сохранитьНастройки({
      режим: this.режим,
      сила: this.сила,
      формат: this.формат,
      фотобудка: this.фотобудка,
    });
  }

  private синхронизироватьUi(): void {
    const ascii = mustEl('режим-ascii', HTMLButtonElement);
    const glitch = mustEl('режим-glitch', HTMLButtonElement);
    ascii.classList.toggle('сегмент--активный', this.режим === 'ascii');
    glitch.classList.toggle('сегмент--активный', this.режим === 'glitch');
    ascii.setAttribute('aria-checked', String(this.режим === 'ascii'));
    glitch.setAttribute('aria-checked', String(this.режим === 'glitch'));

    const бейдж = mustEl('бейдж-режима', HTMLElement);
    бейдж.textContent = this.режим === 'ascii' ? 'Матрица' : 'Киберпанк';
    бейдж.dataset.режим = this.режим;

    const слайдер = mustEl('сила-эффекта', HTMLInputElement);
    слайдер.value = String(this.сила);
    слайдер.setAttribute('aria-valuenow', String(this.сила));
    mustEl('сила-значение', HTMLElement).textContent = String(this.сила);

    const чек = mustEl('фотобудка', HTMLInputElement);
    чек.checked = this.фотобудка;

    const селектФормат = mustEl('формат-записи', HTMLSelectElement);
    if (this.фотобудка) {
      this.формат = 'gif';
      селектФормат.value = 'gif';
      селектФормат.disabled = true;
    } else {
      селектФормат.disabled = false;
      селектФормат.value = this.формат;
    }

    const зона = mustEl('зона-свайпа', HTMLElement);
    зона.classList.toggle('зона--матрица', this.режим === 'ascii');
    зона.classList.toggle('зона--глитч', this.режим === 'glitch');
    зона.classList.toggle('зона--фотобудка', this.фотобудка);

    const рамка = mustEl('рамка-стикера', HTMLElement);
    рамка.hidden = !this.фотобудка;
    рамка.setAttribute('aria-hidden', String(!this.фотобудка));

    this.обновитьКнопкуЗаписи();
  }

  private обновитьКнопкуЗаписи(): void {
    const кнопка = mustEl('кнопка-запись', HTMLButtonElement);
    if (this.идётЗапись) return;
    кнопка.textContent = this.фотобудка ? 'Стикер' : 'Записать';
    кнопка.setAttribute(
      'aria-label',
      this.фотобудка ? 'Записать квадратный стикер' : 'Начать запись',
    );
  }

  установитьРежим(режим: РежимФильтра): void {
    if (this.режим === режим) return;
    this.режим = режим;
    this.синхронизироватьUi();
    this.сохранить();
    показатьТост(
      режим === 'ascii' ? 'Режим: Матрица (ASCII)' : 'Режим: Киберпанк (глитч)',
      'инфо',
    );
  }

  private async включитьКамеру(): Promise<void> {
    this.статус('Подключение к камере…');
    try {
      await this.камера.включить();
      mustEl('кнопка-камера', HTMLButtonElement).disabled = true;
      mustEl('кнопка-стоп', HTMLButtonElement).disabled = false;
      mustEl('кнопка-запись', HTMLButtonElement).disabled = false;
      this.статус(
        this.фотобудка
          ? 'Фотобудка активна. Лицо в квадрате — затем «Стикер».'
          : 'Камера активна. Свайпайте по экрану для смены режима.',
      );
      this.запуститьЦикл();
    } catch (ошибка) {
      const текст =
        ошибка instanceof ОшибкаПриложения
          ? ошибка.дляПользователя
          : 'Не удалось включить камеру.';
      this.статус(текст);
      показатьТост(текст, 'ошибка');
    }
  }

  private async остановитьКамеру(): Promise<void> {
    cancelAnimationFrame(this.анимацияId);
    await this.камера.выключить();
    mustEl('кнопка-камера', HTMLButtonElement).disabled = false;
    mustEl('кнопка-стоп', HTMLButtonElement).disabled = true;
    mustEl('кнопка-запись', HTMLButtonElement).disabled = true;
    this.статус('Камера остановлена');
    this.нарисоватьЗаглушку();
  }

  private запуститьЦикл(): void {
    cancelAnimationFrame(this.анимацияId);

    const кадр = () => {
      this.анимацияId = requestAnimationFrame(кадр);
      if (!this.камера.активна) return;
      if (this.видео.readyState < 2) return;

      const { ширина, высота } = this.камера.размеры();
      if (ширина === 0 || высота === 0) return;

      const макс = window.innerWidth < 768 ? 320 : 480;
      const масштаб = Math.min(1, макс / ширина);
      const w = Math.max(1, Math.round(ширина * масштаб));
      const h = Math.max(1, Math.round(высота * масштаб));

      if (this.буфер.width !== w || this.буфер.height !== h) {
        this.буфер.width = w;
        this.буфер.height = h;
      }

      this.буферCtx.drawImage(this.видео, 0, 0, w, h);
      let исходные = this.буферCtx.getImageData(0, 0, w, h);

      if (this.фотобудка) {
        исходные = обрезатьВКвадрат(исходные);
      }

      if (this.холст.width !== исходные.width || this.холст.height !== исходные.height) {
        this.холст.width = исходные.width;
        this.холст.height = исходные.height;
      }

      this.воркер.обработать(
        исходные,
        this.режим,
        this.сила,
        (результат) => {
          this.последнийКадр = результат;
          this.ctx.putImageData(результат, 0, 0);
        },
        (сообщение) => {
          логгер.ошибка('Ошибка фильтра', сообщение);
        },
      );
    };

    this.анимацияId = requestAnimationFrame(кадр);
  }

  private async начатьЗапись(): Promise<void> {
    if (!this.камера.активна) {
      показатьТост('Сначала включите камеру.', 'ошибка');
      return;
    }
    if (this.идётЗапись) {
      показатьТост('Запись уже идёт.', 'ошибка');
      return;
    }

    this.идётЗапись = true;
    const кнопка = mustEl('кнопка-запись', HTMLButtonElement);
    кнопка.disabled = true;
    кнопка.textContent = this.фотобудка ? 'Стикер…' : 'Запись…';
    this.статус(
      this.фотобудка ? 'Запись стикера (2 секунды)…' : 'Идёт запись (3 секунды)…',
    );

    try {
      await this.запись.начать(this.холст, this.формат, () => this.последнийКадр, {
        фотобудка: this.фотобудка,
      });
      mustEl('кнопка-скачать', HTMLButtonElement).disabled = false;
      this.статус(
        this.фотобудка
          ? 'Стикер готов — можно скачать.'
          : 'Запись готова — можно скачать.',
      );
      показатьТост(this.фотобудка ? 'Стикер готов!' : 'Запись готова!', 'успех');
    } catch (ошибка) {
      const текст =
        ошибка instanceof ОшибкаПриложения
          ? ошибка.дляПользователя
          : 'Не удалось записать.';
      this.статус(текст);
      показатьТост(текст, 'ошибка');
    } finally {
      this.идётЗапись = false;
      кнопка.disabled = false;
      this.обновитьКнопкуЗаписи();
    }
  }

  private скачать(): void {
    const blob = this.запись.результат;
    if (!blob) {
      показатьТост(
        this.фотобудка
          ? 'Нет стикера. Сначала нажмите «Стикер».'
          : 'Нет готовой записи. Сначала нажмите «Записать».',
        'ошибка',
      );
      return;
    }
    const расширение = this.запись.формат === 'gif' ? 'gif' : 'webm';
    const префикс = this.запись.фотобудка ? 'стикер' : 'ascii-glitch';
    const имя = `${префикс}-${Date.now()}.${расширение}`;
    try {
      скачатьBlob(blob, имя);
      показатьТост('Файл скачивается…', 'успех');
    } catch (ошибка) {
      логгер.ошибка('Ошибка скачивания', ошибка);
      показатьТост('Не удалось скачать файл.', 'ошибка');
    }
  }

  private статус(текст: string): void {
    mustEl('статус', HTMLElement).textContent = текст;
  }

  private нарисоватьЗаглушку(): void {
    const сторона = this.фотобудка ? 320 : 640;
    const w = this.фотобудка ? сторона : this.холст.width || 640;
    const h = this.фотобудка ? сторона : this.холст.height || 480;
    this.холст.width = w;
    this.холст.height = h;
    this.ctx.fillStyle = '#050805';
    this.ctx.fillRect(0, 0, w, h);
    this.ctx.fillStyle = '#1aff6a';
    this.ctx.font = '600 14px "IBM Plex Mono", monospace';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(
      this.фотобудка ? 'Фотобудка: включите камеру' : 'Включите камеру',
      w / 2,
      h / 2,
    );
  }
}

function mustEl<T extends HTMLElement>(id: string, ctor: { new (): T; prototype: T }): T {
  const el = document.getElementById(id);
  if (!el || !(el instanceof ctor)) {
    throw new ОшибкаПриложения('dom', `Элемент «${id}» не найден.`);
  }
  return el;
}
