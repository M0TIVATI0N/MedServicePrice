# MedServicePrice.kz MVP

Агрегатор и сравнение цен на медицинские услуги в Казахстане (хакатон 2025).

## Стек

| Слой | Технологии |
|------|------------|
| Backend | Node.js, Express, TypeScript, MongoDB |
| Frontend | React, Vite, TypeScript, Leaflet |
| Парсинг | undici, cheerio, PDF/DOCX (mammoth, pdf-parse) |
| Расписание | node-cron |
| Деплой | Docker Compose |

## Источники данных (3+)

| Источник | Тип | Парсер |
|----------|-----|--------|
| KDL (`kdlolymp.kz`) | JSON API, лаборатория | `kdlParser.ts` |
| DOQ (`doq.kz`) | JSON API, приёмы врачей | `doqParser.ts` |
| ИНВИТРО (`invitro.kz`) | HTML, лаборатория | `invitroParser.ts` |

## Запуск

### Docker

```bash
docker-compose up --build
```

- Backend: http://localhost:4000
- Frontend: http://localhost:5173
- MongoDB: localhost:27017

### Локально

```bash
# Backend
cd backend && npm install
cp ../.env.example .env
npm run dev

# Frontend (другой терминал)
cd frontend && npm install
cp .env.example .env
npm run dev -- --host 0.0.0.0
```

## Соответствие ТЗ

### Парсер
- 3 источника с отказоустойчивостью (ошибка одного не останавливает остальные)
- Raw-слой (`raw_records`) + нормализованный слой (`offers`)
- Дедупликация по `raw_hash` и upsert
- Журнал ошибок (`parse_logs`, `GET /api/parse/logs`)
- Ручной запуск: `POST /api/parse` и кнопка в UI
- Cron: `PARSER_CRON` (по умолчанию ежедневно в 03:00)

### Нормализация
- Справочник **100** услуг с синонимами (`service-catalog.ts`)
- Алгоритмическая нормализация + очередь unmatched (`GET /api/unmatched`)

### API

| Endpoint | Описание |
|----------|----------|
| `GET /api/catalog` | Справочник услуг |
| `GET /api/catalog/search?q=` | Автодополнение |
| `GET /api/services` | Поиск с фильтрами |
| `GET /api/clinics` | Список клиник |
| `GET /api/clinics/:id` | Карточка клиники |
| `GET /api/history` | История изменения цен |
| `GET /api/compare` | Сравнение клиник |
| `GET /api/raw` | Сырые данные |
| `GET /api/stats` | Статистика |
| `POST /api/parse` | Запуск парсера |

### UI
- Поиск с автодополнением по справочнику
- Фильтры: город, категория, цена, рейтинг, онлайн-запись
- Сортировка: цена, дата, рейтинг, расстояние (геолокация)
- Карта клиник (Leaflet) + маршрут (Google Maps)
- Сравнение клиник (до 4)
- История цен
- Подписка на изменение цены (localStorage)
- Дата парсинга на каждой карточке
- Данные старше 30 дней скрываются из выдачи

## Переменные окружения

См. `.env.example` и `frontend/.env.example`.

| Переменная | Описание |
|------------|----------|
| `MONGODB_URI` | Строка подключения MongoDB |
| `PARSER_CRON` | Расписание cron (`off` для отключения) |
| `RUN_PARSER_ON_BOOT` | `false` — не парсить при старте |
| `KDL_MAX_CITIES` | Число городов KDL (по умолчанию 10) |
| `INVITRO_MAX_CITIES` | Число городов Invitro (по умолчанию 4) |
| `DOQ_MAX_CITIES` | Число городов DOQ (по умолчанию 5) |
| `PARSER_MAX_RECORDS` | Жёсткий лимит записей за прогон (50000) |
| `PARSER_REPLACE_DB` | `true` — очистить БД перед каждым парсингом |
| `PARSER_STORE_RAW` | `false` — не писать raw-слой (экономит ~50% места на Atlas M0) |

### MongoDB Atlas M0 (512 MB)

Если видите ошибку **over your space quota**:

1. В [Atlas Data Explorer](https://cloud.mongodb.com) удалите коллекции `offers`, `raw_records`, `price_history`
2. Добавьте в `.env`:
   ```
   PARSER_REPLACE_DB=true
   PARSER_STORE_RAW=false
   KDL_MAX_CITIES=10
   INVITRO_MAX_CITIES=4
   DOQ_MAX_CITIES=5
   ```
3. Перезапустите backend

Без лимитов KDL парсит **195 городов** (~260k записей) — это не помещается в бесплатный Atlas.

## Структура

```
backend/src/
  parsers/       # KDL, DOQ, Invitro, PDF/DOCX
  parser.ts      # Пайплайн: raw → normalize → offers + history
  normalizer.ts  # Привязка к справочнику
  service-catalog.ts
  routes.ts
frontend/src/
  App.tsx        # UI поиска, карта, сравнение
```
