# teamsfx-cli

## For developpers to build and run your local project

1. `git clone https://github.com/OfficeDev/TeamsFx.git`
2. `cd TeamsFx`
3. `npm install`
4. `npm run bootstrap`
5. `cd packages/cli`
6. `npm link --force --production`

If you meet the error showing that some package cannot install, you can delete this package's `package-lock.json` file and try `npm run bootstrap` again.

`npm link` will search `fx-api/fx-core` from npm registry (not link) and now they are in the private npm registry, so you should setup the private npm registry.

`npm link --force --production` will break the links of `fx-api/fx-core` and download them from npm registry, so after running `npm link --force --production`, you should remove `packages/cli/node_modules/fx-api` and `packages/cli/node_modules/fx-core`, then run `npm run bootstrap` again.

## For users to install the package
1. Run: `npm install -g teamsfx-cli` (Pls check the version is the latest version)
2. Now the package is installed in your global npm folder. You can type 'teamsfx --help' to see how to use the cli tool.

## Commands

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
# create interactively.
teamsfx new

# non-interactively create a teams app which hosting on Azure (with sql).
teamsfx new --interactive false --app-name azureApp --azure-resources sql

# non-interactively create a teams app which hosting on Azure (with function).
teamsfx new --interactive false --app-name azureApp --azure-resources function

# non-interactively create a teams app which hosting on Azure (with sql and function).
teamsfx new --interactive false --app-name azureApp --azure-resources function sql

# non-interactively create a teams app which hosting on SPFx.
teamsfx new --interactive false --app-name spfxApp --host-type SPFx
```

### Login && set subscription

```bash
# login azure
teamsfx account login azure
# login appStudio
teamsfx account login m365

# set azure subscription for an project
cd /path/to/your/project
teamsfx account set --subscription 1756abc0-3554-4341-8d6a-46674962ea19
```

### Add capability to project

```bash
cd /path/to/your/project/
# Add tab
teamsfx capability add tab
# Add bot
teamsfx capability add bot
```

### Add resource to project

```bash
cd /path/to/your/project/
# Add Azure Function
teamsfx resource add azure-function
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
teamsfx provision --sql-admin-name Abc123321 --sql-password Cab232332 --sql-confirm-password Cab232332
```
### Test/Validate
```bash
teamsfx test
```

### Deploy

```bash
teamsfx deploy
teamsfx deploy frontend-hosting
teamsfx deploy "frontend-hosting function"
teamsfx deploy spfx
```

### Build
```bash
teamsfx build
```

### Publish

```bash
teamsfx publish
```

## How to run e2e-test locally

### Setup repo
You can follow `For developpers to build and run your local project` at the top of this readme.

### Run
`npm run e2e-test`

### Setup environment variables (Optional)
If you want to use the test account to run e2e test cases, you should set the following environment variables.

1. TEST_USER_NAME="metadev@microsoft.com"
2. TEST_USER_PASSWORD="<$PASSWORD>"
3. Set environment variable `CI_ENABLED` to `true`.

If you want to use the default way of signin/signout (not for CI/CD), please don't set `CI_ENABLED` or set it to `false`.
You can ask `Long Hao` or `Zhiyu You` for `$PASSWORD`.

## How to Generate Parameter Files (for Repo Contributors)

### Setup repo
You can follow `For developpers to build and run your local project` at the top of this readme.

### Run
```bash
# get new/resource-add/capability-add/provision stage parameters
node .\lib\generators\ new resource-add capability-add provision
```

## Known issue
1. Currently SPFx support Node.JS V12.x
2. teamsfx start

## The rest of work

### features for user:
1. interact with user
2. webpack
3. double confirm

### features for e2e test:
