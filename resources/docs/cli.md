# tgcloud CLI — справочник

Требуется Node.js 18+. Вызовы из каталога проекта: `npx tgcloud <cmd>`.

## Старт

```bash
npm create @tgcloud/bot my-bot   # рекомендуемый скаффолд (CLI ставится в проект)
npm install -g @tgcloud/cli      # или глобально
tgcloud init                     # скаффолд в текущем пустом каталоге (работает офлайн)
tgcloud login                    # привязка бота: CLI-токен из @BotFather, хранится в .tgcloud/
```

## Модули

```bash
tgcloud add handlers/callback_query   # новый хендлер (типы: message, callback_query, inline_query, chat_member, …)
tgcloud add lib/cart                  # новый общий модуль
```
Не перезаписывает существующие файлы.

## Запуск без деплоя

```bash
tgcloud run handlers/message '{ chat: { id: 1 }, text: "hi" }'
tgcloud run handlers/message "$(cat message.json5)"
tgcloud run handlers/message '{...}' --ctx '{...}'
```
Аргументы и контекст — JSON5. Вывод `console.*` захватывается и отображается.

## Деплой и синхронизация

```bash
tgcloud status         # локальные изменения vs облако (офлайн)
tgcloud diff           # построчный diff (офлайн)
tgcloud push           # атомарный деплой изменённых модулей; можно указать файлы: push [files...]
tgcloud push --force   # пропустить проверки конкурентности (ОПАСНО)
tgcloud fetch          # обновить референс-копию облачного состояния (рабочие файлы не трогает)
tgcloud pull           # синхронизировать облако → референс-копия + рабочие файлы
tgcloud reset          # отбросить локальные изменения (к состоянию облака)
```

## База данных

```bash
tgcloud push                 # сначала деплой schema.js; сообщит о pending-изменениях БД
tgcloud migrate              # применить изменения БД (интерактивно: safe/warning/manual)
tgcloud migrate --dry-run    # предпросмотр без применения
```
Удаление колонок/таблиц — только через `.deprecated('reason')` в schema.js.

## Вебхук

```bash
tgcloud webhook                          # состояние: URL, allowed_updates, pending, ошибки доставки
tgcloud webhook sync [--drop-pending]    # перенаправить вебхук, пересобрать allowed_updates
```

## Прочее

```bash
tgcloud completion <bash|zsh|fish>       # автодополнение для шелла
```
