/**
 * Минимальный GIF89a-энкодер (без зависимостей).
 * Подходит для коротких петель аватарок/сториз.
 */

interface КадрGif {
  данные: Uint8ClampedArray;
  ширина: number;
  высота: number;
  задержкаСс: number; // сотые доли секунды
}

/** Простая палитра: квантование RGB → 6x6x6 = 216 цветов + чёрный */
function построитьПалитру(): Uint8Array {
  const палитра = new Uint8Array(256 * 3);
  let i = 0;
  for (let r = 0; r < 6; r++) {
    for (let g = 0; g < 6; g++) {
      for (let b = 0; b < 6; b++) {
        палитра[i++] = Math.round((r * 255) / 5);
        палитра[i++] = Math.round((g * 255) / 5);
        палитра[i++] = Math.round((b * 255) / 5);
      }
    }
  }
  // остальные — чёрный
  return палитра;
}

function индексЦвета(r: number, g: number, b: number): number {
  const rq = Math.round((r / 255) * 5);
  const gq = Math.round((g / 255) * 5);
  const bq = Math.round((b / 255) * 5);
  return rq * 36 + gq * 6 + bq;
}

function записатьЗаголовок(части: number[]): void {
  // GIF89a
  for (const c of [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]) части.push(c);
}

function записатьСлово(части: number[], значение: number): void {
  части.push(значение & 0xff, (значение >> 8) & 0xff);
}

/**
 * LZW-сжатие индексов для GIF (минимальная реализация).
 */
function lzwСжать(индексы: Uint8Array, минКод: number): Uint8Array {
  const очистка = 1 << минКод;
  const конец = очистка + 1;
  let размерКода = минКод + 1;
  let следКод = конец + 1;
  const максКод = 4095;

  const словарь = new Map<string, number>();
  const сбросСловаря = () => {
    словарь.clear();
    следКод = конец + 1;
    размерКода = минКод + 1;
  };
  сбросСловаря();

  const биты: number[] = [];
  let буфер = 0;
  let битСчёт = 0;

  const записатьКод = (код: number) => {
    буфер |= код << битСчёт;
    битСчёт += размерКода;
    while (битСчёт >= 8) {
      биты.push(буфер & 0xff);
      буфер >>= 8;
      битСчёт -= 8;
    }
  };

  записатьКод(очистка);

  let w = String(индексы[0]!);
  for (let i = 1; i < индексы.length; i++) {
    const k = String(индексы[i]!);
    const wk = w + ',' + k;
    if (словарь.has(wk)) {
      w = wk;
    } else {
      const кодW = w.includes(',') ? словарь.get(w)! : Number(w);
      записатьКод(кодW);

      if (следКод <= максКод) {
        словарь.set(wk, следКод++);
        if (следКод > 1 << размерКода && размерКода < 12) {
          размерКода++;
        }
      } else {
        записатьКод(очистка);
        сбросСловаря();
      }
      w = k;
    }
  }

  const кодW = w.includes(',') ? словарь.get(w)! : Number(w);
  записатьКод(кодW);
  записатьКод(конец);

  if (битСчёт > 0) {
    биты.push(буфер & 0xff);
  }

  return new Uint8Array(биты);
}

function записатьБлоки(части: number[], данные: Uint8Array): void {
  let смещение = 0;
  while (смещение < данные.length) {
    const размер = Math.min(255, данные.length - смещение);
    части.push(размер);
    for (let i = 0; i < размер; i++) {
      части.push(данные[смещение + i]!);
    }
    смещение += размер;
  }
  части.push(0);
}

/** Кодирует набор кадров в сырые байты GIF */
export function кодироватьGifБайты(кадры: КадрGif[]): Uint8Array {
  if (кадры.length === 0) {
    throw new Error('Нет кадров для GIF');
  }

  const первый = кадры[0]!;
  const ширина = первый.ширина;
  const высота = первый.высота;
  const палитра = построитьПалитру();
  const части: number[] = [];

  записатьЗаголовок(части);
  записатьСлово(части, ширина);
  записатьСлово(части, высота);
  // Packed: GCT flag, color res, sort, GCT size (256 → 7)
  части.push(0xf7, 0x00, 0x00);
  for (let i = 0; i < палитра.length; i++) части.push(палитра[i]!);

  // Netscape loop extension
  части.push(0x21, 0xff, 0x0b);
  for (const c of 'NETSCAPE2.0') части.push(c.charCodeAt(0));
  части.push(0x03, 0x01, 0x00, 0x00, 0x00);

  const минКод = 8;

  for (const кадр of кадры) {
    // Graphic Control Extension
    части.push(0x21, 0xf9, 0x04, 0x00);
    записатьСлово(части, Math.max(2, кадр.задержкаСс));
    части.push(0x00, 0x00);

    // Image Descriptor
    части.push(0x2c);
    записатьСлово(части, 0);
    записатьСлово(части, 0);
    записатьСлово(части, кадр.ширина);
    записатьСлово(части, кадр.высота);
    части.push(0x00);

    const индексы = new Uint8Array(кадр.ширина * кадр.высота);
    for (let p = 0; p < индексы.length; p++) {
      const i = p * 4;
      индексы[p] = индексЦвета(кадр.данные[i]!, кадр.данные[i + 1]!, кадр.данные[i + 2]!);
    }

    части.push(минКод);
    const сжатые = lzwСжать(индексы, минКод);
    записатьБлоки(части, сжатые);
  }

  части.push(0x3b); // Trailer
  return new Uint8Array(части);
}

/** Кодирует набор кадров в GIF Blob */
export function кодироватьGif(кадры: КадрGif[]): Blob {
  const bytes = кодироватьGifБайты(кадры);
  const ab = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(ab).set(bytes);
  return new Blob([ab], { type: 'image/gif' });
}

export type { КадрGif };
