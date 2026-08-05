import { Приложение } from './app/App';
import { логгер } from './utils/logger';
import { показатьТост } from './ui/toast';
import './styles/main.css';

function старт(): void {
  try {
    const приложение = new Приложение();
    приложение.инициализировать();

    window.addEventListener('pagehide', () => {
      приложение.уничтожить();
    });
  } catch (ошибка) {
    логгер.ошибка('Критическая ошибка запуска', ошибка);
    показатьТост(
      ошибка instanceof Error ? ошибка.message : 'Не удалось запустить приложение.',
      'ошибка',
    );
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', старт);
} else {
  старт();
}
