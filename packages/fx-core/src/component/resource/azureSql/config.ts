// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { v3 } from "@microsoft/teamsfx-api";
import {
  getResourceGroupNameFromResourceId,
  getSubscriptionIdFromResourceId,
} from "../../../common/tools";
import { Constants } from "./constants";
import { ErrorMessage } from "./errors";
import { SqlResultFactory } from "./results";
import { ManagementConfig, SqlConfig } from "./types";

export function LoadManagementConfig(state: v3.CloudResource): ManagementConfig {
  const subscriptionId = loadSubscriptionId(state);
  const resourceGroup = loadResourceGroup(state);
  const sqlEndpoint = state[Constants.sqlEndpoint] as string;
  const sqlServer = sqlEndpoint.split(".")[0];
  return {
    azureSubscriptionId: subscriptionId,
    resourceGroup: resourceGroup,
    sqlEndpoint: sqlEndpoint,
    sqlServer: sqlServer,
  };
}

export function LoadSqlConfig(state: v3.CloudResource, identity: string): SqlConfig {
  const sqlEndpoint = state[Constants.sqlEndpoint] as string;
  const databases = loadDatabases(state);
  return {
    sqlEndpoint: sqlEndpoint,
    identity: identity,
    databases: Object.values(databases),
  };
}

export function loadDatabases(state: v3.CloudResource): Record<string, string> {
  const databases: Record<string, string> = {};
  for (const key of Object.keys(state)) {
    if (key.startsWith(Constants.databaseName)) {
      databases[key] = state[key];
    }
  }
  return databases;
}

export function removeDatabases(state: v3.CloudResource): void {
  for (const key of Object.keys(state)) {
    if (key.startsWith(Constants.databaseName) && key !== Constants.databaseName) {
      delete state[key];
    }
  }
}

function loadSubscriptionId(state: v3.CloudResource): string {
  let subscriptionId = "";
  const sqlResourceId = state["sqlResourceId"];
  if (sqlResourceId) {
    try {
      subscriptionId = getSubscriptionIdFromResourceId(sqlResourceId);
    } catch (error) {
      throw SqlResultFactory.UserError(
        ErrorMessage.SqlInvalidConfigError.name,
        ErrorMessage.SqlInvalidConfigError.message(sqlResourceId, error.message),
        error
      );
    }
  }
  return subscriptionId;
}

function loadResourceGroup(state: v3.CloudResource): string {
  let resourceGroup = "";
  const sqlResourceId = state["sqlResourceId"];
  if (sqlResourceId) {
    try {
      resourceGroup = getResourceGroupNameFromResourceId(sqlResourceId);
    } catch (error) {
      throw SqlResultFactory.UserError(
        ErrorMessage.SqlInvalidConfigError.name,
        ErrorMessage.SqlInvalidConfigError.message(sqlResourceId, error.message),
        error
      );
    }
  }
  return resourceGroup;
}
