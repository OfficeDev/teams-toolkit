"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkEnvironment = void 0;
const errors_1 = require("../errors");
function checkEnvironment() {
    if (!process.env.TEST_USER_NAME ||
        !process.env.TEST_USER_PASSWORD ||
        !process.env.TEST_SUBSCRIPTION_ID ||
        !process.env.TEST_TENANT_ID ||
        !process.env.CI_ENABLED) {
        throw new errors_1.EnvironmentVariableError(`TEST_USER_NAME: ${process.env.TEST_USER_NAME}\n
      TEST_USER_PASSWORD: ${process.env.TEST_USER_PASSWORD}\n
      TEST_SUBSCRIPTION_ID: ${process.env.TEST_SUBSCRIPTION_ID}\n
      TEST_TENANT_ID: ${process.env.TEST_TENANT_ID}\n
      CI_ENABLED: ${process.env.CI_ENABLED}`);
    }
}
exports.checkEnvironment = checkEnvironment;
