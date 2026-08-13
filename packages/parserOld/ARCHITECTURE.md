# Архитектура проекта Icon Export UI

## 📋 Обзор проекта

Это Figma плагин для экспорта иконок в GitHub репозиторий `salute-developers/plasma`. Плагин автоматизирует процесс от выделения компонентов в Figma до создания Pull Request с готовыми иконками.

## Входная точка

```
manifest.json
├── main: dist/main.js  → src/plugin/main.ts (Figma Plugin API)
└── ui: dist/ui.html    → src/app/index.tsx (React UI)
```

## Архитектура (2 процесса)

```
┌─────────────────────────────────────────────────────────────┐
│                    FIGMA PLUGIN CONTEXT                      │
│                   (src/plugin/main.ts)                       │
│                                                               │
│  • Получает выделенные компоненты из Figma                   │
│  • Экспортирует SVG через getExportSvg()                     │
│  • Нормализует имена (размер/категория/название)             │
│  • Управляет токеном в clientStorage                         │
│  • Отправляет данные в UI через postMessage                  │
└───────────────────────────┬─────────────────────────────────┘
                            │ postMessage
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      UI CONTEXT (React)                      │
│                   (src/app/components/App.tsx)               │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  1. Аутентификация GitHub                            │    │
│  │     useGithubAuth → getLongPollToken                 │    │
│  └─────────────────────────────────────────────────────┘    │
│                            │                                  │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  2. Форма ввода данных                               │    │
│  │     Form.tsx - редактирование метаданных иконок      │    │
│  └─────────────────────────────────────────────────────┘    │
│                            │                                  │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  3. Создание Pull Request                            │    │
│  │     useRunGithubPRProcess                            │    │
│  └─────────────────────────────────────────────────────┘    │
└───────────────────────────┬─────────────────────────────────┘
                            │ GitHub API (Octokit)
                            ▼
                    salute-developers/plasma
```

## 🔄 Процесс создания и сохранения данных в Git

### Этап 1: Извлечение данных из Figma

**Файл:** `src/plugin/main.ts:41-66`

```typescript
// Из выделенных FRAME находит компоненты
// Нормализует имена: "24 / Operation / 24_ShareScreenOutline"
//   → { size: 24, category: "Operation", name: "ShareScreenOutline" }
// Экспортирует SVG через Figma API
```

**Процесс:**

1. Получает `figma.currentPage.selection` (выделенные узлы)
2. Ищет все COMPONENT и INSTANCE внутри FRAME
3. Парсит имя через `getNormalizedName()`:
    - Новый формат: `24 / Operation / 24_ShareScreenOutline`
    - Старый формат: `Player / ic_36_pause_outline`
4. Экспортирует SVG через `getExportSvg()` (использует Figma `exportAsync`)
5. Отправляет данные в UI через `figma.ui.postMessage()`

### Этап 2: Обработка в UI

**Файл:** `src/app/components/utils.ts`

**Функция `getFilesPayload()`:**

```typescript
// 1. Получает существующий Icon.tsx из GitHub
getGitHubData(token) → getFilesSource()

// 2. Для каждой иконки:
getIconCategories(source, name, category)  // Добавляет в категорию
getIconSvg(svg)                            // Форматирует SVG

// 3. Возвращает структуру:
{
  iconSourceComponent: "обновленный Icon.tsx",
  iconsComponents: [
    { iconSize, iconName, iconSvgAsset }
  ]
}
```

**Модификация Icon.tsx** (`src/source/iconCategories.ts`):

-   Находит объект `iconSectionsSet`
-   Добавляет иконку в нужную категорию
-   Создает категорию, если она не существует
-   Формат: `{ Category: { iconName: 'IconName' } }`

### Этап 3: Создание Pull Request через GitHub API

**Файл:** `src/app/hooks/useRunGithubPRProcess.ts:31-64`

**7 шагов процесса:**

