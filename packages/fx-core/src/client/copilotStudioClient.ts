// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AxiosInstance } from "axios";
import { WrappedAxiosClient } from "../common/wrappedAxiosClient";
import { DeclarativeAgentBotDefinition } from "../component/feature/declarativeAgentDefinition";

export class RetryHandler {
  public static RETRIES = 6;
  public static async Retry<T>(fn: () => Promise<T>): Promise<T | undefined> {
    let retries = this.RETRIES;
    let response;
    while (retries > 0) {
      retries = retries - 1;
      try {
        response = await fn();
        return response;
      } catch (e) {
        // Directly throw 404 error, keep trying for other status code e.g. 503 400
        if (retries <= 0 || e.response?.status == 404 || e.response?.status == 409) {
          throw e;
        } else {
          await new Promise((resolve) => setTimeout(resolve, 5000));
        }
      }
    }
  }
}

export class CopilotStudioClient {
  /**
   * @param {string}  token
   * @returns {AxiosInstance}
   */
  createRequesterWithToken(token: string): AxiosInstance {
    const instance = WrappedAxiosClient.create({
      baseURL: "https://api.copilotstudio.microsoft.com",
    });
    instance.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    instance.defaults.headers.common["Client-Source"] = "teamstoolkit";
    return instance;
  }

  async createBot(
    token: string,
    declarativeAgentDefinition: DeclarativeAgentBotDefinition
  ): Promise<boolean> {
    const instance = this.createRequesterWithToken(token);
    const response = await instance.post(
      "/powervirtualagents/api/copilots/provisioning/upsert?api-version=2022-03-01-preview",
      declarativeAgentDefinition
    );
    return response.status === 200;
  }
}
