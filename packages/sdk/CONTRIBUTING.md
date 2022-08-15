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

E2E tests need environment variables that are configured in GitHub Action.

## Test folder structure

- test/unit/: unit tests for both browser and NodeJS.
- test/unit/browser/: unit tests for browser only.
- test/unit/node/: unit tests for NodeJS only.
- test/e2e/browser/: end-to-end tests related to Azure resources for browser only.
- test/e2e/node/: end-to-end tests related to Azure resources for NodeJS only.

## Prepare values for required environment variables to run E2E test cases

### SDK_INTEGRATION_TEST_API_CERTPROVIDER
1. Execute following commands to generate self signed certificates for test. The command requires OpenSSL.
    ```
    # Generate certs to for test server that supports certificate auth
    openssl req -x509 -newkey rsa:4096 -nodes -days 365 -keyout server_key.pem -out server_cert.pem  -subj "/CN=localhost"

    # Generate client cert (both PEM and PFX) to test certificate auth support. Press "ENTER" when asked for "Export Password".
    openssl req -newkey rsa:4096 -keyout client_key.pem -out client_csr.pem -nodes -days 365 -subj "/CN=test client"

    openssl x509 -req -in client_csr.pem -CA server_cert.pem -CAkey server_key.pem -out client_cert.pem -set_serial 01 -days 365

    openssl pkcs12 -inkey client_key.pem -in client_cert.pem -certfile server_cert.pem -export -out client_pfx.pfx

    # Create password protected private key file
    openssl rsa -aes256 -in client_key.pem -out client_key_encrypted.pem

    # Create password protected pfx file. Record the cert password for use in step 2.
    openssl pkcs12 -inkey client_key.pem -in client_cert.pem -certfile server_cert.pem -export -out client_pfx_encrypted.pfx
    ```

2. In the directory that executes step 1's commands, execute following js script to generate values to be configured to the environment variable. You need to fill cert password you provided in step 1 before running the script.
    ```
    const fs = require('fs');

    let certs = {};
    certs.serverCert = fs.readFileSync('server_cert.pem','utf8');
    certs.serverKey = fs.readFileSync('server_key.pem','utf8');
    certs.clientCert = fs.readFileSync('client_cert.pem','utf8');
    certs.clientKey = fs.readFileSync('client_key.pem','utf8');
    certs.clientKeyEncrypted = fs.readFileSync('client_key_encrypted.pem','utf8');
    certs.clientPfx = Buffer.from(fs.readFileSync('client_pfx.pfx')).toString("base64");
    certs.clientPfxEncrypted = Buffer.from(fs.readFileSync('client_pfx_encrypted.pfx')).toString("base64");
    certs.passphrase = '' // fill your password before executing the script
    certs.clientCN = 'test client' // update the value if you specifies another CN when generating test certs

    console.log(JSON.stringify(certs));
    ```

3. Set step 2's console output to environment variable `SDK_INTEGRATION_TEST_API_CERTPROVIDER`.

# Style Guidelines

This project use eslint and prettier to check format and code style.
Use `npm run format` to fix format issues and `npm run lint` to check lint issues.

# Pull Request Process

1. Check out a new branch from "main".
2. Update code in correct place. [Supporting Browser and NodeJS](#supporting-browser-and-nodejs)
3. Make sure modified codes are covered by unit tests. [Running test cases](#running-test-cases)
4. Ensure code style check has no error. [Style Guidelines](#style-guidelines)
5. Add comment for public class/method. Please check [comment template](API_COMMENT.md) for details.
6. Merge your changes to "main" branch.
7. At least one approve from code owners is required.

## Supporting Browser and NodeJS

1. If a new class behaves differently under two environments. Create a new file named xxx.browser.ts that works only in browser and xxx.ts that works only in NodeJS.
2. Export files in `index.ts` and `index.browser.ts`, they are entries for NodeJS and browser.
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
