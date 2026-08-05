import { применитьAscii } from './ascii';
import { применитьGlitch } from './glitch';
import type { РежимФильтра } from '../types';
import { ограничить } from '../utils/errors';

/** Применяет выбранный фильтр к кадру */
export function применитьФильтр(
  исходные: ImageData,
  режим: РежимФильтра,
  сила: number,
): ImageData {
  const s = ограничить(сила, 0, 100);

  switch (режим) {
    case 'ascii':
      return применитьAscii(исходные, s);
    case 'glitch':
      return применитьGlitch(исходные, s);
    default: {
      const _exhaustive: never = режим;
      return _exhaustive;
    }
  }
}
