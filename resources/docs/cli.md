# tgcloud CLI — справочник

Требуется Node.js 18+. CLI — локальная dev-зависимость проекта (`@tgcloud/cli`),
вызов из каталога проекта: `npx tgcloud <cmd>`.

## Старт

```bash
npm create @tgcloud/bot my-bot    # скаффолд (CLI ставится в проект)
npx tgcloud init                  # скаффолд в текущем каталоге (офлайн)
npx tgcloud login                 # привязка бота — ИНТЕРАКТИВНО (нужен TTY)
```

**Токен** — CLI access token формата `app<id>:<secret>`
(@BotFather → ваш бот → Serverless → CLI Access → Access token).
Это НЕ Bot API токен вида `123456:AA…` — он будет отвергнут.

Неинтерактивный логин:
```bash
printf 'app...\n' | TGCLOUD_ASSUME_TTY=1 npx tgcloud login
# или для CI: export TGCLOUD_TOKEN='app...'  (тогда login не нужен вообще)
```

## Модули

```bash
npx tgcloud add handlers/callback_query   # хендлер апдейта
npx tgcloud add endpoints/getProfile      # endpoint для Mini App
npx tgcloud add lib/cart                  # общий модуль
npx tgcloud add handlers                  # без имени — покажет ошибку-подсказку
```
Существующие файлы не перезаписываются.

## Запуск без деплоя (server-side, локальные файлы)

```bash
npx tgcloud run handlers/message '{ chat: { id: 1 }, text: "hi" }'
npx tgcloud run handlers/message "$(cat args.json5)"
npx tgcloud run endpoints/getProfile '{}' --ctx '{ initData: { user: { id: 1 } } }'
```
Аргументы/контекст — JSON5. Вывод `console.*` захватывается и отображается.

## Деплой и синхронизация

**Деплой никогда не трогает базу** — миграции отдельным шагом.

```bash
npx tgcloud status         # локальные изменения vs снапшот (офлайн)
npx tgcloud diff [file]    # построчный diff (офлайн)
npx tgcloud push [files..] # атомарный деплой модулей (+ static-билд мини-аппа);
                           # сообщит о pending-изменениях БД; обновляет вебхук
npx tgcloud push --force   # пропустить проверки конкурентности (ОПАСНО)
npx tgcloud fetch          # обновить локальный снапшот из облака (файлы не трогает)
npx tgcloud pull           # облако → снапшот + рабочие файлы
npx tgcloud reset [file]   # отбросить локальные изменения (офлайн, из снапшота)
```

## База данных

```bash
npx tgcloud push                 # сначала деплой schema.js; сообщит о pending-изменениях
npx tgcloud migrate              # применить изменения (ИНТЕРАКТИВНО)
npx tgcloud migrate --dry-run    # предпросмотр без применения
```
Удаление — только через `.deprecated('reason')` на колонке/таблице/индексе;
удаление декларации ничего не дропает. Смена типа колонки — руками через `db.run()`.
**Foreign keys нет** — `.references()`/`foreignKey()` бросают при декларации.

## Вебхук

Платформа сама управляет вебхуком (из задеплоенных handlers/*) и обновляет его на push.

```bash
npx tgcloud webhook                          # состояние и синхронность
npx tgcloud webhook sync [--drop-pending]    # починить рассинхрон
```

## Прочее

```bash
npx tgcloud upgrade      # миграция layout проектов pre-0.2.0 → tgcloud/
npx tgcloud completion <bash|zsh|fish>
TG_CLOUD_API_URL=…       # переопределение базового URL API
TGCLOUD_BETA=1           # /beta-окружение API
```
