# Contributing to TeamsFx CLI 

Welcome, and thank you for your interest in contributing to TeamsFx CLI!

Please review this document for setting up your development environment, debugging and run TeamsFx CLI. If you have any questions, please raise your issue on github.


## Setup Development Environment

1. Install Node v12
2. Install NPM v6 or later

## Build the whole monorepo
1. `git clone https://github.com/OfficeDev/TeamsFx.git`
2. `cd TeamsFx`
3. `npm run setup`

This will run "lerna bootstrap" to link packages in monorepo locally. 

## Build CLI package alone
1. `cd packages/cli/`
2. `npm run build`

This will build CLI package alone and install the dependent packages from public registry.

**_NOTE:_** If you meet the error showing that some package cannot install, you can delete this package's `package-lock.json` file and try `npm run bootstrap` under `TeamsFx` folder again.

## Run your local project
1. `cd TeamsFx`
2. `npm run setup`
3. `npm link`

## Debug inside VSCode
1. `cd TeamsFx/packages/cli`
2. `code .`
3. In the debug Treeview choose debugging profile
4. Hit 'F5' or click start debugging button

## Install the published package
1. Run: `npm install -g teamsfx-cli` (Pls check the version is the latest version)
2. Now the package is installed in your global npm folder. You can type 'teamsfx -h' to see how to use the cli tool.

## Run Unit test

1. `cd TeamsFx/packages/cli`
2. `npm run test:unit`

## Run E2E test

1. `cd TeamsFx/packages/cli`
2. `npm run test:e2e`

## Coding Style

The project setup ESLINT and prettier for coding style and formating, please follow the commands below

### Lint project
`npm run lint`

### Fix lint error
`npm run lint:fix`

### Check code format before commit
`npm run check-format`

### Format the code
`npm run format`

# Thank You!

Your contributions to open source, large or small, make great projects like this possible. Thank you for taking the time to contribute.
