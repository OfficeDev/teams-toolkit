// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export const logMessageKeys = {
  startExecuteDriver: "driver.apiKey.log.startExecuteDriver",
  failedExecuteDriver: "driver.apiKey.log.failedExecuteDriver",
  skipCreateOauth: "driver.oauth.log.skipCreateOauth",
  oauthNotFound: "driver.oauth.log.oauthNotFound",
  successCreateOauth: "driver.oauth.log.successCreateOauth",
};

export const maxSecretLength = 128;
export const minSecretLength = 10;
export const maxDomainPerApiKey = 1;
