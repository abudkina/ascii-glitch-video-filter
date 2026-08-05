/**
 * Тосты с сообщениями об ошибках/успехе на русском.
 */

let таймер: ReturnType<typeof setTimeout> | null = null;

export function показатьТост(сообщение: string, тип: 'ошибка' | 'успех' | 'инфо' = 'инфо'): void {
  const тост = document.getElementById('тост');
  if (!тост) return;

  тост.hidden = false;
  тост.textContent = сообщение;
  тост.className = `тост тост--${тип}`;

  if (таймер) clearTimeout(таймер);
  таймер = setTimeout(() => {
    тост.hidden = true;
    тост.textContent = '';
  }, 4500);
}

export function скрытьТост(): void {
  const тост = document.getElementById('тост');
  if (!тост) return;
  тост.hidden = true;
  if (таймер) clearTimeout(таймер);
}
