/**
 * Квадратный кроп для режима «Фотобудка» (стикеры 1:1).
 */

export interface КвадратныйКроп {
  x: number;
  y: number;
  размер: number;
}

/** Центральный квадрат внутри прямоугольника */
export function вычислитьКвадратныйКроп(ширина: number, высота: number): КвадратныйКроп {
  if (ширина <= 0 || высота <= 0) {
    return { x: 0, y: 0, размер: 0 };
  }
  const размер = Math.min(ширина, высота);
  const x = Math.floor((ширина - размер) / 2);
  const y = Math.floor((высота - размер) / 2);
  return { x, y, размер };
}

/** Размер стороны стикера по желаемому максимуму */
export function размерСтикера(исходныйРазмер: number, максСторона = 512): number {
  if (исходныйРазмер <= 0) return 0;
  return Math.min(исходныйРазмер, максСторона);
}

/**
 * Обрезает ImageData в центральный квадрат и при необходимости масштабирует.
 * Чистая логика пикселей (без DOM) — для unit-тестов.
 */
export function обрезатьВКвадрат(
  исходные: ImageData,
  сторонаСтикера?: number,
): ImageData {
  const { x, y, размер } = вычислитьКвадратныйКроп(исходные.width, исходные.height);
  if (размер <= 0) {
    return new ImageData(1, 1);
  }

  const цель = сторонаСтикера && сторонаСтикера > 0
    ? размерСтикера(размер, сторонаСтикера)
    : размер;

  // Если сторона совпадает с кропом — копируем пиксели напрямую
  if (цель === размер) {
    const выход = new ImageData(размер, размер);
    for (let строка = 0; строка < размер; строка++) {
      const srcOffset = ((y + строка) * исходные.width + x) * 4;
      const dstOffset = строка * размер * 4;
      выход.data.set(
        исходные.data.subarray(srcOffset, srcOffset + размер * 4),
        dstOffset,
      );
    }
    return выход;
  }

  // Ближайший сосед для масштабирования (без canvas)
  const выход = new ImageData(цель, цель);
  for (let py = 0; py < цель; py++) {
    const sy = y + Math.min(размер - 1, Math.floor((py / цель) * размер));
    for (let px = 0; px < цель; px++) {
      const sx = x + Math.min(размер - 1, Math.floor((px / цель) * размер));
      const si = (sy * исходные.width + sx) * 4;
      const di = (py * цель + px) * 4;
      выход.data[di] = исходные.data[si]!;
      выход.data[di + 1] = исходные.data[si + 1]!;
      выход.data[di + 2] = исходные.data[si + 2]!;
      выход.data[di + 3] = исходные.data[si + 3]!;
    }
  }
  return выход;
}
