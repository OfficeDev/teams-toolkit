# TeamsFx CLI Testing Guide

## How to run e2e-test locally

### Setup repo
You can follow [Build and Run Locally](./development-guide.md#build-and-run-locally).

### Run
`npm run e2e-test`

### Setup environment variables (Optional)
If you want to use the test account to run e2e test cases, you should set the following environment variables.

1. TEST_USER_NAME="metadev@microsoft.com"
2. TEST_USER_PASSWORD="<$PASSWORD>"
3. Set environment variable `CI_ENABLED` to `true`.

If you want to use the default way of signin/signout (not for CI/CD), please don't set `CI_ENABLED` or set it to `false`.
You can ask `Long Hao` or `Zhiyu You` for `$PASSWORD`.
