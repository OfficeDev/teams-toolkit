// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ResourceContextV3, AzureAccountProvider, LogProvider, Json } from "@microsoft/teamsfx-api";
import { AzureScopes } from "../../../../common/tools";
import { ComponentNames } from "../../../constants";
import { ManagementClient } from "../clients/management";
import { SqlClient } from "../clients/sql";
import { Constants } from "../constants";
import { ErrorMessage } from "../errors";
import { SqlResultFactory } from "../results";
import { parseToken, TokenInfo } from "../utils/common";

export class UtilFunctions {
  static async CheckAndSetAadAdmin(
    client: ManagementClient,
    aadAdmin: string,
    objectId: string,
    tenantId: string
  ): Promise<boolean> {
    const existAdmin = await client.existAadAdmin(aadAdmin);
    if (!existAdmin) {
      await client.addAADadmin(tenantId, objectId, aadAdmin);
    }
    return existAdmin;
  }

  static async parseLoginToken(azureAccountProvider: AzureAccountProvider): Promise<TokenInfo> {
    // get login user info to set aad admin in sql
    try {
      const credential = await azureAccountProvider.getIdentityCredentialAsync();
      const token = await credential!.getToken(AzureScopes);
      const accessToken = token?.token;
      return parseToken(accessToken!);
    } catch (error: any) {
      throw SqlResultFactory.SystemError(
        ErrorMessage.SqlUserInfoError.name,
        ErrorMessage.SqlUserInfoError.message(),
        error
      );
    }
  }

  static async getSkipAddingUser(
    config: Json,
    azureAccountProvider: AzureAccountProvider
  ): Promise<boolean> {
    const skipAddingUser = config[Constants.skipAddingSqlUser];
    if (skipAddingUser === undefined) {
      return (await azureAccountProvider?.getIdentityCredentialAsync()) ? false : true;
    } else {
      return skipAddingUser as boolean;
    }
  }

  static getIdentity(ctx: ResourceContextV3): string {
    const config = ctx.envInfo.state[ComponentNames.Identity];
    const identity = config[Constants.identityName] as string;
    if (!identity) {
      const error = SqlResultFactory.SystemError(
        ErrorMessage.SqlGetConfigError.name,
        ErrorMessage.SqlGetConfigError.message(Constants.identityPlugin, Constants.identityName)
      );
      throw error;
    }
    return identity;
  }

  static async addDatabaseUser(
    logProvider: LogProvider,
    sqlClient: SqlClient,
    managementClient: ManagementClient
  ): Promise<void> {
    let retryCount = 0;
    const databaseWithUser: { [key: string]: boolean } = {};
    sqlClient.config.databases.forEach((element) => {
      databaseWithUser[element] = false;
    });
    while (true) {
      try {
        for (const database in databaseWithUser) {
          if (!databaseWithUser[database]) {
            await sqlClient.addDatabaseUser(database);
            databaseWithUser[database] = true;
          }
        }
        return;
      } catch (error) {
        if (
          !SqlClient.isFireWallError(error?.innerError) ||
          retryCount >= Constants.maxRetryTimes
        ) {
          throw error;
        } else {
          retryCount++;
          logProvider.warning(
            `[${Constants.pluginName}] Retry adding new firewall rule to access azure sql, because the local IP address has changed after added firewall rule for it. [Retry time: ${retryCount}]`
          );
          await managementClient.addLocalFirewallRule();
        }
      }
    }
  }
}
