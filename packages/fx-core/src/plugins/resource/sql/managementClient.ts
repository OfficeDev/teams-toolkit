// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { FirewallRule, ServerAzureADAdministrator, SqlManagementClient } from "@azure/arm-sql";
import axios from "axios";
import { SqlConfig } from "./config";
import { ErrorMessage } from "./errors";
import { Constants } from "./constants";
import { SqlResultFactory } from "./results";
import { AzureAccountProvider } from "@microsoft/teamsfx-api";
export class ManagementClient {
  client?: SqlManagementClient;
  config?: SqlConfig;
  totalFirewallRuleCount = 0;

  public async create(
    azureAccountProvider: AzureAccountProvider,
    config: SqlConfig
  ): Promise<void> {
    const credential = await azureAccountProvider.getIdentityCredentialAsync();
    this.config = config;
    this.client = new SqlManagementClient(credential!, config.azureSubscriptionId);
  }

  async existAzureSQL(): Promise<boolean> {
    if (!this.client || !this.config || !this.config.sqlServer) return false;
    try {
      const result = await this.client.servers.checkNameAvailability({
        name: this.config.sqlServer,
        type: "Microsoft.Sql/servers",
      });
      if (result.available) {
        return false;
      } else if (result.reason === "Invalid") {
        throw SqlResultFactory.UserError(
          ErrorMessage.SqlEndpointError.name,
          ErrorMessage.SqlEndpointError.message(this.config.sqlEndpoint)
        );
      } else {
        return true;
      }
    } catch (error) {
      throw SqlResultFactory.SystemError(
        ErrorMessage.SqlCheckError.name,
        ErrorMessage.SqlCheckError.message(this.config.sqlEndpoint, error.message),
        error
      );
    }
  }

  async existAadAdmin(): Promise<boolean> {
    if (!this.client || !this.config) return false;
    try {
      for await (const page of this.client.serverAzureADAdministrators
        .listByServer(this.config.resourceGroup, this.config.sqlServer)
        .byPage({ maxPageSize: 100 })) {
        for (const item of page) {
          if (item.login === this.config!.aadAdmin) {
            return true;
          }
        }
      }
      return false;
    } catch (error) {
      throw SqlResultFactory.UserError(
        ErrorMessage.SqlCheckAdminError.name,
        ErrorMessage.SqlCheckAdminError.message(this.config.identity, error.message),
        error
      );
    }
  }

  async addAADadmin(): Promise<void> {
    if (!this.client || !this.config) return;
    let model: ServerAzureADAdministrator = {
      tenantId: this.config.tenantId,
      sid: this.config.aadAdminObjectId,
      login: this.config.aadAdmin,
    };
    const tmp: any = model;
    tmp.administratorType = Constants.sqlAdministratorType;
    model = tmp as unknown as ServerAzureADAdministrator;
    try {
      await this.client.serverAzureADAdministrators.beginCreateOrUpdateAndWait(
        this.config.resourceGroup,
        this.config.sqlServer,
        Constants.sqlAdministratorType,
        model
      );
    } catch (error) {
      throw SqlResultFactory.UserError(
        ErrorMessage.SqlAddAdminError.name,
        ErrorMessage.SqlAddAdminError.message(this.config.aadAdmin, error.message),
        error
      );
    }
  }

  async addLocalFirewallRule(): Promise<void> {
    if (!this.client || !this.config) return;
    try {
      const response = await axios.get(Constants.echoIpAddress);
      const localIp: string = response.data;
      const partials: string[] = localIp.split(".");

      partials[2] = Constants.ipBeginToken;
      partials[3] = Constants.ipBeginToken;
      const startIp: string = partials.join(".");

      partials[2] = Constants.ipEndToken;
      partials[3] = Constants.ipEndToken;
      const endIp: string = partials.join(".");
      const model: FirewallRule = {
        startIpAddress: startIp,
        endIpAddress: endIp,
      };
      const ruleName = this.getRuleName(this.totalFirewallRuleCount);
      await this.client.firewallRules.createOrUpdate(
        this.config.resourceGroup,
        this.config.sqlServer,
        ruleName,
        model
      );
      this.totalFirewallRuleCount++;
    } catch (error) {
      throw SqlResultFactory.UserError(
        ErrorMessage.SqlLocalFirwallError.name,
        ErrorMessage.SqlLocalFirwallError.message(this.config.sqlEndpoint, error.message),
        error
      );
    }
  }

  async deleteLocalFirewallRule(): Promise<void> {
    if (!this.client || !this.config) return;
    try {
      for (let i = 0; i < this.totalFirewallRuleCount; i++) {
        const ruleName = this.getRuleName(i);
        await this.client.firewallRules.delete(
          this.config.resourceGroup,
          this.config.sqlServer,
          ruleName
        );
      }
    } catch (error) {
      throw SqlResultFactory.UserError(
        ErrorMessage.SqlDeleteLocalFirwallError.name,
        ErrorMessage.SqlDeleteLocalFirwallError.message(this.config.sqlEndpoint, error.message),
        error
      );
    }
  }

  getRuleName(suffix: number): string {
    return Constants.firewall.localRule + suffix;
  }

  async delay(s: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, s * 1000));
  }
}

export const SqlMgrClient = new ManagementClient();
