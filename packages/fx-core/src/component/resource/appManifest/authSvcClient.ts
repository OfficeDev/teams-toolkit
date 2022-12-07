// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import axios, { AxiosInstance } from "axios";
import { RetryHandler } from "./utils/utils";
import { AppStudioResultFactory } from "./results";
import { AppStudioError } from "./errors";
import { TelemetryEventName, TelemetryUtils } from "./utils/telemetry";

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace AuthSvcClient {
  const baseUrl = "https://authsvc.teams.microsoft.com";

  /**
   * Creates a new axios instance to prevent setting the accessToken on global instance.
   * @param {string}  authSvcToken
   * @returns {AxiosInstance}
   */
  function createRequesterWithToken(authSvcToken: string): AxiosInstance {
    const instance = axios.create({
      baseURL: baseUrl,
    });
    instance.defaults.headers.common["Authorization"] = `Bearer ${authSvcToken}`;
    instance.interceptors.request.use(function (config) {
      config.params = { teamstoolkit: true, ...config.params };
      return config;
    });
    return instance;
  }

  /**
   * Get the region of M365 user
   * @param authSvcToken
   * @returns e.g. apac amer
   */
  export async function getRegion(authSvcToken: string): Promise<string> {
    const requester = createRequesterWithToken(authSvcToken);
    try {
      const response = await RetryHandler.Retry(() => requester.post(`/v1.0/users/region`));
      return response?.data.region as string;
    } catch (e: any) {
      const error = wrapException(e, "get-region");
      throw error;
    }
  }

  function wrapException(e: any, apiName: string): Error {
    const requestPath = e.request?.path ? `${e.request.method} ${e.request.path}` : "";
    const extraData = e.response?.data ? `data: ${JSON.stringify(e.response.data)}` : "";

    const error = AppStudioResultFactory.SystemError(
      AppStudioError.DeveloperPortalAPIFailedError.name,
      AppStudioError.DeveloperPortalAPIFailedError.message(e, "", requestPath, apiName, extraData)
    );

    TelemetryUtils.sendErrorEvent(TelemetryEventName.authSvcApi, error, {
      method: e.request?.method,
      "status-code": `${e?.response?.status}`,
      url: `<${apiName}-url>`,
    });
    return error;
  }
}