```
Step 0: createBranch()
   └── Создает новую ветку от 'dev'
       Имя: icon-export-{random-salt}

Step 1: getCurrentSha()
   └── Получает SHA текущего коммита и дерева
       API: git.getRef + git.getCommit

Step 2: createBlob()
   └── Создает blob для каждого файла
       Файлы: Icon.tsx + все SVG файлы
       API: git.createBlob (encoding: utf-8)

Step 3: createTree()
   └── Создает новое дерево с файлами
       API: git.createTree (mode: 100644, type: blob)

Step 4: createCommit()
   └── Создает коммит
       Сообщение: "{type}(plasma-icons): {message}"
       API: git.createCommit

Step 5: updateCommit()
   └── Обновляет ссылку ветки на новый коммит
       API: git.updateRef

Step 6: createPullRequest()
   └── Создает PR в репозиторий
       base: refs/heads/dev
       head: refs/heads/{branchName}
       API: pulls.create
```

**Детали GitHub API операций** (`src/app/api/githubFilesFetcher.ts`):

```typescript
// Получение текущего состояния
getCurrentSha()
  → git.getRef(heads/{branch})
  → git.getCommit(commit_sha)
  → { commitSha, treeSha }

// Создание файлов
createBlob(content)
  → git.createBlob({ content, encoding: 'utf-8' })
  → { sha }

// Создание дерева файлов
createTree(blobs, paths, parentTreeSha)
  → git.createTree({
      tree: [{ path, mode: '100644', type: 'blob', sha }],
      base_tree: parentTreeSha
    })
  → { sha: newTreeSha }

// Создание коммита
createCommit(message, treeSha, parentCommitSha)
  → git.createCommit({
      message,
      tree: treeSha,
      parents: [parentCommitSha]
    })
  → { sha: newCommitSha }

// Обновление ветки
updateCommit(branch, sha)
  → git.updateRef({ ref: heads/{branch}, sha })

// Создание Pull Request
createPullRequest(branch, title)
  → pulls.create({
      base: 'refs/heads/dev',
      head: 'refs/heads/{branch}',
      title
    })
  → { html_url }
```

## 📁 Главные модули

### 1. Извлечение данных (Plugin Context)

-   **`src/plugin/main.ts`** - главная логика плагина
    -   Обработка выделенных компонентов
    -   Нормализация имен
    -   Управление токеном в clientStorage
-   **`src/source/iconAsset.ts`** - экспорт SVG из Figma
    -   `getExportSvg()` - экспорт через Figma API

### 2. Работа с GitHub API

-   **`src/app/api/githubFilesFetcher.ts`** - все операции Git

    -   `getCurrentSha()` - получение текущего состояния
    -   `createBlob()` - создание blob объектов
    -   `createTree()` - создание дерева файлов
    -   `createCommit()` - создание коммита
    -   `updateCommit()` - обновление ссылки ветки
    -   `createBranch()` - создание новой ветки
    -   `createPullRequest()` - создание PR
    -   `getFilesSource()` - получение файлов из репозитория

-   **`src/app/api/githubAuth.ts`** - аутентификация
    -   `getLongPollToken()` - long polling для OAuth токена

### 3. Обработка данных

-   **`src/app/components/utils.ts`** - формирование структуры файлов

    -   `getFilesPayload()` - создание payload для GitHub
    -   `getFilesTree()` - создание дерева файлов
    -   `getGitHubData()` - получение данных из GitHub
    -   `prettify()` - форматирование кода через Prettier

-   **`src/source/iconCategories.ts`** - модификация Icon.tsx

    -   Добавление иконок в категории
    -   Создание новых категорий

-   **`src/source/iconSvg.ts`** - генерация SVG файлов
    -   Простой экспорт SVG кода

### 4. UI и состояние

-   **`src/app/hooks/useRunGithubPRProcess.ts`** - orchestration процесса PR

    -   Управление шагами создания PR
    -   Координация всех API вызовов

-   **`src/app/hooks/useGithubAuth.ts`** - управление аутентификацией

    -   Хранение и получение токена

-   **`src/app/components/App.tsx`** - главный компонент

    -   Обработка сообщений от плагина
    -   Управление состоянием приложения
    -   Отображение разных экранов (Auth, Form, Process)

