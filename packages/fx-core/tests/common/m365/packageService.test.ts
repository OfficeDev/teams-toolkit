// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import sinon from "sinon";
import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import fs from "fs-extra";
import { PackageService } from "../../../src/common/m365/packageService";
import { MockLogProvider } from "../../core/utils";
import { UnhandledError } from "../../../src/error/common";

chai.use(chaiAsPromised);

describe("Package Service", () => {
  const sandbox = sinon.createSandbox();
  const logger = new MockLogProvider();
  let axiosDeleteResponses: Record<string, unknown> = {};
  let axiosGetResponses: Record<string, unknown> = {};
  let axiosPostResponses: Record<string, unknown> = {};
  const testAxiosInstance = {
    defaults: {
      headers: {
        common: {},
      },
    },
    delete: function <T = any, R = AxiosResponse<T>>(
      url: string,
      config?: AxiosRequestConfig
    ): Promise<R> {
      const response = axiosDeleteResponses[url] as any;
      return response.message !== undefined ? Promise.reject(response) : Promise.resolve(response);
    },
    get: function <T = any, R = AxiosResponse<T>>(url: string): Promise<R> {
      const response = axiosGetResponses[url] as any;
      return response.message !== undefined ? Promise.reject(response) : Promise.resolve(response);
    },
    post: function <T = any, R = AxiosResponse<T>>(
      url: string,
      data?: any,
      config?: AxiosRequestConfig
    ): Promise<R> {
      const response = axiosPostResponses[url] as any;
      return response.message !== undefined ? Promise.reject(response) : Promise.resolve(response);
    },
  } as AxiosInstance;

  afterEach(() => {
    sandbox.restore();
  });

  beforeEach(() => {
    axiosDeleteResponses = {};
    axiosGetResponses = {};
    axiosPostResponses = {};
    sandbox.stub(fs, "readFile").callsFake((file) => {
      return Promise.resolve(Buffer.from("test"));
    });
    sandbox.stub(axios, "create").returns(testAxiosInstance);
  });

  it("sideLoading happy path", async () => {
    axiosGetResponses["/config/v1/environment"] = {
      data: {
        titlesServiceUrl: "test-url",
      },
    };
    axiosPostResponses["/dev/v1/users/packages"] = {
      data: {
        operationId: "test-operation-id",
        titlePreview: {
          titleId: "test-title-id-preview",
        },
      },
    };
    axiosPostResponses["/dev/v1/users/packages/acquisitions"] = {
      data: {
        statusId: "test-status-id",
      },
    };
    axiosGetResponses["/dev/v1/users/packages/status/test-status-id"] = {
      status: 200,
      data: {
        titleId: "test-title-id",
        appId: "test-app-id",
      },
    };

    let packageService = new PackageService("test-endpoint");
    let actualError: Error | undefined;
    try {
      const result = await packageService.sideLoading("test-token", "test-path");
      chai.assert.equal(result[0], "test-title-id");
      chai.assert.equal(result[1], "test-app-id");
    } catch (error: any) {
      actualError = error;
    }

    chai.assert.isUndefined(actualError);

    packageService = new PackageService("test-endpoint", logger);
    try {
      const result = await packageService.sideLoading("test-token", "test-path");
      chai.assert.equal(result[0], "test-title-id");
      chai.assert.equal(result[1], "test-app-id");
    } catch (error: any) {
      actualError = error;
    }

    chai.assert.isUndefined(actualError);
  });

  it("sideLoading throws expected error", async () => {
    axiosGetResponses["/config/v1/environment"] = {
      data: {
        titlesServiceUrl: "test-url",
      },
    };
    axiosPostResponses["/dev/v1/users/packages"] = new Error("test-post");

    let packageService = new PackageService("test-endpoint");
    let actualError: Error | undefined;
    try {
      await packageService.sideLoading("test-token", "test-path");
    } catch (error: any) {
      actualError = error;
    }

    chai.assert.isDefined(actualError);
    chai.assert.isTrue(actualError?.message.includes("test-post"));

    packageService = new PackageService("test-endpoint", logger);
    try {
      await packageService.sideLoading("test-token", "test-path");
    } catch (error: any) {
      actualError = error;
    }

    chai.assert.isDefined(actualError);
    chai.assert.isTrue(actualError?.message.includes("test-post"));
  });

  it("sideLoading throws expected reponse error", async () => {
    axiosGetResponses["/config/v1/environment"] = {
      data: {
        titlesServiceUrl: "test-url",
      },
    };
    const expectedError = new Error("test-post") as any;
    expectedError.response = {
      data: {
        foo: "bar",
      },
      headers: {
        traceresponse: "tracing-id",
      },
    };
    axiosPostResponses["/dev/v1/users/packages"] = expectedError;

    let packageService = new PackageService("test-endpoint");
    let actualError: any;
    try {
      await packageService.sideLoading("test-token", "test-path");
    } catch (error: any) {
      actualError = error;
    }

    chai.assert.isDefined(actualError);
    chai.assert.isTrue(actualError.message.includes("test-post"));

    packageService = new PackageService("test-endpoint", logger);
    try {
      await packageService.sideLoading("test-token", "test-path");
    } catch (error: any) {
      actualError = error;
    }

    chai.assert.isDefined(actualError);
    chai.assert.isTrue(actualError.message.includes("test-post"));
  });

  it("retrieveTitleId happy path", async () => {
    axiosGetResponses["/config/v1/environment"] = {
      data: {
        titlesServiceUrl: "test-url",
      },
    };
    axiosPostResponses["/catalog/v1/users/titles/launchInfo"] = {
      data: {
        acquisition: {
          titleId: "test-title-id",
        },
      },
    };

    const packageService = new PackageService("test-endpoint");
    const titleId = await packageService.retrieveTitleId("test-token", "test-manifest-id");

    chai.assert.equal(titleId, "test-title-id");
  });

  it("retrieveTitleId throws expected error", async () => {
    axiosGetResponses["/config/v1/environment"] = {
      data: {
        titlesServiceUrl: "test-url",
      },
    };
    axiosPostResponses["/catalog/v1/users/titles/launchInfo"] = new Error("test-post");

    const packageService = new PackageService("test-endpoint");
    let actualError: Error | undefined;
    try {
      await packageService.retrieveTitleId("test-token", "test-manifest-id");
    } catch (error: any) {
      actualError = error;
    }

    chai.assert.isDefined(actualError);
    chai.assert.isTrue(actualError?.message.includes("test-post"));
  });

  it("retrieveTitleId throws expected response error", async () => {
    axiosGetResponses["/config/v1/environment"] = {
      data: {
        titlesServiceUrl: "test-url",
      },
    };
    const expectedError = new Error("test-post") as any;
    expectedError.response = {
      data: {},
    };
    axiosPostResponses["/catalog/v1/users/titles/launchInfo"] = expectedError;

    const packageService = new PackageService("test-endpoint");
    let actualError: any;
    try {
      await packageService.retrieveTitleId("test-token", "test-manifest-id");
    } catch (error: any) {
      actualError = error;
    }

    chai.assert.isDefined(actualError);
    chai.assert.isTrue(actualError.message.includes("test-post"));
  });

  it("retrieveAppId happy path", async () => {
    axiosGetResponses["/config/v1/environment"] = {
      data: {
        titlesServiceUrl: "test-url",
      },
    };
    axiosPostResponses["/catalog/v1/users/titles/launchInfo"] = {
      data: {
        acquisition: {
          appId: "test-app-id",
        },
      },
    };

    {
      const packageService = new PackageService("test-endpoint");
      const appId = await packageService.retrieveAppId("test-token", "test-manifest-id");

      chai.assert.equal(appId, "test-app-id");
    }

    {
      const packageService = new PackageService("test-endpoint", new MockLogProvider());
      const appId = await packageService.retrieveAppId("test-token", "test-manifest-id");

      chai.assert.equal(appId, "test-app-id");
    }
  });

  it("retrieveAppId throws expected error", async () => {
    axiosGetResponses["/config/v1/environment"] = {
      data: {
        titlesServiceUrl: "test-url",
      },
    };
    axiosPostResponses["/catalog/v1/users/titles/launchInfo"] = new Error("test-post");

    {
      const packageService = new PackageService("test-endpoint");
      let actualError: Error | undefined;
      try {
        await packageService.retrieveAppId("test-token", "test-manifest-id");
      } catch (error: any) {
        actualError = error;
      }

      chai.assert.isDefined(actualError);
      chai.assert.isTrue(actualError?.message.includes("test-post"));
    }

    {
      const packageService = new PackageService("test-endpoint", new MockLogProvider());
      let actualError: Error | undefined;
      try {
        await packageService.retrieveAppId("test-token", "test-manifest-id");
      } catch (error: any) {
        actualError = error;
      }

      chai.assert.isDefined(actualError);
      chai.assert.isTrue(actualError?.message.includes("test-post"));
    }
  });

  it("retrieveAppId throws expected response error", async () => {
    axiosGetResponses["/config/v1/environment"] = {
      data: {
        titlesServiceUrl: "test-url",
      },
    };
    const expectedError = new Error("test-post") as any;
    expectedError.response = {
      data: {},
    };
    axiosPostResponses["/catalog/v1/users/titles/launchInfo"] = expectedError;

    {
      const packageService = new PackageService("test-endpoint");
      let actualError: any;
      try {
        await packageService.retrieveAppId("test-token", "test-manifest-id");
      } catch (error: any) {
        actualError = error;
      }

      chai.assert.isDefined(actualError);
      chai.assert.isTrue(actualError.message.includes("test-post"));
    }

    {
      const packageService = new PackageService("test-endpoint", new MockLogProvider());
      let actualError: any;
      try {
        await packageService.retrieveAppId("test-token", "test-manifest-id");
      } catch (error: any) {
        actualError = error;
      }

      chai.assert.isDefined(actualError);
      chai.assert.isTrue(actualError instanceof UnhandledError);
    }
  });

  it("unacquire happy path", async () => {
    axiosGetResponses["/config/v1/environment"] = {
      data: {
        titlesServiceUrl: "test-url",
      },
    };
    axiosDeleteResponses["/catalog/v1/users/acquisitions/test-title-id"] = {};

    let packageService = new PackageService("test-endpoint");
    let actualError: Error | undefined;
    try {
      await packageService.unacquire("test-token", "test-title-id");
    } catch (error: any) {
      actualError = error;
    }

    chai.assert.isUndefined(actualError);

    packageService = new PackageService("test-endpoint", logger);
    actualError = undefined;
    try {
      await packageService.unacquire("test-token", "test-title-id");
    } catch (error: any) {
      actualError = error;
    }

    chai.assert.isUndefined(actualError);
  });

  it("unacquire throws expected error", async () => {
    axiosGetResponses["/config/v1/environment"] = {
      data: {
        titlesServiceUrl: "test-url",
      },
    };
    axiosDeleteResponses["/catalog/v1/users/acquisitions/test-title-id"] = new Error("test-delete");

    const packageService = new PackageService("test-endpoint");
    let actualError: Error | undefined;
    try {
      await packageService.unacquire("test-token", "test-title-id");
    } catch (error: any) {
      actualError = error;
    }

    chai.assert.isDefined(actualError);
    chai.assert.isTrue(actualError?.message.includes("test-delete"));
  });

  it("unacquire throws expected response error", async () => {
    axiosGetResponses["/config/v1/environment"] = {
      data: {
        titlesServiceUrl: "test-url",
      },
    };
    const expectedError = new Error("test-post") as any;
    expectedError.response = {
      data: {},
    };
    axiosDeleteResponses["/catalog/v1/users/acquisitions/test-title-id"] = expectedError;

    const packageService = new PackageService("test-endpoint");
    let actualError: any;
    try {
      await packageService.unacquire("test-token", "test-title-id");
    } catch (error: any) {
      actualError = error;
    }

    chai.assert.isDefined(actualError);
    chai.assert.isTrue(actualError instanceof UnhandledError);
  });

  it("getLaunchInfoByTitleId happy path", async () => {
    axiosGetResponses["/config/v1/environment"] = {
      data: {
        titlesServiceUrl: "test-url",
      },
    };
    axiosGetResponses["/catalog/v1/users/titles/test-title-id/launchInfo"] = {
      data: {
        foo: "bar",
      },
    };

    const packageService = new PackageService("test-endpoint");
    const launchInfo = await packageService.getLaunchInfoByTitleId("test-token", "test-title-id");

    chai.assert.deepEqual(launchInfo, { foo: "bar" });
  });

  it("getLaunchInfoByTitleId throws expected error", async () => {
    axiosGetResponses["/config/v1/environment"] = {
      data: {
        titlesServiceUrl: "test-url",
      },
    };
    axiosGetResponses["/catalog/v1/users/titles/test-title-id/launchInfo"] = new Error("test-get");

    const packageService = new PackageService("test-endpoint");
    let actualError: Error | undefined;
    try {
      await packageService.getLaunchInfoByTitleId("test-token", "test-title-id");
    } catch (error: any) {
      actualError = error;
    }

    chai.assert.isDefined(actualError);
    chai.assert.isTrue(actualError?.message.includes("test-get"));
  });

  it("getLaunchInfoByTitleId throws expected response error", async () => {
    axiosGetResponses["/config/v1/environment"] = {
      data: {
        titlesServiceUrl: "test-url",
      },
    };
    const expectedError = new Error("test-post") as any;
    expectedError.response = {
      data: {},
    };
    axiosGetResponses["/catalog/v1/users/titles/test-title-id/launchInfo"] = expectedError;

    const packageService = new PackageService("test-endpoint");
    let actualError: any;
    try {
      await packageService.getLaunchInfoByTitleId("test-token", "test-title-id");
    } catch (error: any) {
      actualError = error;
    }

    chai.assert.isDefined(actualError);
    chai.assert.isTrue(actualError instanceof UnhandledError);
  });

  it("getTitleServiceUrl throws expected error", async () => {
    axiosGetResponses["/config/v1/environment"] = new Error("test-service-url-error");

    const packageService = new PackageService("test-endpoint");
    let actualError: Error | undefined;
    try {
      await packageService.getLaunchInfoByTitleId("test-token", "test-title-id");
    } catch (error: any) {
      actualError = error;
    }

    chai.assert.isDefined(actualError);
    chai.assert.isTrue(actualError?.message.includes("test-service-url-error"));
  });
});
