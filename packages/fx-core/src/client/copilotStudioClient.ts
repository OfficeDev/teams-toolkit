// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AxiosInstance } from "axios";
import { WrappedAxiosClient } from "../common/wrappedAxiosClient";
import { DeclarativeAgentBotDefinition } from "../component/feature/declarativeAgentDefinition";

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
    try {
      const instance = this.createRequesterWithToken(token);
      const response = await instance.post(
        "/powervirtualagents/api/copilots/provisioning/upsert?api-version=2022-03-01-preview",
        declarativeAgentDefinition
      );
      return response.status === 200;
    } catch (e) {
      throw e;
    }
  }

  async getBot(token: string, declarativeAgentId: string): Promise<string> {
    try {
      const instance = this.createRequesterWithToken(token);
      let response;
      do {
        response = await instance.get(
          `/powervirtualagents/api/copilots/provisioning/copilot/${declarativeAgentId}/status?api-version=1`
        );
        if (response.data.status !== "Provisioned") {
          // Wait for a short time before checking again
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      } while (response.data.status !== "Provisioned");

      if (!response.data.copilotStudioDetails.teamsBotInfo) {
        throw new Error("Bot information is missing from the provisioned copilot");
      }
      const botId = response.data.copilotStudioDetails.teamsBotInfo.id;
      return botId;
    } catch (e) {
      throw e;
    }
  }
}

export const copilotStudioClient = new CopilotStudioClient();
