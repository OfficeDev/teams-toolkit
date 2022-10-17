// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { TokenCredential } from "@azure/core-http";
import {
  CryptoProvider,
  LogProvider,
  M365TokenProvider,
  AzureAccountProvider,
  ProjectSettingsV3,
  ResourceContextV3,
  TelemetryReporter,
  UserInteraction,
  v3,
  err,
  ok,
  SubscriptionInfo,
  InputsWithProjectPath,
  Platform,
  Result,
  Void,
  FxError,
} from "@microsoft/teamsfx-api";

import { ComponentNames } from "../constants";
import { DefaultManifestProvider } from "../resource/appManifest/manifestProvider";
import { checkWhetherLocalDebugM365TenantMatches } from "../../plugins/solution/fx-solution/v2/utils";
import { isCSharpProject } from "../utils";

export async function checkM365Tenant(
  projectPath: string,
  projectSettingsV3: ProjectSettingsV3,
  envInfoV3: v3.EnvInfoV3,
  m365TokenProvider: M365TokenProvider,
  logger: LogProvider,
  telemetry: TelemetryReporter,
  ui: UserInteraction,
  cryptoProvider: CryptoProvider
): Promise<Result<Void, FxError>> {
  const resourceContextV3 = constructResourceContextV3(
    projectPath,
    projectSettingsV3,
    envInfoV3,
    m365TokenProvider,
    logger,
    telemetry,
    ui,
    cryptoProvider
  );
  const inputs = constructInputsWithProjectPath(projectPath);
  const tenantId =
    envInfoV3.state[ComponentNames.AadApp]?.tenantId ||
    envInfoV3.state[ComponentNames.AppManifest]?.tenantId;
  const checkResult = await checkWhetherLocalDebugM365TenantMatches(
    envInfoV3,
    resourceContextV3,
    isCSharpProject(projectSettingsV3.programmingLanguage),
    tenantId,
    m365TokenProvider,
    inputs
  );
  if (checkResult.isErr()) {
    return err(checkResult.error);
  }

  return ok(Void);
}

function constructResourceContextV3(
  projectPath: string,
  projectSettingsV3: ProjectSettingsV3,
  envInfoV3: v3.EnvInfoV3,
  m365TokenProvider: M365TokenProvider,
  logger: LogProvider,
  telemetry: TelemetryReporter,
  ui: UserInteraction,
  cryptoProvider: CryptoProvider
): ResourceContextV3 {
  const context: ResourceContextV3 = {
    envInfo: envInfoV3,
    tokenProvider: {
      m365TokenProvider,
      azureAccountProvider: new MockAzureAccountProvider(),
    },
    projectPath,
    manifestProvider: new DefaultManifestProvider(),
    projectSetting: projectSettingsV3,
    userInteraction: ui,
    logProvider: logger,
    telemetryReporter: telemetry,
    cryptoProvider,
  };

  return context;
}

function constructInputsWithProjectPath(projectPath: string): InputsWithProjectPath {
  const inputs: InputsWithProjectPath = {
    projectPath,
    platform: Platform.VSCode, // NOTE: may need to be updated afterwards
  };
  return inputs;
}

class MockAzureAccountProvider implements AzureAccountProvider {
  getIdentityCredentialAsync(showDialog?: boolean): Promise<TokenCredential | undefined> {
    throw new Error("Method not implemented.");
  }

  signout(): Promise<boolean> {
    throw new Error("Method not implemented.");
  }

  setStatusChangeMap(
    name: string,
    statusChange: (
      status: string,
      token?: string,
      accountInfo?: Record<string, unknown>
    ) => Promise<void>,
    immediateCall?: boolean
  ): Promise<boolean> {
    throw new Error("Method not implemented.");
  }

  removeStatusChangeMap(name: string): Promise<boolean> {
    throw new Error("Method not implemented.");
  }

  getJsonObject(showDialog?: boolean): Promise<Record<string, unknown> | undefined> {
    throw new Error("Method not implemented.");
  }

  listSubscriptions(): Promise<SubscriptionInfo[]> {
    throw new Error("Method not implemented.");
  }

  setSubscription(subscriptionId: string): Promise<void> {
    throw new Error("Method not implemented.");
  }

  getAccountInfo(): Record<string, string> | undefined {
    throw new Error("Method not implemented.");
  }

  getSelectedSubscription(triggerUI?: boolean): Promise<SubscriptionInfo | undefined> {
    throw new Error("Method not implemented.");
  }
}
