## Plasma Icon Exporter plugin for Figma

This plugin can export selected icon from figma layouts.

### Install

```
npm run build
```

### Условия для загрузки plugins

-   у учетной записи включена возможность `dev mode`;
-   установлена приложение `Figma` (MacOS, Windows);

### Import plugin to figma

1. Выбираем в верхнем меню: `Plugins` -> `Development` -> `Import plugin from manifest`.
2. После плагин доступен в приложении

### Использование

-   выбираем иконку или группу иконок и запускаем плагин
-   появиться UI плагина в котором можно будет указать название commit и заголовок для pull request (так же будет информация о кол-ве svg иконок)

### Как использовать token (PAT)?

Для корректной работы плагина нужен github token - [Creating a fine grained personal access token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens#creating-a-fine-grained-personal-access-token)

В файле `useGithubAuth.ts` укажите полученный вами токен.

```ts
const [token, setToken] = useState<string | undefined>('PAT');
```

#### Обход ограничение github rate limit

К сожалению за раз обработать более 600 иконок нельзя - есть ограничения.

Поэтому можно в "ручном" режиме добавлять commit к созданной ветке.

-   создаем pull request с первым набором иконок через плагин
-   убедились что ветка и pull request созданы
-   в файле `useRunGithubPRProcess.ts` выключаем шаги: 0, 6, 7
-   в файле `App.tsx` меняем `branchName` на созданную вами ветку, например - `icon-export-63qgo1r6vg8`

```tsx
const [step, createPullRequest] = useRunGithubPRProcess({
    branchName: `icon-export-${getSalt()}`, //"<-- icon-export-63qgo1r6vg8"
});
```

-   в файле `githubFilesFetcher.ts` меняем в методе `getFilesSource` значение для `ref`

```ts
const result = await octokit.rest.repos.getContent({
    ref: 'dev', // <-- branchName (icon-export-63qgo1r6vg8)
});
```

Этот "трюк" позволит создавать новые commits и добавлять их к **уже** **созданной** ветке/pull request.

Примечание: В корне пакета `icon-export-ui` должен быть запущен webpack - `npm run watch`.
