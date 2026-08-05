/**
 * ASCII-фильтр: разбивка кадра на блоки и замена на символы разной плотности.
 * Стиль «Матрица» — зелёные символы на чёрном фоне.
 */

/** Набор символов от тёмного к светлому */
export const СИМВОЛЫ_ASCII = ' .\'`^",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$';

export interface ПараметрыAscii {
  сила: number; // 0–100: влияет на размер блока и контраст
  ширина: number;
  высота: number;
}

/** Вычисляет яркость пикселя (0–255) */
export function яркостьПикселя(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/** Размер блока по силе эффекта (чем сильнее — тем крупнее «пиксели» ASCII) */
export function размерБлока(сила: number): number {
  const s = Math.max(0, Math.min(100, сила));
  // 4..16 px
  return Math.round(4 + (s / 100) * 12);
}

/** Индекс символа по яркости */
export function индексСимвола(яркость: number, длина: number = СИМВОЛЫ_ASCII.length): number {
  const нормализованная = Math.max(0, Math.min(255, яркость)) / 255;
  return Math.min(длина - 1, Math.floor(нормализованная * длина));
}

/**
 * Обрабатывает ImageData в ASCII-стиль.
 * Рисует символы прямо в буфер пикселей (растризация через паттерн плотности).
 */
export function применитьAscii(исходные: ImageData, сила: number): ImageData {
  const { width: ширина, height: высота, data: вход } = исходные;
  const выход = new ImageData(ширина, высота);
  const блок = размерБлока(сила);
  const контраст = 0.6 + (сила / 100) * 0.8;

  for (let by = 0; by < высота; by += блок) {
    for (let bx = 0; bx < ширина; bx += блок) {
      let суммаR = 0;
      let суммаG = 0;
      let суммаB = 0;
      let счёт = 0;

      const конецY = Math.min(by + блок, высота);
      const конецX = Math.min(bx + блок, ширина);

      for (let y = by; y < конецY; y++) {
        for (let x = bx; x < конецX; x++) {
          const i = (y * ширина + x) * 4;
          суммаR += вход[i]!;
          суммаG += вход[i + 1]!;
          суммаB += вход[i + 2]!;
          счёт++;
        }
      }

      if (счёт === 0) continue;

      const срR = суммаR / счёт;
      const срG = суммаG / счёт;
      const срB = суммаB / счёт;
      let яр = яркостьПикселя(срR, срG, срB);

      // Контраст
      яр = Math.max(0, Math.min(255, (яр - 128) * контраст + 128));

      const индекс = индексСимвола(яр);
      const плотность = индекс / (СИМВОЛЫ_ASCII.length - 1);

      // Зелёный «матричный» цвет с вариацией яркости
      const зелёный = Math.round(40 + плотность * 215);
      const красный = Math.round(плотность * 20);
      const синий = Math.round(плотность * 40);

      // Рисуем паттерн символа внутри блока
      отрисоватьСимволВБлоке(выход, bx, by, конецX, конецY, ширина, индекс, красный, зелёный, синий);
    }
  }

  return выход;
}

/**
 * Растровая имитация символа: точки/линии по индексу плотности.
 */
function отрисоватьСимволВБлоке(
  выход: ImageData,
  bx: number,
  by: number,
  конецX: number,
  конецY: number,
  ширина: number,
  индекс: number,
  r: number,
  g: number,
  b: number,
): void {
  const data = выход.data;
  const плотность = индекс / Math.max(1, СИМВОЛЫ_ASCII.length - 1);

  for (let y = by; y < конецY; y++) {
    for (let x = bx; x < конецX; x++) {
      const lx = x - bx;
      const ly = y - by;
      const i = (y * ширина + x) * 4;

      // Паттерн «глиф» по координатам внутри блока
      const порог = 1 - плотность;
      const шум = ((lx * 17 + ly * 31 + индекс * 7) % 100) / 100;
      const наДиагонали = (lx + ly) % 3 === 0;
      const наКресте = lx === Math.floor((конецX - bx) / 2) || ly === Math.floor((конецY - by) / 2);
      const активен =
        плотность < 0.05
          ? false
          : плотность > 0.9
            ? true
            : шум > порог || (плотность > 0.4 && наДиагонали) || (плотность > 0.7 && наКресте);

      if (активен) {
        data[i] = r;
        data[i + 1] = g;
        data[i + 2] = b;
        data[i + 3] = 255;
      } else {
        data[i] = 0;
        data[i + 1] = 8;
        data[i + 2] = 0;
        data[i + 3] = 255;
      }
    }
  }
}

/**
 * Текстовое представление строки ASCII (для тестов и экспорта).
 */
export function кадрВТекстAscii(
  данные: Uint8ClampedArray | number[],
  ширина: number,
  высота: number,
  сила: number,
): string {
  const блок = размерБлока(сила);
  const строки: string[] = [];

  for (let by = 0; by < высота; by += блок) {
    let строка = '';
    for (let bx = 0; bx < ширина; bx += блок) {
      let сумма = 0;
      let счёт = 0;
      const конецY = Math.min(by + блок, высота);
      const конецX = Math.min(bx + блок, ширина);

      for (let y = by; y < конецY; y++) {
        for (let x = bx; x < конецX; x++) {
          const i = (y * ширина + x) * 4;
          сумма += яркостьПикселя(данные[i]!, данные[i + 1]!, данные[i + 2]!);
          счёт++;
        }
      }

      const яр = счёт ? сумма / счёт : 0;
      строка += СИМВОЛЫ_ASCII[индексСимвола(яр)] ?? ' ';
    }
    строки.push(строка);
  }

  return строки.join('\n');
}
