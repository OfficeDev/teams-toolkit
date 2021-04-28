# Contributing

Welcome and thank you for your interest in contributing to **fx-api**! Before contributing to this project, please review this document for policies and procedures which will ease the contribution and review process for everyone. If you have questions, please raise your issue on github.

## Development

1. Clone this repo locally. (`git clone https://github.com/OfficeDev/TeamsFx.git`)
2. Open a terminal and move into your local copy. (`cd TeamsFx`)
3. Because the monorepo is managed by Lerna, you need to bootstrap at the first time. (`npm run setup` or `npm install && npm run bootstrap`) All dependencies will be installed.
4. Build the `fx-api` package. (`cd packages/api && npm run build`)

## Before Creating a Pull Request

1. Use eslint plugin to check whether there is any error or warning that breaks the rule. (`npm run lint`)
2. Make sure modified functions are covered by tests. (`npm run test`)
3. Better to add comment for public class/method.

## Add Tests

Add tests under tests/ folder. The filename should end with .test.ts.

Because other packages depends on `fx-api`, the change may break functionalities of other packages.
Please also run `npx lerna run test:unit --since origin/main` in the root folder of TeamsFx project, it will run all unit tests.
