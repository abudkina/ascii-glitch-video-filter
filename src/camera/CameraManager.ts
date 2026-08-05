import { ОшибкаПриложения, сообщениеОшибкиКамеры } from '../utils/errors';
import { логгер } from '../utils/logger';

/**
 * Управление веб-камерой через getUserMedia.
 */
export class МенеджерКамеры {
  private поток: MediaStream | null = null;
  private видео: HTMLVideoElement;

  constructor(видео: HTMLVideoElement) {
    this.видео = видео;
  }

  get активна(): boolean {
    return this.поток !== null && this.поток.active;
  }

  get потокМедиа(): MediaStream | null {
    return this.поток;
  }

  async включить(): Promise<void> {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new ОшибкаПриложения(
        'камера-недоступна',
        'Ваш браузер не поддерживает доступ к камере.',
      );
    }

    try {
      await this.выключить();

      this.поток = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      });

      this.видео.srcObject = this.поток;
      await this.видео.play();
      логгер.инфо('Камера включена');
    } catch (ошибка) {
      this.поток = null;
      this.видео.srcObject = null;
      const текст = сообщениеОшибкиКамеры(ошибка);
      логгер.ошибка('Не удалось включить камеру', ошибка);
      throw new ОшибкаПриложения('камера', текст, ошибка);
    }
  }

  async выключить(): Promise<void> {
    if (this.поток) {
      for (const дорожка of this.поток.getTracks()) {
        дорожка.stop();
      }
      this.поток = null;
    }
    this.видео.srcObject = null;
    this.видео.pause();
  }

  /** Размеры текущего видеокадра */
  размеры(): { ширина: number; высота: number } {
    return {
      ширина: this.видео.videoWidth || 640,
      высота: this.видео.videoHeight || 480,
    };
  }
}
