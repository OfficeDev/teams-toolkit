// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { M365TokenProvider } from "@microsoft/teamsfx-api";
import axios, { AxiosInstance } from "axios";
import MockM365TokenProvider from "@microsoft/teamsfx-cli/src/commonlib/m365LoginUserPassword";

const sideloadingServiceEndpoint =
  process.env.SIDELOADING_SERVICE_ENDPOINT ??
  "{{SERVICE_ENDPOINT_PLACEHOLDER}}";
const sideloadingServiceScope =
  process.env.SIDELOADING_SERVICE_SCOPE ?? "{{SERVICE_SCOPE_PLACEHOLDER}}";

function delay(ms: number) {
  // tslint:disable-next-line no-string-based-set-timeout
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class M365TitleHelper {
  private static instance: M365TitleHelper;

  private axios: AxiosInstance;

  private constructor(serviceURL: string, access: string) {
    this.axios = axios.create({
      baseURL: serviceURL,
      headers: {
        authorization: `Bearer ${access}`,
        ConsistencyLevel: "eventual",
        "content-type": "application/json",
      },
    });
  }

  public static async init(
    endpoint: string = sideloadingServiceEndpoint,
    scope: string = sideloadingServiceScope,
    provider: M365TokenProvider = MockM365TokenProvider
  ): Promise<M365TitleHelper> {
    if (!M365TitleHelper.instance) {
      const res = await provider.getAccessToken({
        scopes: [scope],
      });
      if (res.isErr()) {
        throw res.error;
      }
      try {
        const envInfo = await axios.get("/config/v1/environment", {
          baseURL: endpoint,
          headers: {
            Authorization: `Bearer ${res.value}`,
          },
        });
        this.instance = new M365TitleHelper(
          envInfo.data.titlesServiceUrl,
          res.value
        );
      } catch (error: any) {
        throw error;
      }
    }
    return this.instance;
  }

  public async unacquire(id: string, retryTimes = 5) {
    if (!id) {
      return Promise.resolve(true);
    }
    return new Promise<boolean>(async (resolve) => {
      for (let i = 0; i < retryTimes; ++i) {
        try {
          await this.axios!.delete(`/catalog/v1/users/acquisitions/${id}`);
          console.info(`[Success] delete the M365 Title id: ${id}`);
          return resolve(true);
        } catch {
          await delay(2000);
        }
      }
      console.error(`[Failed] delete the M365 Title with id: ${id}`);
      return resolve(false);
    });
  }
}
