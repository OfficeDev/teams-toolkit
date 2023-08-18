// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import axios, { AxiosInstance } from "axios";
import { RetryHandler } from "../utils/utils";
import { AppStudioResultFactory } from ".././results";
import { AppStudioError } from ".././errors";
import { TelemetryEventName, TelemetryUtils } from "../utils/telemetry";

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
   * @returns e.g. https://dev.teams.microsoft.com/apac, https://dev.teams.microsoft.com/amer
   */
  export async function getRegion(authSvcToken: string): Promise<string | undefined> {
    const requester = createRequesterWithToken(authSvcToken);
    try {
      const response = await RetryHandler.Retry(() => requester.post(`/v1.0/users/region`));
      return response?.data?.regionGtms?.teamsDevPortal as string;
    } catch (e: any) {
      wrapException(e, "get-region");
      return undefined;
    }
  }

  function wrapException(e: any, apiName: string): Error {
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    const requestPath = e.request?.path ? `${e.request.method} ${e.request.path}` : "";
    const error = AppStudioResultFactory.SystemError(
      AppStudioError.AuthServiceAPIFailedError.name,
      AppStudioError.AuthServiceAPIFailedError.message(e, requestPath, apiName)
    );

    TelemetryUtils.sendErrorEvent(TelemetryEventName.authSvcApi, error, {
      method: e.request?.method,
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      "status-code": `${e?.response?.status}`,
      url: `<${apiName}-url>`,
    });
    return error;
  }
}
