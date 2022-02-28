// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AccessToken, ManagedIdentityCredential } from "@azure/identity";
import { assert, use as chaiUse, expect } from "chai";
import * as chaiPromises from "chai-as-promised";
import * as sinon from "sinon";
import axios, { AxiosRequestConfig, AxiosRequestHeaders } from "axios";
import mockedEnv from "mocked-env";
import {
  getTediousConnectionConfig,
  ErrorWithCode,
  setLogLevel,
  LogLevel,
  TeamsFx,
  OnBehalfOfUserCredential,
  IdentityType,
} from "../../../../src";
import { ErrorMessage, ErrorCode } from "../../../../src/core/errors";
import { callApi } from "../../../../src/core/callApi";

const jwtBuilder = require("jwt-builder");
chaiUse(chaiPromises);
let restore: () => void;

describe("callApi Tests - Node", () => {
  // fake configuration for API.
  const fakeApiEndpoint = "https://fake-api-endpoint";
  const fakeApiName = "fake_api_name";
  const fakeExchangeToken = "fake_exchange_token";
  const fakeExpiresOnTimestamp = 12345678;

  const fakeClientId = "fake_client_id";
  const fakeClientSecret = "fake_client_secret";
  const fakeTenantId = "fake_tenant";
  const fakeAuthorityHost = "fake_authority_host";
  const fakeApplicationIdUri = "fake_application_id_uri";
  const now = Math.floor(Date.now() / 1000);
  const fakeSsoToken = jwtBuilder({
    algorithm: "HS256",
    secret: "super-secret",
    aud: "test_audience",
    iss: "https://login.microsoftonline.com/test_aad_id/v2.0",
    iat: now,
    nbf: now,
    exp: 4000,
    aio: "test_aio",
    name: "Teams Framework Unit Test",
    oid: "11111111-2222-3333-4444-555555555555",
    preferred_username: "test@microsoft.com",
    rh: "test_rh",
    scp: "access_as_user",
    sub: "test_sub",
    tid: "test_tenant_id",
    uti: "test_uti",
    ver: "2.0",
  });
  const fakeReturnData = "fake_return_data";

  const sandbox = sinon.createSandbox();

  beforeEach(function () {
    restore = mockedEnv({
      API_ENDPOINT: fakeApiEndpoint,
      API_NAME: fakeApiName,
      M365_CLIENT_ID: fakeClientId,
      M365_CLIENT_SECRET: fakeClientSecret,
      M365_TENANT_ID: fakeTenantId,
      M365_AUTHORITY_HOST: fakeAuthorityHost,
      M365_APPLICATION_ID_URI: fakeApplicationIdUri,
    });
  });

  afterEach(function () {
    sandbox.restore();
    restore();
  });

  it("callApi() should success with apiEndpoint and apiName configured", async function () {
    // Mock onBehalfOfUserCredential implementation
    const onBehalfOfUserCredentialStub_GetToken = sandbox.stub(
      OnBehalfOfUserCredential.prototype,
      "getToken"
    );
    onBehalfOfUserCredentialStub_GetToken.callsFake(async () => {
      return new Promise<AccessToken>((resolve) => {
        resolve({
          token: fakeExchangeToken,
          expiresOnTimestamp: fakeExpiresOnTimestamp,
        });
      });
    });

    const resolved = new Promise((r) => r({ data: fakeReturnData }));
    let axiosUrl = "";
    let axiosHeaders: AxiosRequestHeaders | undefined;
    const getStub = sandbox
      .stub(axios, "get")
      .callsFake((url: string, config?: AxiosRequestConfig<unknown> | undefined) => {
        axiosUrl = url;
        axiosHeaders = config?.headers;
        return resolved;
      });

    const teamsfx = new TeamsFx().setSsoToken(fakeSsoToken);
    const data = await callApi(teamsfx);

    assert.isTrue(getStub.called);
    assert.strictEqual(data, fakeReturnData);
    assert.strictEqual(axiosUrl, fakeApiEndpoint + "/api/" + fakeApiName);
    assert.isNotNull(axiosHeaders);
    assert.strictEqual(axiosHeaders?.authorization, "Bearer " + fakeExchangeToken);
  });

  it("callApi() should success with custom parameters", async function () {
    // Mock onBehalfOfUserCredential implementation
    const onBehalfOfUserCredentialStub_GetToken = sandbox.stub(
      OnBehalfOfUserCredential.prototype,
      "getToken"
    );
    onBehalfOfUserCredentialStub_GetToken.callsFake(async () => {
      return new Promise<AccessToken>((resolve) => {
        resolve({
          token: fakeExchangeToken,
          expiresOnTimestamp: fakeExpiresOnTimestamp,
        });
      });
    });

    const resolved = new Promise((r) => r({ data: fakeReturnData }));
    let axiosUrl = "";
    let axiosData: unknown;
    let axiosHeaders: AxiosRequestHeaders | undefined;
    const getStub = sandbox
      .stub(axios, "post")
      .callsFake((url: string, data: unknown, config?: AxiosRequestConfig<unknown> | undefined) => {
        axiosUrl = url;
        axiosData = data;
        axiosHeaders = config?.headers;
        return resolved;
      });

    const param = { key: "value" };
    const teamsfx = new TeamsFx().setSsoToken(fakeSsoToken);
    const data = await callApi(teamsfx, "anotherName", param, "post");

    assert.isTrue(getStub.called);
    assert.strictEqual(data, fakeReturnData);
    assert.strictEqual(axiosUrl, fakeApiEndpoint + "/api/" + "anotherName");
    assert.strictEqual(axiosData, param);
    assert.isNotNull(axiosHeaders);
    assert.strictEqual(axiosHeaders?.authorization, "Bearer " + fakeExchangeToken);
  });

  it("callApi() should throw error when apiEndpoint and apiName not configured properly", async function () {
    const teamsfx = new TeamsFx().setSsoToken(fakeSsoToken);

    const errorResult = await expect(callApi(teamsfx, "")).to.eventually.be.rejectedWith(
      ErrorWithCode
    );
    assert.strictEqual(errorResult.code, ErrorCode.InvalidConfiguration);
    assert.strictEqual(errorResult.message, ErrorMessage.InvalidApiConfiguration);
  });

  it("callApi() should throw error when cannot get access token", async function () {
    // Mock onBehalfOfUserCredential implementation
    const onBehalfOfUserCredentialStub_GetToken = sandbox.stub(
      OnBehalfOfUserCredential.prototype,
      "getToken"
    );
    onBehalfOfUserCredentialStub_GetToken.callsFake(async () => {
      return new Promise<AccessToken | null>((resolve) => {
        resolve(null);
      });
    });

    const teamsfx = new TeamsFx().setSsoToken(fakeSsoToken);

    const errorResult = await expect(callApi(teamsfx)).to.eventually.be.rejectedWith(ErrorWithCode);
    assert.strictEqual(errorResult.code, ErrorCode.InternalError);
    assert.strictEqual(
      errorResult.message,
      `Failed to acquire access token on behalf of user: Access token is null`
    );
  });

  it("callApi() should throw error when backend api is offline", async function () {
    sandbox.stub(axios, "get").throws({ response: { status: 404 } });

    const teamsfx = new TeamsFx().setSsoToken(fakeSsoToken);

    const errorResult = await expect(callApi(teamsfx)).to.eventually.be.rejectedWith(ErrorWithCode);
    assert.strictEqual(errorResult.code, ErrorCode.FailedOperation);
    assert.strictEqual(
      errorResult.message,
      `There may be a problem with the deployment of Azure Function App, please deploy Azure Function (Run command palette "Teams: Deploy to the cloud") first before running this App`
    );
  });

  it("callApi() should throw error when backend api has network error", async function () {
    sandbox.stub(axios, "get").throws({
      message: "Network Error",
    });

    const teamsfx = new TeamsFx().setSsoToken(fakeSsoToken);

    const errorResult = await expect(callApi(teamsfx)).to.eventually.be.rejectedWith(ErrorWithCode);
    assert.strictEqual(errorResult.code, ErrorCode.FailedOperation);
    assert.strictEqual(
      errorResult.message,
      `Cannot call Azure Function due to network error, please check your network connection status and make sure to provision and deploy Azure Function (Run command palette "Teams: Provision in the cloud" and "Teams: Deploy to the cloud") first before running this App`
    );
  });
});
