// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { LogLevel } from "@microsoft/teamsfx-api";
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import fs from "fs-extra";
import sinon from "sinon";

import { expect } from "../../utils";
import CLILogProvider from "../../../../src/commonlib/log";
import { PackageService } from "../../../../src/cmds/m365/packageService";

describe("Package Service", () => {
  const sandbox = sinon.createSandbox();
  let logs: string[] = [];
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
      return Promise.reject(new Error("test-delete"));
    },
    get: function <T = any, R = AxiosResponse<T>>(url: string): Promise<R> {
      return Promise.reject(new Error("test-get"));
    },
    post: function <T = any, R = AxiosResponse<T>>(
      url: string,
      data?: any,
      config?: AxiosRequestConfig
    ): Promise<R> {
      return Promise.reject(new Error("test-post"));
    },
  } as AxiosInstance;

  afterEach(() => {
    sandbox.restore();
  });

  beforeEach(() => {
    logs = [];
    sandbox.stub(CLILogProvider, "necessaryLog").callsFake((level: LogLevel, message: string) => {
      logs.push(message);
    });
    sandbox.stub(CLILogProvider, "debug").callsFake((message: string) => {
      return Promise.resolve(false);
    });
    sandbox.stub(fs, "readFile").callsFake((file) => {
      return Promise.resolve(Buffer.from("test"));
    });
    sandbox.stub(axios, "create").returns(testAxiosInstance);
  });

  it("sideLoading throws expected error", async () => {
    const packageService = new PackageService("test-endpoint");
    let actualError: Error | undefined;
    try {
      await packageService.sideLoading("test-token", "test-path");
    } catch (error: any) {
      actualError = error;
    }

    expect(actualError).not.undefined;
    expect(actualError?.message).equals("test-post");
  });

  it("retrieveTitleId throws expected error", async () => {
    const packageService = new PackageService("test-endpoint");
    let actualError: Error | undefined;
    try {
      await packageService.retrieveTitleId("test-token", "test-path");
    } catch (error: any) {
      actualError = error;
    }

    expect(actualError).not.undefined;
    expect(actualError?.message).equals("test-post");
  });

  it("unacquire throws expected error", async () => {
    const packageService = new PackageService("test-endpoint");
    let actualError: Error | undefined;
    try {
      await packageService.unacquire("test-token", "test-title-id");
    } catch (error: any) {
      actualError = error;
    }

    expect(actualError).not.undefined;
    expect(actualError?.message).equals("test-delete");
  });

  it("getLaunchInfo throws expected error", async () => {
    const packageService = new PackageService("test-endpoint");
    let actualError: Error | undefined;
    try {
      await packageService.getLaunchInfo("test-token", "test-title-id");
    } catch (error: any) {
      actualError = error;
    }

    expect(actualError).not.undefined;
    expect(actualError?.message).equals("test-get");
  });
});
