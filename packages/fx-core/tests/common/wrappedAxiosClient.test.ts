// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import axios, { AxiosInstance } from "axios";
import * as chai from "chai";
import "mocha";
import * as sinon from "sinon";
import { v4 as uuid } from "uuid";
import { getAppStudioEndpoint } from "../../src/common/constants";
import { setTools } from "../../src/common/globalVars";
import { WrappedAxiosClient } from "../../src/common/wrappedAxiosClient";
import { APP_STUDIO_API_NAMES } from "../../src/component/driver/teamsApp/constants";
import { MockTools } from "../core/utils";

describe("Wrapped Axios Client Test", () => {
  const mockTools = new MockTools();
  beforeEach(() => {
    setTools(mockTools);
  });

  afterEach(() => {
    sinon.restore();
  });

  it("create", async () => {
    const testAxiosInstance = {
      interceptors: {
        request: {
          use: sinon.stub(),
        },
        response: {
          use: sinon.stub(),
        },
      },
    } as any as AxiosInstance;
    sinon.stub(axios, "create").returns(testAxiosInstance);
    WrappedAxiosClient.create();
  });

  it("No telemetry reporter", async () => {
    setTools({} as any);

    const mockedRequest = {
      method: "POST",
      baseURL: getAppStudioEndpoint(),
      url: "/amer/api/appdefinitions/v2/import",
      params: {
        overwriteIfAppAlreadyExists: true,
      },
      status: 200,
      data: {},
    } as any;
    WrappedAxiosClient.onRequest(mockedRequest);

    const mockedResponse = {
      request: {
        method: "GET",
        host: getAppStudioEndpoint(),
        path: "/api/appdefinitions/manifest",
      },
      config: {
        params: {},
      },
      status: 200,
      data: {},
    } as any;
    WrappedAxiosClient.onResponse(mockedResponse);

    const mockedError = {
      request: {
        method: "GET",
        host: getAppStudioEndpoint(),
        path: "/api/appdefinitions/fakeId",
      },
      config: {
        data: "Invalid JSON",
      },
      response: {
        status: 404,
        headers: {
          "x-ms-correlation-id": uuid(),
        },
      },
    } as any;
    WrappedAxiosClient.onRejected(mockedError);
  });

  it("TOOLS not initialized", async () => {
    setTools(undefined as any);

    const mockedRequest = {
      method: "POST",
      baseURL: getAppStudioEndpoint(),
      url: "/amer/api/appdefinitions/v2/import",
      params: {
        overwriteIfAppAlreadyExists: true,
      },
      status: 200,
      data: {},
    } as any;
    WrappedAxiosClient.onRequest(mockedRequest);

    const mockedResponse = {
      request: {
        method: "GET",
        host: getAppStudioEndpoint(),
        path: "/api/appdefinitions/manifest",
      },
      config: {
        params: {},
      },
      status: 200,
      data: {},
    } as any;
    WrappedAxiosClient.onResponse(mockedResponse);

    const mockedError = {
      request: {
        method: "GET",
        host: getAppStudioEndpoint(),
        path: "/api/appdefinitions/fakeId",
      },
      config: {},
      response: {
        status: 404,
        headers: {
          "x-ms-correlation-id": uuid(),
        },
      },
    } as any;
    WrappedAxiosClient.onRejected(mockedError);
  });

  it("TDP API start telemetry", async () => {
    const mockedRequest = {
      method: "POST",
      baseURL: getAppStudioEndpoint(),
      url: "/amer/api/appdefinitions/v2/import",
      params: {
        overwriteIfAppAlreadyExists: true,
      },
      status: 200,
      data: {},
    } as any;
    const telemetryChecker = sinon.spy(mockTools.telemetryReporter, "sendTelemetryEvent");

    WrappedAxiosClient.onRequest(mockedRequest);
    chai.expect(telemetryChecker.calledOnce).to.be.true;
  });

  it("Dependency API start telemetry", async () => {
    const mockedRequest = {
      method: "POST",
      baseURL: "https://example.com",
      url: "",
      params: {},
      status: 200,
      data: {},
    } as any;
    const telemetryChecker = sinon.spy(mockTools.telemetryReporter, "sendTelemetryEvent");

    WrappedAxiosClient.onRequest(mockedRequest);
    chai.expect(telemetryChecker.calledOnce).to.be.true;
  });

  it("TDP API success response", async () => {
    const mockedResponse = {
      request: {
        method: "GET",
        host: getAppStudioEndpoint(),
        path: "/api/appdefinitions/manifest",
      },
      config: {
        params: {},
      },
      status: 200,
      data: {},
    } as any;
    const telemetryChecker = sinon.spy(mockTools.telemetryReporter, "sendTelemetryEvent");

    WrappedAxiosClient.onResponse(mockedResponse);
    chai.expect(telemetryChecker.calledOnce).to.be.true;
  });

  it("Dependency API success response", async () => {
    const mockedResponse = {
      request: {
        method: "GET",
        host: "https://example.com",
        path: "",
      },
      config: {
        params: {},
      },
      status: 200,
      data: {},
    } as any;
    const telemetryChecker = sinon.spy(mockTools.telemetryReporter, "sendTelemetryEvent");

    WrappedAxiosClient.onResponse(mockedResponse);
    chai.expect(telemetryChecker.calledOnce).to.be.true;
  });

  it("TDP API error response", async () => {
    const mockedError = {
      request: {
        method: "GET",
        host: getAppStudioEndpoint(),
        path: "/api/appdefinitions/fakeId",
      },
      config: {},
      response: {
        status: 404,
        headers: {
          "x-ms-correlation-id": uuid(),
        },
      },
    } as any;
    const telemetryChecker = sinon.spy(mockTools.telemetryReporter, "sendTelemetryErrorEvent");

    WrappedAxiosClient.onRejected(mockedError);
    chai.expect(telemetryChecker.calledOnce).to.be.true;
  });

  it("Dependency API error response", async () => {
    const mockedError = {
      request: {
        method: "GET",
        host: "https://example.com",
        path: "",
      },
      config: {
        data: '{"botId":"fakeId"}',
      },
      response: {
        status: 400,
      },
    } as any;
    const telemetryChecker = sinon.spy(mockTools.telemetryReporter, "sendTelemetryErrorEvent");

    WrappedAxiosClient.onRejected(mockedError);
    chai.expect(telemetryChecker.calledOnce).to.be.true;
  });

  it("MOS API error response", async () => {
    const mockedError = {
      request: {
        method: "GET",
        host: "https://titles.prod.mos.microsoft.com",
        path: "/users/packages",
      },
      config: {},
      response: {
        status: 400,
        data: {
          code: "BadRequest",
          message: "Invalid request",
        },
      },
    } as any;
    const telemetryChecker = sinon.spy(mockTools.telemetryReporter, "sendTelemetryErrorEvent");
    WrappedAxiosClient.onRejected(mockedError);
    chai.expect(telemetryChecker.calledOnce).to.be.true;
  });

  it("Create bot API start telemetry", async () => {
    const mockedRequest = {
      method: "POST",
      baseURL: getAppStudioEndpoint(),
      url: "/api/botframework",
      params: {},
      status: 200,
      data: {
        botId: "fakeId",
      },
    } as any;
    const telemetryChecker = sinon.spy(mockTools.telemetryReporter, "sendTelemetryEvent");

    WrappedAxiosClient.onRequest(mockedRequest);
    chai.expect(telemetryChecker.calledOnce).to.be.true;
  });

  it("Update bot API start telemetry", async () => {
    const mockedRequest = {
      method: "POST",
      baseURL: getAppStudioEndpoint(),
      url: `/api/botframework/${uuid()}`,
      params: {},
      status: 200,
      data: {},
    } as any;
    const telemetryChecker = sinon.spy(mockTools.telemetryReporter, "sendTelemetryEvent");

    WrappedAxiosClient.onRequest(mockedRequest);
    chai.expect(telemetryChecker.calledOnce).to.be.true;
  });

  it("Convert API name", async () => {
    const fakeId = uuid();

    let apiName = WrappedAxiosClient.convertUrlToApiName(
      getAppStudioEndpoint() + "/api/appdefinitions/partnerCenterAppPackageValidation",
      "POST"
    );
    chai.assert.equal(apiName, APP_STUDIO_API_NAMES.VALIDATE_APP_PACKAGE);

    apiName = WrappedAxiosClient.convertUrlToApiName(
      getAppStudioEndpoint() + `/api/appdefinitions/${fakeId}/manifest`,
      "GET"
    );
    chai.assert.equal(apiName, APP_STUDIO_API_NAMES.GET_APP_PACKAGE);

    apiName = WrappedAxiosClient.convertUrlToApiName(
      getAppStudioEndpoint() + `/api/appdefinitions/${fakeId}/owner`,
      "POST"
    );
    chai.assert.equal(apiName, APP_STUDIO_API_NAMES.UPDATE_OWNER);

    apiName = WrappedAxiosClient.convertUrlToApiName(
      getAppStudioEndpoint() + `/api/appdefinitions/${fakeId}`,
      "GET"
    );
    chai.assert.equal(apiName, APP_STUDIO_API_NAMES.GET_APP);

    apiName = WrappedAxiosClient.convertUrlToApiName(
      getAppStudioEndpoint() + `/api/appdefinitions/${fakeId}`,
      "DELETE"
    );
    chai.assert.equal(apiName, APP_STUDIO_API_NAMES.DELETE_APP);

    apiName = WrappedAxiosClient.convertUrlToApiName(
      getAppStudioEndpoint() + `/api/publishing/${fakeId}`,
      "GET"
    );
    chai.assert.equal(apiName, APP_STUDIO_API_NAMES.GET_PUBLISHED_APP);

    apiName = WrappedAxiosClient.convertUrlToApiName(
      getAppStudioEndpoint() + `/api/publishing/${fakeId}`,
      "POST"
    );
    chai.assert.equal(apiName, APP_STUDIO_API_NAMES.PUBLISH_APP);

    apiName = WrappedAxiosClient.convertUrlToApiName(
      getAppStudioEndpoint() + `/api/publishing/${fakeId}/appdefinitions`,
      "POST"
    );
    chai.assert.equal(apiName, APP_STUDIO_API_NAMES.UPDATE_PUBLISHED_APP);

    apiName = WrappedAxiosClient.convertUrlToApiName(
      getAppStudioEndpoint() + `/api/v1.0/apiSecretRegistrations/${fakeId}`,
      "GET"
    );
    chai.assert.equal(apiName, APP_STUDIO_API_NAMES.GET_API_KEY);

    apiName = WrappedAxiosClient.convertUrlToApiName(
      getAppStudioEndpoint() + `/api/v1.0/apiSecretRegistrations/${fakeId}`,
      "POST"
    );
    chai.assert.equal(apiName, APP_STUDIO_API_NAMES.CREATE_API_KEY);

    apiName = WrappedAxiosClient.convertUrlToApiName(
      getAppStudioEndpoint() + `/api/botframework/${fakeId}`,
      "GET"
    );
    chai.assert.equal(apiName, APP_STUDIO_API_NAMES.GET_BOT);

    apiName = WrappedAxiosClient.convertUrlToApiName(
      getAppStudioEndpoint() + `/api/botframework/${fakeId}`,
      "POST"
    );
    chai.assert.equal(apiName, APP_STUDIO_API_NAMES.UPDATE_BOT);

    apiName = WrappedAxiosClient.convertUrlToApiName(
      getAppStudioEndpoint() + `/api/botframework/${fakeId}`,
      "DELETE"
    );
    chai.assert.equal(apiName, APP_STUDIO_API_NAMES.DELETE_BOT);

    apiName = WrappedAxiosClient.convertUrlToApiName(
      getAppStudioEndpoint() + `/api/botframework`,
      "GET"
    );
    chai.assert.equal(apiName, APP_STUDIO_API_NAMES.LIST_BOT);

    apiName = WrappedAxiosClient.convertUrlToApiName(
      getAppStudioEndpoint() + `/api/botframework`,
      "POST"
    );
    chai.assert.equal(apiName, APP_STUDIO_API_NAMES.CREATE_BOT);

    apiName = WrappedAxiosClient.convertUrlToApiName(
      "https://authsvc.teams.microsoft.com/v1.0/users/region",
      "POST"
    );
    chai.assert.equal(apiName, "get-region");

    apiName = WrappedAxiosClient.convertUrlToApiName("https://example.com", "GET");
    chai.assert.equal(apiName, "https:--example.com");
  });
});
