// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export const logMessageKeys = {
  startExecuteDriver: "driver.apiKey.log.startExecuteDriver",
  skipCreateApiKey: "driver.apiKey.log.skipCreateApiKey",
  apiKeyNotFound: "driver.apiKey.log.apiKeyNotFound",
  successCreateApiKey: "driver.apiKey.log.successCreateApiKey",
  failedExecuteDriver: "driver.apiKey.log.failedExecuteDriver",
};

export const maxDomainPerApiKey = 1;
export const maxSecretLength = 128;
export const minSecretLength = 10;
