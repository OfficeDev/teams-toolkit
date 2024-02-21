// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AxiosInstance } from "axios";
import { RetryHandler } from "../utils/utils";
import { WrappedAxiosClient } from "../../../../common/wrappedAxiosClient";

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace AuthSvcClient {
  const baseUrl = "https://authsvc.teams.microsoft.com";

  /**
   * Creates a new axios instance to prevent setting the accessToken on global instance.
   * @param {string}  authSvcToken
   * @returns {AxiosInstance}
   */
  function createRequesterWithToken(authSvcToken: string): AxiosInstance {
    const instance = WrappedAxiosClient.create({
      baseURL: baseUrl,
    });
    instance.defaults.headers.common["Authorization"] = `Bearer ${authSvcToken}`;
    instance.defaults.headers.common["Client-Source"] = "teamstoolkit";
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
      return undefined;
    }
  }
}
