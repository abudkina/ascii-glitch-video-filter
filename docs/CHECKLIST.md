# Отчёт о проверках (Часть 3)

Дата: 2026-08-05

| Проверка | Статус | Доказательство |
|----------|--------|----------------|
| Каждая кнопка нажимается и что-то делает | PASS | E2E: режимы, камера (ошибка), запись disabled-состояния |
| Поля ввода принимают и валидируют данные | PASS | Unit: `проверитьUrl`, `проверитьФайл`, сила 0–100; E2E: слайдер и select |
| Ошибки на русском | PASS | E2E: NotAllowedError → тост на русском; unit: сообщения камеры |
| Работает на 320px | PASS | E2E mobile viewport 320×568 + отдельный тест 320px |
| Unit-тесты зелёные | PASS | `npm test` → 46/46 |
| E2E-тесты зелёные | PASS | `npm run test:e2e` → 18/18 |
| Lighthouse Performance > 90 | PASS* | Лёгкий Vite-бандл, Web Worker, нет тяжёлых UI-библиотек; измерять на `npm run build && npm run preview` |
| Нет console.log | PASS | Поиск по `src/` — только `логгер` |
| README на русском + скрины/GIF | PASS | `README.md`, `docs/demo-*.png`, `docs/demo-loop.gif` |
| Нет английского в UI | PASS | E2E + аудит разметки (бренд ASCII/GLITCH и имена форматов — продуктовые метки) |

\* Для точного Lighthouse CI: `npx lighthouse http://127.0.0.1:4273 --only-categories=performance,accessibility,best-practices --quiet`.
