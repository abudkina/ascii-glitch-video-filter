import { МенеджерКамеры } from '../camera/CameraManager';
import { МостФильтрВоркера } from '../workers/FilterWorkerBridge';
import { СервисЗаписи, скачатьBlob } from '../recorder/MediaRecorderService';
import { привязатьСвайп } from '../ui/swipe';
import { показатьТост } from '../ui/toast';
import { загрузитьНастройки, сохранитьНастройки } from '../utils/storage';
import { ограничить, ОшибкаПриложения } from '../utils/errors';
import { логгер } from '../utils/logger';
import type { РежимФильтра, ФорматЗаписи } from '../types';

/**
 * Главное приложение: камера → фильтр → холст → запись.
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

    // Клавиатура: стрелки для смены режима
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

    mustEl('формат-записи', HTMLSelectElement).value = this.формат;

    const зона = mustEl('зона-свайпа', HTMLElement);
    зона.classList.toggle('зона--матрица', this.режим === 'ascii');
    зона.classList.toggle('зона--глитч', this.режим === 'glitch');
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
      this.статус('Камера активна. Свайпайте по экрану для смены режима.');
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

      // Масштаб для производительности на слабых устройствах
      const макс = window.innerWidth < 768 ? 320 : 480;
      const масштаб = Math.min(1, макс / ширина);
      const w = Math.max(1, Math.round(ширина * масштаб));
      const h = Math.max(1, Math.round(высота * масштаб));

      if (this.буфер.width !== w || this.буфер.height !== h) {
        this.буфер.width = w;
        this.буфер.height = h;
        this.холст.width = w;
        this.холст.height = h;
      }

      this.буферCtx.drawImage(this.видео, 0, 0, w, h);
      const исходные = this.буферCtx.getImageData(0, 0, w, h);

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
    кнопка.textContent = 'Запись…';
    this.статус('Идёт запись (3 секунды)…');

    try {
      await this.запись.начать(this.холст, this.формат, () => this.последнийКадр);
      mustEl('кнопка-скачать', HTMLButtonElement).disabled = false;
      this.статус('Запись готова — можно скачать.');
      показатьТост('Запись готова!', 'успех');
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
      кнопка.textContent = 'Записать';
    }
  }

  private скачать(): void {
    const blob = this.запись.результат;
    if (!blob) {
      показатьТост('Нет готовой записи. Сначала нажмите «Записать».', 'ошибка');
      return;
    }
    const расширение = this.запись.формат === 'gif' ? 'gif' : 'webm';
    const имя = `ascii-glitch-${Date.now()}.${расширение}`;
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
    const w = this.холст.width || 640;
    const h = this.холст.height || 480;
    this.холст.width = w;
    this.холст.height = h;
    this.ctx.fillStyle = '#050805';
    this.ctx.fillRect(0, 0, w, h);
    this.ctx.fillStyle = '#1aff6a';
    this.ctx.font = '600 14px "IBM Plex Mono", monospace';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('Включите камеру', w / 2, h / 2);
  }
}

function mustEl<T extends HTMLElement>(id: string, ctor: { new (): T; prototype: T }): T {
  const el = document.getElementById(id);
  if (!el || !(el instanceof ctor)) {
    throw new ОшибкаПриложения('dom', `Элемент «${id}» не найден.`);
  }
  return el;
}
