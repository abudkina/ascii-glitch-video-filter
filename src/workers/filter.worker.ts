/// <reference lib="webworker" />

import { применитьФильтр } from '../filters';
import type { СообщениеВоркеру, ОтветВоркера } from '../types';

/**
 * Web Worker: тяжёлая обработка кадров в фоне.
 * При наличии OffscreenCanvas кадр дополнительно проходит через него
 * (нормализация буфера / совместимость с пайплайном без DOM).
 */

const ctx: DedicatedWorkerGlobalScope = self as unknown as DedicatedWorkerGlobalScope;

function черезOffscreen(данные: ImageData): ImageData {
  if (typeof OffscreenCanvas === 'undefined') {
    return данные;
  }
  const холст = new OffscreenCanvas(данные.width, данные.height);
  const контекст = холст.getContext('2d');
  if (!контекст) return данные;
  контекст.putImageData(данные, 0, 0);
  return контекст.getImageData(0, 0, данные.width, данные.height);
}

ctx.onmessage = (событие: MessageEvent<СообщениеВоркеру>) => {
  const сообщение = событие.data;

  if (сообщение.тип !== 'обработать') {
    return;
  }

  try {
    const { id, буфер, ширина, высота, режим, сила } = сообщение;
    const пиксели = new Uint8ClampedArray(буфер);
    const исходные = черезOffscreen(new ImageData(пиксели, ширина, высота));
    const результат = применитьФильтр(исходные, режим, сила);

    const ответ: ОтветВоркера = {
      тип: 'готово',
      id,
      буфер: результат.data.buffer as ArrayBuffer,
      ширина: результат.width,
      высота: результат.height,
    };

    ctx.postMessage(ответ, [ответ.буфер!]);
  } catch (ошибка) {
    const ответ: ОтветВоркера = {
      тип: 'ошибка',
      id: сообщение.id,
      сообщение: ошибка instanceof Error ? ошибка.message : 'Ошибка обработки кадра',
    };
    ctx.postMessage(ответ);
  }
};
