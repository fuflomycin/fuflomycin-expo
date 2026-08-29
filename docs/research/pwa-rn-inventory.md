# Инвентаризация PWA и старого RN

Зачем эта заметка: спека Справочника выбирает salvageable-детали из двух существующих клиентов, а не угадывает экраны, поля, поиск и офлайн.

Снято с исходников (не с README-пересказов):

| Клиент | Репозиторий | SHA |
| --- | --- | --- |
| PWA | [fuflomycin/fuflomycin-pwa](https://github.com/fuflomycin/fuflomycin-pwa) | `13e8e213c02817fc9a9b70010fe77c0d87bcb7b4` |
| RN | [fuflomycin/fuflomycin_app](https://github.com/fuflomycin/fuflomycin_app) | `b7b42049e6e41b14c1acade22278245e44d6ec81` |

Standing decisions (не переоткрывать): это новый продукт; salvage details only; работа пользователя — поиск по всем → список → препарат → «о программе»; вкладок/фильтров категорий в первой спеке нет; бренд — имя «Фуфломицины» + красный + цветовые ярлыки, не 1:1 порт MUI/RN.

Ниже — что реально есть в коде. Рекомендаций «взять / не брать в продукт» нет, кроме разметки salvageable vs chrome.

## Общий скелет (оба клиента)

Оба клиента — один поток без вкладок категорий:

1. Поиск по объединённому списку всех препаратов.
2. Список.
3. Карточка препарата по `id`.
4. Экран «О программе».

Категории (гомеопатия / РСП / ФК) существуют как три JSON-файла, которые сливаются в один массив и сортируются по `title`. UI-табов, сегментов и фильтров по категории нет.

- PWA: `src/app/page.tsx` → `Home`; `src/app/[id]/page.tsx` → `DrugPage`; `src/app/info/page.tsx`; `src/utils/db.ts` (`DATA_FILES = ['homeopathy', 'rsp', 'fk']`).
- RN: `src/App.tsx` — стек `DrugList` / `DrugItem` / `DrugInfo`; `src/db.ts` — те же три URL GitHub Pages.

## Экраны и маршруты

### PWA (Next.js App Router)

| Маршрут | Что показывает |
| --- | --- |
| `/` | Фиксированный AppBar: бейдж числа результатов, поле «Препарат», кнопка «информация». Ниже — полный (или отфильтрованный) список. `src/app/page.tsx`, `src/components/Home/Home.tsx` |
| `/{id}` | AppBar с «назад» и `title`. Галерея, `title`, иконка источника, синонимы, секция+ярлык, HTML `contents`, при наличии `mnn` — кнопки Cochrane/PubMed. `src/app/[id]/page.tsx`, `src/components/DrugPage/DrugPage.tsx` |
| `/info` | AppBar «О программе», исходники GitHub, Boosty, состав справочника, легенда аббревиатур. `src/app/info/page.tsx` |
| `/~offline` | Английский fallback SW: «You are offline» / Refresh. `src/app/~offline/page.tsx`; URL прекешируется в `public/sw.js` |

Корень документа: `lang="ru"`, имя «Фуфломицины», `themeColor: '#FF5959'`, description метаданных «Расстрельный список препаратов» (`src/app/layout.tsx`). Манифест: `name`/`short_name` «Фуфломицины», `theme_color` `#FF5959` (`public/manifest.json`). TWA: то же имя и цвет (`android/twa-manifest.json`).

Статические параметры карточек читаются из собранных JSON (`src/utils/drugStaticParams.ts`).

### RN (React Navigation native-stack)

Три экрана, системный header скрыт (`src/App.tsx`):

| Экран | Что показывает |
| --- | --- |
| `DrugList` | Красная панель `#ff5959`: лупа + число результатов (или спиннер загрузки), `TextInput` без подписи, иконка info. `FlatList` препаратов. `src/DrugList.tsx` |
| `DrugItem` | Панель «назад» + `title`. Фото или swiper, `title`, ссылка-источник, синонимы, секция+ярлык, HTML в `AutoHeightWebView`. `src/DrugItem.tsx` |
| `DrugInfo` | «О программе»: GitHub, Boosty, состав справочника, легенда. `src/DrugInfo.tsx` |

Имя на экране: `displayName` «Фуфломицины» (`app.json`). Лаунчер Android/iOS в этом SHA — `fuflomycin_rn` (`android/.../strings.xml`, `ios/fuflomycin_rn/Info.plist`) — chrome витрины стора, не бренд UI.

## Поля препарата

### Схема (есть в типе, не все рисуются)

PWA `src/utils/db.ts` `Drug`:

`id`, `section?`, `title`, `mnn?`, `photo?`, `gallery?`, `other?`, `producer?`, `source?`, `label` (`'red' \| 'orange' \| 'gold' \| 'green' \| 'gray' \| 'yellow'`), `contents`, плюс производные `otherstr`, `index`.

RN `src/db.ts` `Drug`: то же без `mnn`; `label` без `'yellow'`.

Шаблоны frontmatter PWA (`content/.homeopathy`, `content/.rsp`, `content/.fk`) задают те же ключи. Сборка прокидывает frontmatter + HTML тела как `contents`, нормализует `gallery` в массив, ставит `id` из имени файла (`scripts/build-data.js`).

Значения ярлыков в markdown PWA на этом SHA: `red` 401, `orange` 159, `yellow` 2 (`alpharona`, `laferobion`). `gold` / `green` / `gray` в карточках не встречаются; в типе PWA они есть, в RN-типе `yellow` нет.

### Что реально рисуется

| Поле | Список PWA | Карточка PWA | Список RN | Карточка RN |
| --- | --- | --- | --- | --- |
| `title` | primary | AppBar + h5 | да | панель + заголовок |
| `other` / `otherstr` | secondary | серый текст, если есть | серый, если есть | `other.join(', ')`, если длина > 0 |
| `section` | нет | строка + иконка, если truthy | нет | всегда блок; текст может быть пустым |
| `label` | нет | `htmlColor` иконки секции | нет | `color` иконки `emoticon-sad` |
| `source` | нет | иконка-ссылка | нет | иконка, `Linking.openURL` |
| `contents` | нет | `dangerouslySetInnerHTML` | нет | `AutoHeightWebView` |
| `photo` / `gallery` | нет | см. «Изображения» | нет | см. «Изображения» |
| `mnn` | нет | кнопки Cochrane / PubMed | нет в типе и UI | нет |
| `producer` | нет | нет | нет | нет |
| `id` | ключ списка / URL `/{id}` | поиск в массиве | `keyExtractor` | приходит целиком в `route.params` |

Список PWA: `primary={drug.title}` `secondary={drug.otherstr}` (`src/components/DrugListItem/DrugListItem.tsx`). RN: то же (`src/DrugList.tsx` `Item`).

`producer` заполнен во многих карточках (в т.ч. гомеопатия), но ни один клиент его не показывает.

PWA карточка без опциональных данных: пустая галерея, без источника, секции и MNN-кнопок (`src/components/DrugPage/DrugPage.test.tsx`). Неизвестный `id`: пустой экран без заголовка.

## Поиск

Оба клиента строят индекс одинаково: `(title + ', ' + other.join(', ')).toLocaleUpperCase()` (`fuflomycin-pwa/src/utils/db.ts`, `fuflomycin_app/src/db.ts`). В поиск не входят `contents`, `mnn`, `producer`, `section`, `id`.

Фильтр: `index.includes(prompt.toLocaleUpperCase())` — подстрока, не граница слова, без `trim`. Регистр: `toLocaleUpperCase` на запросе и на индексе.

Пустой запрос:

- PWA: явная ветка `newPrompt.length === 0` → весь список (`src/components/Home/Home.tsx`). Тест: «restores all drugs when the search is cleared» (`Home.test.tsx`).
- RN: отдельной ветки нет; `''.includes` на любой `index` истинно, поэтому пустой запрос тоже даёт все (`src/DrugList.tsx`).

Пустой результат:

- PWA: список пустой, бейдж и иконка лупы скрыты (`results.length > 0`; `Home.test.tsx`).
- RN: `FlatList` пустой; число `0` остаётся под лупой.

Счётчик: PWA `Badge` `max={999}`; RN мелкий белый текст `{results.length}`. Подпись поля только в PWA: `label="Препарат"`.

Сортировка списка: `title.toLocaleUpperCase()` по возрастанию при загрузке, не при каждом нажатии клавиши.

PWA не показывает спиннер, пока `getDrugs` грузит данные. RN держит `ActivityIndicator` до первого успешного storage или сети.

## Изображения / галерея

База путей разная:

- PWA: локально `/img/{filename}` (`src/components/Gallery/Gallery.tsx`), файлы копируются в `public/img/` при `data:build`.
- RN: `https://fuflomycin.github.io/fuflomycin/img/` (`src/DrugItem.tsx`).

Сборка слайдов:

- PWA: слайды есть только если есть `photo`: `[photo, ...gallery]`. Нет `photo` → пустой Swiper, даже если `gallery` непустой (`DrugPage.tsx`). Swiper: navigation + clickable pagination, высота 300px, `objectFit: contain`, `alt=""`.
- RN: если `gallery && gallery.length > 1` — только элементы `gallery` в `react-native-swiper`; иначе одно `photo`, если оно есть. Высота 150px, `resizeMode: contain`. Галерея из одного файла (пример: `content/rsp/allapinin.md` `gallery: [allapinin2.png]`) в RN не становится swiper.

Непустые `gallery:` в PWA-контенте на этом SHA — три карточки (`allapinin`, `ademetionin`, `adaptol`).

## Офлайн / кэш / обновление

### PWA: service worker + суточный JSON

Загрузка (`src/utils/db.ts`, тесты `src/utils/db.test.ts`):

- Ключ `localStorage`: `fuflomycin-data-refreshed-at` (только timestamp, не массив препаратов).
- Окно свежести: `24 * 60 * 60 * 1000`.
- Онлайн и данные старше суток: `GET /data/{homeopathy,rsp,fk}.json?d=YYYYMMDD` с `cache: 'no-store'`. Успех → память + новый timestamp.
- Онлайн, refresh упал, память есть → старый массив.
- Офлайн или нет свежего кэша: `GET /data/{name}.json` без query (чтобы попасть в SW-кэш).
- Память жива, пока свежо: повторный `getDrugs` не ходит в сеть.

Workbox (`next.config.mjs`):

- `cacheStartUrl`, `dynamicStartUrl`, `reloadOnOnline`, `cacheOnFrontEndNav`.
- `/data/*.json?d=` → `NetworkOnly` (суточный обход кэша).
- Картинки `jpg|jpeg|gif|png|svg|ico|webp` → `CacheFirst`, кэш `static-image-assets`, max 400, 30 дней.
- Остальные same-origin (включая JSON без `?d=`) → `NetworkFirst`, сутки, до 700 записей.
- `maximumFileSizeToCacheInBytes`: 5 MiB.

`public/sw.js` прекеширует `/~offline`. Экран `/~offline` — английский chrome next-pwa, не продуктовый дисклеймер.

Хук `src/hooks/useLocalStorage.ts` в UI не используется.

### RN: AsyncStorage + GitHub Pages

`src/db.ts` + `src/DrugList.tsx` `useEffect`:

1. `AsyncStorage.getItem('@drugs')` → если есть, сразу список и `loading=false`.
2. Затем всегда `fetch` трёх URL:
   - `https://fuflomycin.github.io/fuflomycin/homeopathy.json`
   - `https://fuflomycin.github.io/fuflomycin/rsp.json`
   - `https://fuflomycin.github.io/fuflomycin/fk.json`
3. Успех → заменить список (если `prompt === ''`, и results), `saveDataToStorage`.
4. Нет суточного окна: каждый запуск экрана пытается сеть.
5. `getDataFromGithub` без `try/catch`: сеть падает после storage — остаётся старый снимок; если storage пуст — `loading` так и остаётся `true`.
6. Картинки не кладутся в AsyncStorage; грузятся с GitHub Pages как `Image` `uri`.

## «О программе»: политика vs chrome

Одинаковый продуктовый текст в обоих about (PWA `src/app/info/page.tsx`, RN `src/DrugInfo.tsx`):

- Справочник неполный: РСП (Никита Жуков), гомеопатия, негативный перечень ФК РАМН.
- Основание списка: нет убедительных данных об эффективности по заявленным показаниям / нет в авторитетных источниках и рекомендациях.
- Легенда: РСП; Cochrane, Pubmed, FDA, RXlist; ВОЗ; ЖНВЛП; РКИ; РЛС; ФК.

Это product-policy (состав и основание справочника), не chrome виджетов.

Медицинский дисклеймер «не источник персональных медицинских рекомендаций / обсуждать с врачом» есть в README PWA, на экране «О программе» его нет. В RN README этого абзаца нет.

Мета PWA `description`: «Расстрельный список препаратов» (`layout.tsx`, `manifest.json`) — витрина, не дисклеймер.

Chrome about (не политика):

- Кнопки GitHub `https://github.com/fuflomycin` и Boosty `https://boosty.to/bndby`.
- PWA: гиперссылка РСП на encyclopatia.ru; RN: тот же смысл без URL, пункты категорий покрашены (`orange` / `red`).
- Заголовок «О программе», «назад», «Поддержка».

Прочий chrome UI: MUI AppBar/Toolbar/Badge/TextField; спиннеры на навигации PWA; RN `MaterialCommunityIcons`; `#ff5959` панели; `PRIVACY.md` RN (шаблон стора, 2022); TWA/Play `com.fuflomycin_rn`; английский `/~offline`; опечатка кнопки `COCHRAIN`; `react-window` в `package.json` PWA не используется в `DrugList`.

## Что есть у одного и нет у другого

Только PWA:

- Поле `mnn` и внешний поиск Cochrane / PubMed на карточке.
- Ярлык `yellow` в типе и в двух карточках.
- Суточный cache-bust JSON, SW, `/~offline`, локальные `/data` и `/img`.
- Подпись поля поиска, бейдж с потолком 999, скрытие лупы при нуле результатов.
- Явная пустая ветка поиска; секция на карточке только если есть.
- `photo` всегда первым слайдом перед `gallery`.
- Ссылка encyclopatia в about; `lang=ru`; TWA.
- HTML через `dangerouslySetInnerHTML` (клики по ссылкам в тексте — обычные `<a>` в HTML).

Только RN:

- Persist всего массива в AsyncStorage; сеть на каждом заходе на список.
- Данные и картинки с `fuflomycin.github.io`.
- `FlatList` + `keyboardShouldPersistTaps`.
- `AutoHeightWebView`: `http*` в HTML открывается через `Linking`, документ не навигирует (`onShouldStartLoadWithRequest`).
- Спиннер первой загрузки; счётчик всегда виден.
- Swiper только при `gallery.length > 1`; иначе одно `photo`.
- Назад с карточки — `navigate('DrugList')`, не `goBack`.
- `PRIVACY.md`; permission `INTERNET`.

## Salvageable vs chrome

Salvageable (детали, которые спека может выбрать, не угадывая):

- Работа: поиск по всем → список (`title` + синонимы) → препарат → about.
- Три JSON-категории слиты в один алфавитный список; UI-вкладок нет (совпадает со standing decision).
- Рисуемые поля карточки: `title`, синонимы, `section` + цвет ярлыка на иконке, `source`, HTML `contents`, фото/галерея; опционально `mnn` → внешние базы.
- `producer` в данных есть, в UI нигде нет.
- Поиск: только `title`+синонимы, `toLocaleUpperCase`, `includes`, пустой запрос = все, счётчик.
- Ярлыки как CSS-имена цветов на иконке секции; в данных живые `red` / `orange` / `yellow`.
- About: неполный список + три происхождения + основание по доказательной медицине + легенда аббревиатур.
- Бренд в UI: «Фуфломицины», красный `#ff5959` / `#FF5959`.
- Офлайн-смысл: последняя рабочая копия JSON; картинки отдельно (SW CacheFirst vs сеть GitHub).
- Источник карточки — внешний URL.

Chrome (не путать с продуктом; не 1:1 MUI/RN):

- Виджеты MUI / vector icons / native-stack / Swiper chrome.
- Английский offline-экран, TWA, манифест, privacy-шаблон стора, Boosty/GitHub-кнопки как layout.
- Спиннеры навигации, бейдж vs текст счётчика, высота галереи 300 vs 150.
- Опечатка COCHRAIN; README RN «Егора Жукова» vs «Никиты Жукова» в about.
- Лаунчер `fuflomycin_rn`.
)
