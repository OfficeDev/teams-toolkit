import {EnvironmentVariableError} from '../errors'

export function checkEnvironment(): void {
  if (
    !process.env.TEST_USER_NAME ||
    !process.env.TEST_USER_PASSWORD ||
    !process.env.TEST_SUBSCRIPTION_ID ||
    !process.env.TEST_TENANT_ID ||
    !process.env.CI_ENABLED
  ) {
    throw new EnvironmentVariableError(
      `TEST_USER_NAME: ${process.env.TEST_USER_NAME}\n
      TEST_USER_PASSWORD: ${process.env.TEST_USER_PASSWORD}\n
      TEST_SUBSCRIPTION_ID: ${process.env.TEST_SUBSCRIPTION_ID}\n
      TEST_TENANT_ID: ${process.env.TEST_TENANT_ID}\n
      CI_ENABLED: ${process.env.CI_ENABLED}`
    )
  }
}
