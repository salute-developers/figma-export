# Figma parsers

Монорепозиторий содержит два независимых Figma-плагина:

- [`packages/parserOld`](./packages/parserOld) — старый плагин экспорта иконок в GitHub/Plasma. Код перенесён без изменения продуктовой логики.
- [`packages/parserNew`](./packages/parserNew) — новый независимый парсер библиотек иконок. Рекурсивно находит компоненты в выделении или на текущей странице, экспортирует SVG и формирует JSON с категорией, группой, размером и вариантом.

## Команды

```sh
npm ci
npm run build
npm test
```

Сборка одного пакета:

```sh
npm run build:parserOld
npm run build:parserNew
```

После сборки импортируйте нужный manifest через Figma Desktop:

- `packages/parserOld/manifest.json`
- `packages/parserNew/manifest.json`
