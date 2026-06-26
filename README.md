# MedServicePrice.kz MVP

Агрегатор цен на медицинские услуги в Казахстане.

## Стек
- Backend: Node.js + Express + TypeScript
- Frontend: React + Vite + TypeScript
- База данных: MongoDB
- Парсинг: HTML, PDF, DOCX
- Карта: Leaflet
- Документация окружения: `.env.example` и `frontend/.env.example`

## Запуск локально

### Через Docker
1. Убедитесь, что Docker запущен.
2. Запустите `docker-compose up --build` в корне проекта.
3. Backend будет доступен по `http://localhost:4000`.
4. Frontend будет доступен по `http://localhost:5173`.

### Без Docker

#### Backend
1. Перейти в папку `backend`
2. Установить зависимости: `npm install`
3. Создать `.env` на базе `../.env.example`
4. Запустить сервер: `npm run dev`
5. API доступно по `http://localhost:4000/api`

#### Frontend
1. Перейти в папку `frontend`
2. Установить зависимости: `npm install`
3. Создать `frontend/.env` на базе `frontend/.env.example`
4. Запустить приложение: `npm run dev -- --host 0.0.0.0`
5. Открыть `http://localhost:5173`

## Что реализовано

- Парсинг цен из HTML-источников (`kdl.kz`, `doq.kz`)
- Поддержка документов PDF/DOCX через общую библиотеку
- Хранение сырых данных в MongoDB (raw-слой)
- Нормализация услуг со справочником и очередью unmatched
- API: `/catalog`, `/services`, `/clinics`, `/raw`, `/unmatched`, `/history`, `/parse`
- Интерфейс поиска по услуге, городу, категории, диапазону цен
- Карта клиник с маркерами и маршрутом
- История изменения цен для выбранной клиники

## Особенности

- Дедупликация сырой записи через `raw_hash`
- Отказоустойчивый парсинг: ошибки одного источника не останавливают весь процесс
- Справочник услуг расширен и поддерживает синонимы
- Все конфигурации, ссылки и ключи хранятся в `.env`

## Структура проекта

- `backend/`: API, MongoDB, парсеры
- `frontend/`: React + Vite UI, карта, история цен
- `docker-compose.yml`: локальный стек с MongoDB
- `.env.example`: примеры переменных окружения
- `frontend/.env.example`: фронтенд-переменные для карты и API
