# Setting up your environment
## Prerequisites
* Git
* Node 10.x or higher
## Building SDK
1. Clone this repo locally. (`git clone https://github.com/OfficeDev/TeamsFx.git`)
2. Open a terminal and move into your local copy (`cd TeamsFx`)
3. Install all dependencies using lerna (`npm run setup`)
4. Build the SDK package afterwards (`npm run build` under packages/sdk folder)

## Supporting Browser and NodeJS
1. If a new class behaves differently under two environments. Create a new file named xxx.browser.ts that works only in browser and xxx.ts that works only in NodeJS.
2. Add a new mapping in package.json file. (browser field)
3. Keep the exported functions and public ones of class consistent in 2 files.
### Using isNode method
Use xxx.browser.ts if the functionality has great difference and use `isNode` if it only differs a little in 2 environments.
E.g. `TeamsBotSsoPrompt` class only works in NodeJS, so teamsBotSsoPrompt.browser.ts is created and throw exception in API.
In configurationProvider.ts, `loadConfiguration` has little difference and can detect in runtime, we could use `isNode`.

## Before Creating a Pull Request
1. Use eslint plugin to check whether there is any error or warning that breaks the rule. (`npm run lint`)
2. Make sure modified functions are covered by tests. (`npm run test`)
3. Add comment for public class/method and update API doc. (`npm run build:api-markdown`)

## Add Tests
Add tests under test/ folder. The filename should end with .spec.ts. 
* test/unit/: unit tests for both browser and NodeJS. 
* test/unit/browser/: unit tests for browser only. 
* test/unit/node/: unit tests for NodeJS only. 
* test/integration/: integration tests.
* test/e2e/: end to end tests.

## Local Debug
Use [npm-link](https://docs.npmjs.com/cli/v7/commands/npm-link) to test the SDK iteratively without having to continually rebuild.
```bash
cd packages/sdk              # go into the SDK package directory
npm link                     # create global link
cd ../test-project-using-sdk # go into some other package directory.
npm link @microsoft/teamsfx  # link-install the package
```
