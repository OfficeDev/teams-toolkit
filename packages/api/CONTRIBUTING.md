# Contributing

Welcome and thank you for your interest in contributing to **@microsoft/teamsfx-api**! Before contributing to this project, please review this document for policies and procedures which will ease the contribution and review process for everyone. If you have questions, please raise your issue on github.

## Setup develop environment

Follow the official documents to install the required softwares:
1. [Git](https://git-scm.com/)
2. [Node.js and NPM](https://nodejs.org/), **x64**, Node version >= 10.x, <= 14.x
3. [Visual Studio Code](https://code.visualstudio.com/)

## Built the project

1. Clone this repo locally. (`git clone https://github.com/OfficeDev/TeamsFx.git`)
2. Open a terminal and move into your local copy. (`cd TeamsFx`)
3. Because the monorepo is managed by [Lerna](https://github.com/lerna/lerna), you need to bootstrap at the first time. This is done automaticall with the `postinstall` script.
4. Build the `@microsoft/teamsfx-api` package. (`cd packages/api && npm run build`)

**_NOTE:_** If you meet the error showing that some package cannot install, you can delete this package's `package-lock.json` (and possibly also `node_modules`) file and try `npm install` under `TeamsFx` folder again.

## Test the project

This api repo only defines some common contract for other modules. There is no end-to-end test codes or integration test codes, only unit test code is needed.
You can add your tests code under tests/ folder. The filename should end with .test.ts.

### Run Unit test

1. `cd TeamsFx/packages/api`
2. `npm run test:unit`

## Style Guidelines

After running `npm install` in the root folder of the monorepo, a [Precommit Git Hook](https://git-scm.com/book/en/v2/Customizing-Git-Git-Hooks) will be added by [Husky](https://github.com/typicode/husky), which will run

1. [ESLint](https://github.com/eslint/eslint): Please fix ESLint errors & warning before committing your code.
2. [Prettier](https://github.com/prettier/prettier): Your code will be formatted automatically.

## Pull Request Process

1. Checkout your local branch from the latest `main` branch and make your changes to your local branch.
2. Before creating a pull request, make sure:
    - Use eslint plugin to check whether there is any error or warning that breaks the rule. (`npm run lint`)
    - Make sure modified functions are covered by unit tests. (`npm run test:unit`)
    - Better to add comment for public class/method.
3. Push your local branch and create the pull request.
4. Make sure all the checks in pull request are passed.
5. At least one approve from each code owner is required.
