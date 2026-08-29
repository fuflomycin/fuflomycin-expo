# Как Expo web отдаёт снимок нативному клиенту

Research for [#4](https://github.com/fuflomycin/fuflomycin-expo/issues/4). Не выбирает архитектуру: перечисляет штатные каналы Expo и ограничения по первоисточникам.

**Вопрос.** Какими штатными средствами Expo (web hosting, static files рядом с web-сборкой, EAS Update, файлы в бандле) выкладка Expo web этого репозитория может стать источником обновления снимка для Android и iOS — без отдельного публичного JSON API для чужих клиентов?

**Решения, которые не переоткрываем**

- Рантайм: снимок вшит в сборку; при сети клиент обновляет кэш.
- Этот репозиторий публикует Expo web, не публичный JSON-корм для telegram / PWA / чужих клиентов.
- Нативное обновление снимка идёт с выкладки Expo web этого продукта, не с GitHub Pages старого data-репо.
- Платформы: Android, iOS, web из одной кодовой базы Expo.

**Метод.** Первоисточники: официальные docs.expo.dev (через Context7 `/expo/expo` и `/llmstxt/expo_dev_llms_txt` и прямым fetch `.md` с docs), плюс React Native Networking. Сравнение с fuflomycin-pwa — по его исходникам, не как рекомендация.

---

## Сводка для grilling

Четыре штатных канала, которые Expo документирует. Их можно комбинировать; ни один не выбран.

| Канал | Что обновляет на Android/iOS | Нужен ли публичный HTTP JSON | Офлайн без сети после установки |
| --- | --- | --- | --- |
| A. JSON в JS-бандле (`import` / `require` `.json`) | Только новым бинарником или EAS Update (JS-слой) | Нет | Да: снимок внутри бандла |
| B. `public/data/*.json` на выкладке Expo web + `fetch` абсолютного URL | HTTP с origin web-деплоя | Файл лежит по URL (как у любого static host). Это не API-маршрут, но URL публично читаемый | Нет, пока клиент сам не закэширует ответ |
| C. EAS Update (OTA JS + assets) | JS и ассеты, которые Metro резолвит и которые попали в update | Нет (канал Expo `u.expo.dev`, не web origin) | После скачивания update — да; иначе embedded-бандл из бинарника |
| D. API Routes на EAS Hosting (`+api.ts`) | `fetch` на origin сервера (для native — plugin `origin`) | Да: это HTTP endpoint. Противоречит standing decision «не JSON-корм» | Нет, пока клиент сам не закэширует |

Standing decision «нативный refresh с выкладки Expo web» прямо покрывает **B** (и, при `origin` на тот же деплой, **D**). **C** — отдельный канал Expo, не web origin. **A** — вшивание, не «refresh с web».

---

## Как это делает fuflomycin-pwa сегодня

Сравнение, не шаблон для Expo.

Источник правды — Markdown в `content/`. Сборка пишет артефакты в `public/` (в git не коммитятся): `public/data/homeopathy.json`, `rsp.json`, `fk.json` ([fuflomycin-pwa/README.md](https://github.com/fuflomycin/fuflomycin-pwa/blob/main/README.md), [scripts/build-data.js](https://github.com/fuflomycin/fuflomycin-pwa/blob/main/scripts/build-data.js)).

Клиент: `src/utils/db.ts` — раз в сутки при `navigator.onLine` делает `fetch('/data/${name}.json?d=${dayStamp()}', { cache: 'no-store' })`; иначе / при ошибке — `fetch` без cache-bust, чтобы попасть в precache SW ([db.ts](https://github.com/fuflomycin/fuflomycin-pwa/blob/main/src/utils/db.ts)).

SW: `@ducanh2912/next-pwa` — `urlPattern: /\/data\/.+\.json\?d=/i` → `NetworkOnly`; остальное same-origin → `NetworkFirst` ([next.config.mjs](https://github.com/fuflomycin/fuflomycin-pwa/blob/main/next.config.mjs)). README: в установленном PWA JSON и фото кладутся в кэш при установке.

Отличие от Expo native: у Android/iOS нет Workbox. Relative `/data/...` на native не резолвится в файлы `public/` (см. ниже: web-only relative URIs). Аналог «вшить + раз в сутки bust» на native — **A + B** или **A + C**, не service worker.

---

## 1. Может ли Expo web отдать extra static JSON рядом с приложением?

**Да, штатно: корневой каталог `public/`.**

Metro копирует содержимое `public/` в `dist/` при `npx expo export`. Файлы отдаются относительно host URL. Пример: `public/favicon.ico` → корень сайта. Не класть файлы в зарезервированные пути (`/assets`, `/_expo`, при наличии `public/` ещё `/public`).

- [Customizing Metro — Static files](https://docs.expo.dev/guides/customizing-metro/)
- [Static rendering — Static files](https://docs.expo.dev/router/web/static-rendering/)
- [Publish websites](https://docs.expo.dev/guides/publishing-websites/)
- [Reserved paths](https://docs.expo.dev/router/reference/reserved-paths)

Следствие: `public/data/homeopathy.json` после `npx expo export --platform web` оказывается в `dist/data/homeopathy.json` и доступен как `https://<web-host>/data/homeopathy.json`. Это тот же механизм, что PWA кладёт JSON в Next.js `public/data/`.

**Expo Router / Metro export / EAS Hosting — одна цепочка, не три разных.**

1. `expo.web.output`: `single` | `static` | `server` ([Get started with EAS Hosting](https://docs.expo.dev/eas/hosting/get-started/), [Publish websites — Output targets](https://docs.expo.dev/guides/publishing-websites/)).
2. `npx expo export --platform web` → `dist/` (+ копия `public/`).
3. Выкладка: `eas deploy` на EAS Hosting, либо любой static host из списка Expo (Netlify, Cloudflare Pages, GitHub Pages, …) для `static`/`single`. Режим `server` нужен для API routes.

`static` — отдельные HTML на маршрут, **без custom server API**; динамические `app/[id].tsx` сами по себе не работают, нужен `generateStaticParams`. `server` — client + server, API routes как отдельные JS. `single` — SPA, один `index.html`.

Относительные URI из runtime (`/logo.png`) Expo помечает как **web only**. На native тот же файл из `public/` **не** становится `file://` внутри бинарника. Для production native Expo Router прямо говорит: файлы из `public/` нужно хостить на сервере.

- [Static rendering: «Web only: Static assets can be accessed in runtime code using relative paths»](https://docs.expo.dev/router/web/static-rendering/)
- [Migrate from Expo Webpack — Static resources](https://docs.expo.dev/router/migrate/from-expo-webpack/): «Unlike Webpack, Expo Router's hosting works on native too. Make sure to host the files from a server before using them in production.»
- Metro: «In the future, this will work universally across platforms with EAS Update hosting. Currently, the feature is web-only based on the static host used for the native app» ([Customizing Metro](https://docs.expo.dev/guides/customizing-metro/)).

Практический вывод для grilling: **web-сборка может нести снимок как static JSON на том же origin**. Native читает его только абсолютным HTTPS URL этого origin (или через `expo-router` `origin` + relative `fetch`, см. §4). Это не «файл в APK/IPA».

---

## 2. EAS Update: JS+assets включая JSON — это канал native refresh vs fetch с web origin?

**EAS Update — отдельный канал.** Он не ходит на origin Expo web за `/data/*.json`. Он качает **manifest + JS bundle + assets, которые Metro резолвит**, с серверов EAS (`updates.url` вида `https://u.expo.dev/<project-id>`).

- [EAS Update introduction](https://docs.expo.dev/eas-update/introduction/): update доставляет non-native pieces — «JS, styling, and images» — over-the-air. `eas update` «publishes your JavaScript bundle and assets».
- [How EAS Update works](https://docs.expo.dev/eas-update/how-it-works/): бинарник = native layer + swappable update layer. `eas update` внутри делает `npx expo export`, грузит bundle на EAS. Runtime: скачать manifest, затем недостающие assets (images, JavaScript bundles, font files, …). Если манифест+ассеты не успели до `fallbackToCacheTimeout` (по умолчанию `0`) — текущий/embedded бандл, новый update применится на следующем запуске.
- [Getting started](https://docs.expo.dev/eas-update/getting-started/): нужен native build с `expo-updates`; канал в `eas.json`; пользователи не переустанавливают приложение.

**Попадает ли JSON в update?**

Metro делит файлы на source vs assets. Source: «JavaScript, TypeScript, **JSON**, and other files used by your application». Assets: images, fonts, «other files that should not be transformed» ([Customizing Metro — Assets](https://docs.expo.dev/guides/customizing-metro/)).

- `import data from './snapshot.json'` / `require('./snapshot.json')` — JSON как **source**: попадает **внутрь JS-бандла**. EAS Update, публикующий JS, унесёт новый снимок. Отдельного asset для JSON нет.
- Файл только в `public/` и **не** `require`'ится — Metro его не резолвит → **в EAS Update не входит**. Он живёт только на web host после `export -p web`.
- Картинки/`require` ассетов: в update, если не отрезаны `updates.assetPatternsToBeBundled`. Паттерн включает только то, что ещё и required в JS. Без паттерна — все ассеты, которые резолвит bundler (поведение SDK 49). Asset selection **не** уменьшает набор файлов в native binary ([Asset selection](https://docs.expo.dev/eas-update/asset-selection/)).

`expo-asset` config plugin линкует в native project только перечисленные типы (images, media, `.db`, `.glb`, …) — **`.json` в списке нет** ([Expo Asset](https://docs.expo.dev/versions/latest/sdk/asset/)). Вшивание снимка через plugin `assets: ["data/homeopathy.json"]` первоисточник не описывает. Штатный путь «JSON в бинарнике» — import в JS (source) или свой копирующий шаг вне docs Expo.

**EAS Update vs fetch с web origin — это не одно и то же.**

| | EAS Update | Fetch `https://<expo-web>/data/*.json` |
| --- | --- | --- |
| Что меняется | Весь JS-слой (+ резолвнутые ассеты) | Только то, что клиент скачал и положил в свой кэш |
| Кто хост | `u.expo.dev` (EAS) | Origin выкладки Expo web |
| Совместимость | Точное совпадение platform + runtime version + channel→branch | Любой HTTPS, который клиент знает |
| Когда видно | По умолчанию: скачать на launch, применить на **следующем** запуске (`checkAutomatically: ON_LOAD`, `fallbackToCacheTimeout: 0`) | Когда клиент сделает `fetch` и запишет кэш (своя логика) |
| Store guidelines | Expo: updates должны следовать правилам App Store / Play Store, включая содержание и способ использования ([FAQ](https://docs.expo.dev/eas-update/introduction/)) | Смена данных справочника без смены JS — не OTA JS |

Native refresh «с выкладки Expo web» в формулировке тикета — это **B** (HTTP JSON с того же деплоя), не **C**. **C** обновляет снимок только если снимок **вшит в JS** (**A+C**). Тогда web-деплой и OTA — два независимых пайплайна (`eas deploy` vs `eas update`).

---

## 3. Офлайн: бинарник vs fetched

**JSON внутри JS-бандла (A).** Гарантия Expo: при отсутствии более нового скачанного update `expo-updates` запускает **embedded update**, который был вшит в бинарник на build ([How it works](https://docs.expo.dev/eas-update/how-it-works/), [`Updates.isEmbeddedLaunch`](https://docs.expo.dev/versions/latest/sdk/updates/)). Снимок как часть этого JS доступен без сети. После успешного OTA тот же снимок живёт в скачанном update; при emergency launch библиотека может откатиться на embedded.

**JSON как Metro asset + `Asset.downloadAsync`.** Файл качается в cache directory. Expo прямо: **нет гарантии persistence между сессиями** — OS может чистить caches; имя `ExponentAsset-{id}.{ext}` ([expo-asset `downloadAsync`](https://docs.expo.dev/versions/latest/sdk/asset/)). Это не «вшито в binary».

**JSON только с web origin (B/D).** Без своего кэша (FileSystem / AsyncStorage / аналог) офлайн **не гарантирован**. Expo не даёт Workbox на native. Клиент сам: при сети обновить кэш, без сети читать кэш, fallback на вшитый снимок — это продукт, не штатный runtime Expo.

**Web.** Relative `/data/*.json` работает в браузере с origin выкладки. Офлайн web без SW не гарантирован; Expo Router предупреждает, что агрессивный service worker на web — footgun, и «for the best offline mobile experience, create a native app with Expo» ([Migrate from Webpack — Service workers](https://docs.expo.dev/router/migrate/from-expo-webpack/)).

Согласование со standing decision «снимок в сборке; при сети — refresh кэша»: первоисточники поддерживают **вшитый JS-снимок + опциональный сетевой refresh**. Сетевой refresh — либо fetch с Expo web origin, либо (если снимок в JS) EAS Update. Второе меняет весь JS-слой, не только снимок.

---

## 4. CORS / same-origin vs native `fetch https://the-web-host/data/*.json`

**Native (Android/iOS).** У native нет модели CORS. React Native: «The security model for XMLHttpRequest is different than on web as there is no concept of CORS in native apps.» `fetch('https://mywebsite.com/mydata.json')` — документированный паттерн. Нужен HTTPS: iOS ATS и Android API 28+ блокируют cleartext по умолчанию.

- [React Native — Networking](https://reactnative.dev/docs/network)

Следствие: native клиент может качать `https://<expo-web-host>/data/homeopathy.json` без CORS-заголовков на static файлах. CORS — проблема **браузера** на другом origin (чужой PWA, telegram WebView и т.д.), не Android/iOS Справочника.

**Web same-origin.** Если Expo web и JSON на одном host (`/data/*.json` из `public/`), браузерный `fetch('/data/...')` — same-origin, CORS не нужен. Это путь самого Expo web клиента.

**Чужой браузерный клиент на другом origin.** Static JSON на публичном URL читается кем угодно; CORS может его ограничить в браузере, native/curl — нет. Standing decision запрещает **позиционировать** это как JSON API для чужих клиентов; она не делает URL секретным. Скрытие корма ≠ access control. Первоисточники Expo не дают «private static file» на EAS Hosting без своей auth.

**EAS Hosting CORS defaults** относятся к **API routes**, которые не обработали `OPTIONS`: permissive `Access-Control-Allow-Origin: <origin || '*'>` и т.д. ([Responses and headers](https://docs.expo.dev/eas/hosting/reference/responses-and-headers/)). На static assets из `public/` эти defaults не описаны как CORS-слой. Asset responses: `ETag`, browser cache.

**Relative `fetch` с native на production.** Для API routes / server output Expo Router: в production native нужно задеплоить сервер и выставить `origin` в config plugin `expo-router`. Тогда `fetch('/my-endpoint')` идёт на этот origin. Фича origin-linking помечена **alpha**. ([API Routes — Native deployment](https://docs.expo.dev/router/web/api-routes/)). Для static JSON без API routes тот же приём (origin + relative fetch) первоисточник описывает в контексте server features; безопасный документированный путь для native — абсолютный HTTPS URL.

---

## 5. Что не работает / footgun — только если так сказано у Expo

**`web.output: 'static'` не запускает код на запросе.** «Rendering at request-time is not supported with `web.output: 'static'`». Нет custom server API. Динамические маршруты без `generateStaticParams` не «просто работают». JSON как файл в `public/` от этого не страдает: это копия файла, не route. ([Static rendering](https://docs.expo.dev/router/web/static-rendering/))

**API routes требуют `web.output: 'server'`, не любой static host.** Таблица output targets: API Routes только у `server`. Expo: «EAS Hosting is the best way to deploy your Expo API routes and servers.» Self-host — свой Node (`expo-server` adapter). ([Publish websites](https://docs.expo.dev/guides/publishing-websites/), [API Routes](https://docs.expo.dev/router/web/api-routes/))

**Cloudflare Pages vs EAS Hosting.** Expo перечисляет Cloudflare Pages как один из static hosts для статически отрендеренного сайта — наравне с EAS Hosting, Netlify, GitHub Pages ([Static rendering — Where can I deploy](https://docs.expo.dev/router/web/static-rendering/)). Отдельного «нельзя на Cloudflare» нет. Нюанс первоисточника: EAS Hosting сам ездит по Cloudflare PoP (`eas-colo` = «Code of the Cloudflare data center that handled the request») ([Responses and headers](https://docs.expo.dev/eas/hosting/reference/responses-and-headers/)). Для **server/API routes** Expo рекомендует EAS Hosting, не «залей dist на Pages».

**SPA-rewrites на `single`.** Для `web.output: 'single'` хосты вроде Netlify предлагают `/* → /index.html`. Это может отдать HTML вместо `GET /data/homeopathy.json`, если не исключить static paths. Для `static` Expo: «You don't need to add Single-Page Application styled redirects» ([Static rendering](https://docs.expo.dev/router/web/static-rendering/), [Publish websites — Netlify](https://docs.expo.dev/guides/publishing-websites/)).

**GitHub Pages + `baseUrl`.** Subpath — experimental `experiments.baseUrl`; нужен `--nojekyll` из‑за `_` в generated files ([Publish websites — GitHub Pages](https://docs.expo.dev/guides/publishing-websites/)). Standing decision и так уводит native refresh с GitHub Pages старого data-репо; если Expo web когда-то окажется на Pages — учитывать `baseUrl`.

**Зарезервированные пути.** `public/assets/` перехватит Metro («404 Asset not found»). Не класть снимок в `/assets`, `/_expo` ([Reserved paths](https://docs.expo.dev/router/reference/reserved-paths)).

**`public/` ≠ native binary.** Relative `/data/*.json` на Android/iOS в runtime Expo не обещает. «Currently, the feature is web-only» для static host public files vs EAS Update ([Customizing Metro](https://docs.expo.dev/guides/customizing-metro/)).

**EAS Update не обновляет native.** Смена native deps / SDK / permissions — новый binary ([When to use EAS Update](https://docs.expo.dev/eas-update/introduction/)). Runtime version build и update должны совпасть точно ([How it works](https://docs.expo.dev/eas-update/how-it-works/)).

**Кэш EAS Hosting для assets.** Per-deployment assets кэшируются indefinitely на стороне Hosting (deployments immutable). Browser default cache для assets — 3600s. Смена alias/production игнорирует этот внутренний кэш. Cached requests всё равно считаются в billing. Клиентский `Cache-Control` на API routes — отдельная история. ([Caching](https://docs.expo.dev/eas/hosting/reference/caching/)) Для «ежедневного bust» как в PWA (`?d=YYYYMMDD` + `cache: 'no-store'`) первоисточник не запрещает query string на static JSON; это клиентская дисциплина, не фича Expo.

**Service worker на Expo web.** Expo: SW «known to cause unexpected behavior»; агрессивный cache тяжело сбросить у пользователей; offline mobile лучше делать native приложением ([Migrate from Webpack](https://docs.expo.dev/router/migrate/from-expo-webpack/)).

---

## Варианты (без выбора)

Для grilling. Все совместимы со standing decisions, кроме пометки у D.

**A. Снимок как JS module в репозитории.** `import` JSON (Metro source) → вшит в web bundle и в native binary. Refresh снимка = новый store binary и/или EAS Update. Web-выкладка не является источником данных для native. Минус относительно «native refresh с Expo web»: канала с web origin нет.

**B. Снимок как `public/data/*.json` на выкладке Expo web.** `export -p web` + EAS Hosting (или другой static host). Native: `fetch('https://<prod-web>/data/....json')` (HTTPS, без CORS). Web: same-origin `/data/...`. Кэш и daily bust — логика клиента (как PWA, но без SW). Вшитый снимок (A) всё равно нужен, если держим «снимок в сборке». URL файла публично читаемый; это не `+api.ts`, но и не секрет.

**C. Снимок только через EAS Update.** JSON в JS (A). `eas update` публикует новый бандл. Не использует origin Expo web. Не заменяет web-выкладку для web-пользователей: web по-прежнему деплоится отдельно (`eas deploy` / static host). Два пайплайна.

**A+B (ближайший аналог PWA + standing runtime).** Вшитый JSON в бандле; онлайн — `fetch` с origin Expo web в обход/мимо HTTP-кэша; офлайн — вшитое или последний удачный кэш. Web-деплой = источник refresh для native. EAS Update не обязателен для снимка (остаётся опцией для JS/UI).

**A+C.** Вшитый JSON; онлайн refresh снимка = OTA JS. Web origin не источник снимка. Расходится с «нативный клиент обновляется с выкладки Expo web», если понимать её буквально.

**D. API route, отдающий JSON.** Штатно на `web.output: 'server'` + EAS Hosting; native `origin` (alpha) или абсолютный URL. Это публичный HTTP endpoint. Стоит вразрез с «не JSON-корм для чужих клиентов», если корм и есть GET JSON. Имеет смысл только если grilling отдельно решит, что «корм» ≠ «свой endpoint с теми же байтами, что static file».

---

## Источники

**Expo (docs.expo.dev / Context7 `/expo/expo`, `/llmstxt/expo_dev_llms_txt`)**

- https://docs.expo.dev/guides/customizing-metro/
- https://docs.expo.dev/guides/publishing-websites/
- https://docs.expo.dev/router/web/static-rendering/
- https://docs.expo.dev/router/web/api-routes/
- https://docs.expo.dev/router/migrate/from-expo-webpack/
- https://docs.expo.dev/router/reference/reserved-paths
- https://docs.expo.dev/eas/hosting/get-started/
- https://docs.expo.dev/eas/hosting/reference/caching/
- https://docs.expo.dev/eas/hosting/reference/responses-and-headers/
- https://docs.expo.dev/eas-update/introduction/
- https://docs.expo.dev/eas-update/getting-started/
- https://docs.expo.dev/eas-update/how-it-works/
- https://docs.expo.dev/eas-update/asset-selection/
- https://docs.expo.dev/versions/latest/sdk/updates/
- https://docs.expo.dev/versions/latest/sdk/asset/

**React Native (first-party)**

- https://reactnative.dev/docs/network

**fuflomycin-pwa (сравнение)**

- https://github.com/fuflomycin/fuflomycin-pwa/blob/main/README.md
- https://github.com/fuflomycin/fuflomycin-pwa/blob/main/src/utils/db.ts
- https://github.com/fuflomycin/fuflomycin-pwa/blob/main/next.config.mjs
- https://github.com/fuflomycin/fuflomycin-pwa/blob/main/scripts/build-data.js