-   **`src/app/components/form/Form.tsx`** - форма редактирования
    -   Редактирование метаданных иконок
    -   Настройка commit message и PR title

## 🎯 Структура сохраняемых файлов

```
packages/plasma-icons/src/scalable/
├── Icon.tsx (модифицируется - добавляется в iconSectionsSet)
└── Icon.svg.{size}/
    └── {IconName}.svg (создается новый SVG файл)
```

**Пример:**

```typescript
// Для иконки: size=24, name="ShareScreenOutline", category="Operation"

// 1. Модифицируется файл:
packages/plasma-icons/src/scalable/Icon.tsx
// Добавляется:
export const iconSectionsSet = {
  Operation: {
    shareScreenOutline: 'ShareScreenOutline',
  }
};

// 2. Создается файл:
packages/plasma-icons/src/scalable/Icon.svg.24/ShareScreenOutline.svg
// Содержимое: SVG код иконки
```

## 🔐 Аутентификация

**Процесс:**

1. Пользователь открывает плагин
2. Плагин проверяет наличие токена в `figma.clientStorage`
3. Если токена нет - отображается `AuthWait` компонент
4. `useGithubAuth` запускает long polling на сервер аутентификации
5. Пользователь авторизуется через OAuth
6. Токен сохраняется в `figma.clientStorage` и в React state
7. Токен используется для всех GitHub API запросов

## 📦 Зависимости

**Основные:**

-   `octokit` - GitHub API клиент
-   `react` + `react-dom` - UI
-   `@salutejs/plasma-web` - UI компоненты
-   `prettier` - форматирование кода
-   `styled-components` - стилизация

**DevDependencies:**

-   `webpack` - сборка
-   `typescript` - типизация
-   `@figma/plugin-typings` - типы Figma API

## 🚀 Процесс использования (end-to-end)

1. **Дизайнер в Figma:**

    - Выделяет FRAME с компонентами иконок
    - Запускает плагин

2. **Плагин (Plugin Context):**

    - Извлекает все COMPONENT/INSTANCE
    - Парсит имена и размеры
    - Экспортирует SVG
    - Отправляет данные в UI

3. **UI (React Context):**

    - Аутентифицирует пользователя в GitHub
    - Отображает форму с метаданными иконок
    - Пользователь редактирует названия, commit message, PR title
    - Пользователь нажимает Submit

4. **GitHub Integration:**

    - Получает существующий Icon.tsx из репозитория
    - Модифицирует Icon.tsx (добавляет категории)
    - Создает blob для всех файлов (Icon.tsx + SVG)
    - Создает новую ветку от dev
    - Создает tree, commit, обновляет ветку
    - Создает Pull Request

5. **Результат:**
    - PR создан в репозитории salute-developers/plasma
    - Ссылка на PR отображается в UI
    - Готово для code review и merge

## 📝 Типы данных

```typescript
// Метаданные иконки
interface IconPayload {
    size: number; // 16, 24, 36, etc.
    svg: string; // SVG код
    name: string; // ShareScreenOutline
    category: string; // Operation
}

// Данные для формы
interface FormPayload {
    iconsMetaData: IconPayload[];
    commitType: string; // feat | fix
    commitMessage: string; // Add icon `IconName`
    pullRequestHeader: string; // Add icon `IconName`
}

// Payload для GitHub
interface FilesPayloadResponse {
    iconSourceComponent: string; // Icon.tsx content
    iconsComponents: IconComponents[]; // SVG files
}
```

## 🎨 UI компоненты

```
App.tsx
├── AuthWait (если нет токена)
├── PullRequestProcess (во время создания PR)
└── Form (главная форма)
    ├── Header
    ├── IconList
    │   └── IconItem (для каждой иконки)
    │       ├── IconPreview (превью SVG)
    │       └── Input (редактирование имени)
    └── Footer
```

Процесс полностью автоматизирован: от выделения компонентов в Figma до создания Pull Request с готовыми иконками в репозитории.
