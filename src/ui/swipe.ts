import type { РежимФильтра } from '../types';

const ПОРОГ_СВАЙПА = 50;

/**
 * Обработка свайпов: влево — Матрица (ascii), вправо — Глитч.
 */
export function привязатьСвайп(
  элемент: HTMLElement,
  приСмене: (режим: РежимФильтра) => void,
): () => void {
  let стартX = 0;
  let стартY = 0;
  let активен = false;

  const наСтарт = (x: number, y: number) => {
    стартX = x;
    стартY = y;
    активен = true;
  };

  const наКонец = (x: number, y: number) => {
    if (!активен) return;
    активен = false;
    const dx = x - стартX;
    const dy = y - стартY;
    if (Math.abs(dx) < ПОРОГ_СВАЙПА || Math.abs(dx) < Math.abs(dy)) return;

    if (dx < 0) {
      приСмене('ascii');
    } else {
      приСмене('glitch');
    }
  };

  const touchStart = (e: TouchEvent) => {
    const t = e.changedTouches[0];
    if (t) наСтарт(t.clientX, t.clientY);
  };
  const touchEnd = (e: TouchEvent) => {
    const t = e.changedTouches[0];
    if (t) наКонец(t.clientX, t.clientY);
  };
  const mouseDown = (e: MouseEvent) => наСтарт(e.clientX, e.clientY);
  const mouseUp = (e: MouseEvent) => наКонец(e.clientX, e.clientY);

  элемент.addEventListener('touchstart', touchStart, { passive: true });
  элемент.addEventListener('touchend', touchEnd, { passive: true });
  элемент.addEventListener('mousedown', mouseDown);
  элемент.addEventListener('mouseup', mouseUp);

  return () => {
    элемент.removeEventListener('touchstart', touchStart);
    элемент.removeEventListener('touchend', touchEnd);
    элемент.removeEventListener('mousedown', mouseDown);
    элемент.removeEventListener('mouseup', mouseUp);
  };
}
