# Руководство по сборке и поддержке модифицированной Insomnia

Эта версия Insomnia содержит уникальные доработки, которых нет в официальном релизе.

## Основные изменения
1. **GitLab Sync (Bundled)**: Плагин синхронизации встроен в ядро. Названия файлов изменены на `insomnia-sync.yaml` для совместимости.
2. **Advanced JSON Filtering**: Система поиска и многоуровневой фильтрации JSON-ответов с использованием "чипов" (тегов).
3. **Smart Block Selection**: Автоматический выбор родительских объектов/массивов при клике на результат поиска.
4. **Bypass Node 24**: Скрипты сборки адаптированы для работы на Node.js v22.
5. **Magnetic Tab Grouping**: Умная группировка вкладок с одинаковыми URL, горизонтальная прокрутка колесиком мыши и эффект "аккордеона" для экономии места.
6. **Default Request Tab**: Возможность выбора вкладки, которая открывается первой при переходе к запросу (Body, Params, Auth и т.д.).
7. **Tab Sessions**: Система сохранения и переключения наборов вкладок. Позволяет мгновенно менять рабочий контекст (например, переключаться между задачами).
8. **Custom Settings**: Добавлены новые настройки в раздел "General" для управления поведением интерфейса (группировка, сессии, дефолтная вкладка запроса).
9. **Collapsible Sidebar Sections**: Возможность сворачивать блоки в боковой панели (Environment, Cookies, Pinned Requests, Scope Filters) для экономии места. Состояние сворачивания сохраняется.
10. **Quick Actions (Move/Rename)**: Возможность быстро переместить запрос в любую папку коллекции или переименовать его прямо из контекстного меню вкладки или боковой панели.

---

## Новые настройки (General)
- **Enable Tab Grouping**: Включает/выключает умную группировку вкладок.
- **Enable Tab Sessions**: Позволяет скрыть/показать меню управления сессиями.
- **Default Request Pane Tab**: Позволяет выбрать, какая вкладка (Params, Body и т.д.) будет открыта первой при нажатии на запрос.

---

## Подготовка окружения
- **Node.js**: Рекомендуется v22.x или v24.x.
- **NPM**: v10.x или выше.

Если сборка ругается на версию Node.js, проверьте файл `packages/insomnia/scripts/build.ts` (проверка версии там закомментирована).

---

## Как собрать приложение (DMG для Mac)

1. **Установка зависимостей** (из корня проекта):
   ```bash
   npm install
   npm run bootstrap
   ```

2. **Сборка пакета**:
   Перейдите в директорию приложения и запустите упаковку:
   ```bash
   cd packages/insomnia
   npm run package
   ```
   Готовый файл `.dmg` появится в папке `packages/insomnia/dist/`.

---

## Ключевые файлы для поддержки

Если вы захотите изменить логику фильтрации или дизайн, ищите код здесь:

- **Компонент поиска**: `packages/insomnia/src/ui/components/viewers/response-json-search.tsx`
  *(Здесь живет логика парсинга путей, хлебные крошки и Smart Target)*
  
- **Логика рендеринга**: `packages/insomnia/src/ui/components/viewers/response-viewer.tsx`
  *(Здесь происходит сборка итогового JSON из выбранных путей и управление состоянием чипов)*

- **Стили (CSS)**: `packages/insomnia/src/ui/css/main.css`
  *(Ищите секцию `JSON Filter Chips` в конце файла для изменения дизайна тегов и кнопок)*

- **Плагин GitLab**: `packages/insomnia/src/plugins/insomnia-plugin-universal-git/src/index.tsx`
  *(Здесь настроены дефолтные имена файлов синхронизации)*

- **Управление вкладками**: `packages/insomnia/src/ui/components/tabs/tab-list.tsx`
  *(Логика группировки, горизонтальной прокрутки и "магнитного" позиционирования)*

- **Компонент вкладки**: `packages/insomnia/src/ui/components/tabs/tab.tsx`
  *(Анимации аккордеона, CSS-задержки и логика отображения кратких имен групп)*

- **Панель запроса**: `packages/insomnia/src/ui/components/panes/request-pane.tsx`
  *(Логика выбора вкладки по умолчанию при открытии запроса)*

- **Сессии вкладок**: `packages/insomnia/src/ui/components/tabs/tab-session-menu.tsx`
  *(Интерфейс управления сохраненными наборами вкладок)*

- **Модель сессий**: `packages/insomnia/src/insomnia-data/src/models/tab-session.ts`
  *(Структура данных для хранения сессий в БД)*

- **Сворачиваемые секции**: `packages/insomnia/src/ui/components/sidebar-section.tsx`
  *(Универсальный компонент для скрытия блоков в боковой панели с сохранением состояния)*

- **Перемещение запросов**: `packages/insomnia/src/ui/components/modals/move-request-modal.tsx`
  *(Интерфейс выбора папки. Используется в `tab-list.tsx` и `request-actions-dropdown.tsx`)*

- **Быстрый переключатель окружений (Стендов)**: `packages/insomnia/src/ui/components/quick-environment-switcher.tsx`
  *(Переключатель в хедере вместо GitHub Stars. Поддерживает Scratchpad и смену стенда колёсиком мыши)*

---

## Сохранение изменений
Все изменения находятся в ветке `feature/gitlab-sync-bundled`. При обновлении из официального репозитория Insomnia (upstream), делайте `git merge` или `git rebase` этой ветки.

---
*Собрано с помощью Antigravity (Google DeepMind).*
