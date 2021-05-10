# Contributing

Welcome and thank you for your interest in contributing to **TeamsFX SDK**! Before contributing to this project, please review this document for policies and procedures which will ease the contribution and review process for everyone. If you have questions, please raise your issue on github.

# Setting up development environment

Make sure you have installed following prerequisites.
To test the SDK, you'd better install [Visual Studio Code](https://code.visualstudio.com/) and [TeamsFx VS Code Extension](https://github.com/OfficeDev/TeamsFx/tree/main/packages/vscode-extension).

## Prerequisites

- Git
- Node 10.x or higher

# Building SDK

1. Clone this repo locally. (`git clone https://github.com/OfficeDev/TeamsFx.git`)
2. Open a terminal and move into your local copy. (`cd TeamsFx`)
3. Because the monorepo is managed by Lerna, you need to bootstrap at the first time. (`npm run setup` or `npm install && npm run bootstrap`) All dependencies will be installed.
4. Build the SDK package. (`cd packages/sdk && npm run build`)

# Debugging SDK

Use [npm-pack](https://docs.npmjs.com/cli/v6/commands/npm-pack) to test the SDK.
If you use a project created by TeamsFx VS Code extension, remove the `@microsoft/teamsfx` in package.json first.

```bash
cd packages/sdk                             # go into the SDK package directory
npm pack                                    # create local packed file
cd ../test-project-using-sdk                # go into test project directory.
npm install ../microsoft-teamsfx-x.x.x.tgz  # install the local built package
```

Run `npm run build` and `npm pack` under `packages/sdk` after any updates of SDK.

# Running test cases

All tests are under `test/` folder. The filename ends with ".spec.ts".

- Use `npm run test:unit` to run all unit tests.

Integration tests and E2E tests need environment variables that are configured in GitHub Action.

## Test folder structure

- test/unit/: unit tests for both browser and NodeJS.
- test/unit/browser/: unit tests for browser only.
- test/unit/node/: unit tests for NodeJS only.
- test/integration/browser/: integration tests for browser only.
- test/integration/node/: integration tests for NodeJS only.
- test/e2e/: end to end tests.

# Style Guidelines

This project use eslint and prettier to check format and code style.
Use `npm run format` to fix format issues and `npm run lint` to check lint issues.

# Pull Request Process

1. Check out a new branch from "main".
1. Update code in correct place. [Supporting Browser and NodeJS](#supporting-browser-and-nodejs)
1. Make sure modified codes are covered by unit tests. [Running test cases](#running-test-cases)
1. Ensure code style check has no error. [Style Guidelines](#style-guidelines)
1. Add comment for public class/method. Please check [comment template](API_COMMENT.md) for details.
1. Merge your changes to "main" branch.
1. At least one approve from code owners is required.

## Supporting Browser and NodeJS

1. If a new class behaves differently under two environments. Create a new file named xxx.browser.ts that works only in browser and xxx.ts that works only in NodeJS.
2. Add a new mapping in package.json file. (browser field)
3. Keep the exported functions and public ones of class consistent in 2 files.

For example:

```typescript
// onBehalfOfUserCredential.browser.ts
export class OnBehalfOfUserCredential implements TokenCredential {
...
  async getToken(
    scopes: string | string[],
    options?: GetTokenOptions
  ): Promise<AccessToken | null> {
    // browser version implementation.
  }
}

// onBehalfOfUserCredential.ts
export class OnBehalfOfUserCredential implements TokenCredential {
...
  async getToken(
    scopes: string | string[],
    options?: GetTokenOptions
  ): Promise<AccessToken | null> {
    // nodejs version implementation.
  }
}
```

Please check [onBehalfOfUserCredential.browser.ts](src/credential/onBehalfOfUserCredential.browser.ts) and [onBehalfOfUserCredential.ts](src/credential/onBehalfOfUserCredential.ts) to see the details.

### Using isNode method

Use xxx.browser.ts if the functionality has great difference and use `isNode` if it only differs a little in 2 environments.

E.g. In [configurationProvider.ts](src/core/configurationProvider.ts), logic of method `loadConfiguration()` has only little difference between browser and nodejs environment. We can use the isNode to detect the environment in runtime.
