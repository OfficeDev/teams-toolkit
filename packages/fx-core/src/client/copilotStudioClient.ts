// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AxiosInstance } from "axios";

import { PowerPlatformApiDiscovery } from "../common/powerPlatformApiDiscovery";
import { WrappedAxiosClient } from "../common/wrappedAxiosClient";
import { DeclarativeAgentBotDefinition } from "../component/feature/declarativeAgentDefinition";

export class CopilotStudioClient {
  /**
   * @param {string}  token
   * @param {string}  tenantId
   * @returns {AxiosInstance}
   */
  createRequesterWithToken(token: string, tenantId: string): AxiosInstance {
    const instance = WrappedAxiosClient.create({
      baseURL: `https://${this.getTenantIslandClusterEndpoint(tenantId)}`,
    });
    instance.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    instance.defaults.headers.common["Client-Source"] = "teamstoolkit";
    return instance;
  }

  async createBot(
    token: string,
    declarativeAgentDefinition: DeclarativeAgentBotDefinition,
    tenantId: string
  ): Promise<boolean> {
    try {
      const instance = this.createRequesterWithToken(token, tenantId);
      const response = await instance.post(
        "/powervirtualagents/api/copilots/provisioning/upsert?api-version=1",
        declarativeAgentDefinition
      );
      return response.status === 200;
    } catch (e) {
      throw e;
    }
  }

  async getBot(token: string, declarativeAgentId: string, tenantId: string): Promise<string> {
    try {
      const instance = this.createRequesterWithToken(token, tenantId);
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

  getTenantIslandClusterEndpoint(tenantId: string): string {
    const env = process.env.COPILOT_STUDIO_ENV === "test" ? "test" : "prod";
    const discovery = new PowerPlatformApiDiscovery(env);
    return discovery.getTenantIslandClusterEndpoint(tenantId);
  }
}

export const copilotStudioClient = new CopilotStudioClient();
