# teamsfx-cli

## For developpers to build and run your local project
0. Download the repo and cd to the repo path.
1. Run: `npm install`
2. Run: `npm run build`
3. Run: `npm link --force`
4. Now the package is installed in your global npm folder. You can type 'teamsfx --help' to see how to use the cli tool.

## For users to install the package
1. Run: `npm install -g teamsfx-cli` (Pls check the version is the latest version)
2. Now the package is installed in your global npm folder. You can type 'teamsfx --help' to see how to use the cli tool.

## Example

### Verbose or debug

We add two boolean options `verbose` and `debug`. By default, `verbose` is `true` and `debug` is `false`, so the log provider shows `info/warn/error` messages. When set `debug` as `true`, it will show all messages. When set `verbose` and `debug` as `false`, it only shows `error` messages. The priority of `debug` is higher than `verbose`.

```bash
# verbose is false and debug is false
teamsfx xxx --verbose false
# verbose is true and debug is false
teamsfx xxx
# debug is true
teamsfx xxx --debug
```

### New commands

```bash
cd /path/to/a/folder/

# create a teams app which hosting on Azure (with no sql/function).
teamsfx new --app-name azureApp

# create a teams app which hosting on Azure (with sql).
teamsfx new --app-name azureApp --azure-resources sql

# create a teams app which hosting on Azure (with function).
teamsfx new --app-name azureApp --azure-resources function --function-language JavaScript

# create a teams app which hosting on Azure (with sql and function).
teamsfx new --app-name azureApp --azure-resources function sql --function-language JavaScript

# create a teams app which hosting on SPFx.
teamsfx new --app-name spfxApp --host-type SPFx
```

### Login && set subscription

```bash
cd /path/to/your/project/

# login azure
teamsfx account login azure
# login appStudio
teamsfx account login m365

# set azure subscription for an project
cd /path/to/your/project
teamsfx account set --subscription 1756abc0-3554-4341-8d6a-46674962ea19
```

### Add resource to project

```bash
cd /path/to/your/project/

# Add Azure Function
teamsfx resource add azure-function --function-language JavaScript --subscription 1756abc0-3554-4341-8d6a-46674962ea19
# Add Azure SQL
teamsfx resource add azure-sql
```

### Show/List resource config of the project
```bash
teamsfx resource list
teamsfx resource show azure-function
```

### Update AAD Permission
```bash
teamsfx resource configure aad --aad-env both
```
### Provision

```bash
# cd to your azure project with function/sql
cd /path/to/your/azure/project/
teamsfx provision --subscription 1756abc0-3554-4341-8d6a-46674962ea19 --sql-admin-name Abc123321 --sql-password Cab232332 --sql-confirm-password Cab232332
```

### Deploy

```bash
teamsfx deploy --deploy-plugin fx-resource-frontend-hosting
teamsfx deploy --deploy-plugin fx-resource-frontend-hosting fx-resource-function
teamsfx deploy --deploy-plugin fx-resource-spfx
```

### publish

```bash
teamsfx publish --manifest-folder /path/to/your/project/.fx
```

## How to Generate Parameter Files (for Repo Contributors)

Now CLI cannot get all questions through `core.getQuestions`, because this API depends on an existing project. There are some hard code in the `src/paramGenerator.ts` to specify some question nodes.

```bash
git clone https://github.com/OfficeDev/TeamsFx.git
cd packages\cli
npm install
npm run build
npm link --force

# new an azure project
teamsfx new --app-name azureApp --azure-resources sql function --folder test-folder
# call param generator
ts-node .\src\paramGenerator.ts
```

## Known issue
1. Currently SPFx support Node.JS V12.x
2. teamsfx start

## The rest of work

### features for user:
1. login/logout azure by popuping window
2. move the logic of `set subscription` to common lib
3. script to collect questions
4. interact with user
5. webpack
6. double confirm: depends on 8

### features for e2e test:
1. use test account to login azure/appstudio
