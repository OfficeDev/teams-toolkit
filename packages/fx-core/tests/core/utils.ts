// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { TokenCredential } from "@azure/core-auth";
import { TokenCredentialsBase } from "@azure/ms-rest-nodeauth";
import {
  AppStudioTokenProvider,
  AzureAccountProvider,
  AzureSolutionSettings,
  Colors,
  ConfigMap,
  CryptoProvider,
  Func,
  FxError,
  GraphTokenProvider,
  Inputs,
  InputTextConfig,
  InputTextResult,
  IProgressHandler,
  Json,
  LogLevel,
  LogProvider,
  MultiSelectConfig,
  MultiSelectResult,
  ok,
  PermissionRequestProvider,
  ProjectSettings,
  QTreeNode,
  Result,
  RunnableTask,
  SelectFileConfig,
  SelectFileResult,
  SelectFilesConfig,
  SelectFilesResult,
  SelectFolderConfig,
  SelectFolderResult,
  SharepointTokenProvider,
  SingleSelectConfig,
  SingleSelectResult,
  Solution,
  SolutionContext,
  Stage,
  SubscriptionInfo,
  TaskConfig,
  TelemetryReporter,
  TokenProvider,
  Tools,
  UserInteraction,
  v2,
  Void,
} from "@microsoft/teamsfx-api";
import * as uuid from "uuid";
import fs from "fs-extra";
import { environmentManager } from "../../src";
import {
  DEFAULT_PERMISSION_REQUEST,
  PluginNames,
} from "../../src/plugins/solution/fx-solution/constants";

function solutionSettings(): AzureSolutionSettings {
  return {
    name: "fx-solution-azure",
    version: "1.0.0",
    hostType: "Azure",
    capabilities: ["Tab"],
    azureResources: [],
    activeResourcePlugins: [PluginNames.FE, PluginNames.LDEBUG, PluginNames.AAD, PluginNames.SA],
  } as AzureSolutionSettings;
}
export class MockSolution implements Solution {
  name = "fx-solution-azure";

  async create(ctx: SolutionContext): Promise<Result<any, FxError>> {
    ctx.projectSettings!.solutionSettings = solutionSettings();
    const config = new ConfigMap();
    config.set("create", true);
    ctx.envInfo.state.set("solution", config);
    return ok(Void);
  }

  async scaffold(ctx: SolutionContext): Promise<Result<any, FxError>> {
    ctx.envInfo.state.get("solution")!.set("scaffold", true);
    return ok(Void);
  }

  async provision(ctx: SolutionContext): Promise<Result<any, FxError>> {
    ctx.envInfo.state.get("solution")!.set("provision", true);
    return ok(Void);
  }

  async deploy(ctx: SolutionContext): Promise<Result<any, FxError>> {
    ctx.envInfo.state.get("solution")!.set("deploy", true);
    return ok(Void);
  }

  async publish(ctx: SolutionContext): Promise<Result<any, FxError>> {
    ctx.envInfo.state.get("solution")!.set("publish", true);
    return ok(Void);
  }

  async localDebug(ctx: SolutionContext): Promise<Result<any, FxError>> {
    ctx.envInfo.state.get("solution")!.set("localDebug", true);
    return ok(Void);
  }

  async getQuestions(
    task: Stage,
    ctx: SolutionContext
  ): Promise<Result<QTreeNode | undefined, FxError>> {
    return ok(undefined);
  }

  async getQuestionsForUserTask(
    func: Func,
    ctx: SolutionContext
  ): Promise<Result<QTreeNode | undefined, FxError>> {
    return ok(undefined);
  }

  async executeUserTask(func: Func, ctx: SolutionContext): Promise<Result<any, FxError>> {
    ctx.envInfo.state.get("solution")!.set("executeUserTask", true);
    return ok(Void);
  }

  async migrate(ctx: SolutionContext): Promise<Result<any, FxError>> {
    ctx.projectSettings!.solutionSettings = solutionSettings();
    const config = new ConfigMap();
    ctx.envInfo.state.set("solution", config);
    return ok(Void);
  }
}

export class MockSolutionV2 implements v2.SolutionPlugin {
  name = "fx-solution-azure";
  displayName = "Azure Solution V2 Mock";
  async scaffoldSourceCode(ctx: v2.Context, inputs: Inputs): Promise<Result<Void, FxError>> {
    ctx.projectSetting.solutionSettings = solutionSettings();
    return ok(Void);
  }
  async generateResourceTemplate(ctx: v2.Context, inputs: Inputs): Promise<Result<Json, FxError>> {
    return ok({});
  }
  async provisionResources(
    ctx: v2.Context,
    inputs: Inputs,
    envInfo: v2.DeepReadonly<v2.EnvInfoV2>,
    tokenProvider: TokenProvider
  ): Promise<v2.FxResult<v2.SolutionProvisionOutput, FxError>> {
    return {
      kind: "success",
      output: {},
    };
  }
  async deploy(
    ctx: v2.Context,
    inputs: Inputs,
    provisionOutputs: Json,
    tokenProvider: TokenProvider
  ): Promise<Result<Void, FxError>> {
    return ok(Void);
  }
  async publishApplication(
    ctx: v2.Context,
    inputs: Inputs,
    envInfo: v2.DeepReadonly<v2.EnvInfoV2>,
    tokenProvider: AppStudioTokenProvider
  ): Promise<Result<Void, FxError>> {
    return ok(Void);
  }
  async provisionLocalResource(
    ctx: v2.Context,
    inputs: Inputs,
    localSettings: Json,
    tokenProvider: TokenProvider
  ): Promise<v2.FxResult<Json, FxError>> {
    return {
      kind: "success",
      output: {},
    };
  }
  async executeUserTask(
    ctx: v2.Context,
    inputs: Inputs,
    func: Func,
    localSettings: Json,
    envInfo: v2.EnvInfoV2,
    tokenProvider: TokenProvider
  ): Promise<Result<unknown, FxError>> {
    return ok(Void);
  }
  async getQuestions(
    ctx: v2.Context,
    inputs: Inputs,
    envInfo: v2.DeepReadonly<v2.EnvInfoV2>,
    tokenProvider: TokenProvider
  ): Promise<Result<QTreeNode | undefined, FxError>> {
    return ok(undefined);
  }
  async getQuestionsForUserTask(
    ctx: v2.Context,
    inputs: Inputs,
    func: Func,
    envInfo: v2.DeepReadonly<v2.EnvInfoV2>,
    tokenProvider: TokenProvider
  ): Promise<Result<QTreeNode | undefined, FxError>> {
    return ok(undefined);
  }
}

export function randomAppName() {
  return "mock" + new Date().getTime();
}

export class MockAzureAccountProvider implements AzureAccountProvider {
  getAccountCredentialAsync(): Promise<TokenCredentialsBase | undefined> {
    throw new Error("getAccountCredentialAsync Method not implemented.");
  }

  getIdentityCredentialAsync(): Promise<TokenCredential | undefined> {
    throw new Error("getIdentityCredentialAsync Method not implemented.");
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
    ) => Promise<void>
  ): Promise<boolean> {
    throw new Error("Method not implemented.");
  }

  removeStatusChangeMap(name: string): Promise<boolean> {
    throw new Error("Method not implemented.");
  }

  getJsonObject(showDialog?: boolean): Promise<Record<string, unknown>> {
    throw new Error("Method not implemented.");
  }

  listSubscriptions(): Promise<SubscriptionInfo[]> {
    throw new Error("Method not implemented.");
  }

  setSubscription(subscriptionId: string): Promise<void> {
    throw new Error("Method not implemented.");
  }

  getAccountInfo(): Record<string, string> {
    throw new Error("Method not implemented.");
  }

  getSelectedSubscription(): Promise<SubscriptionInfo | undefined> {
    throw new Error("Method not implemented.");
  }

  selectSubscription(subscriptionId?: string): Promise<string> {
    throw new Error("Method not implemented.");
  }
}

export class MockGraphTokenProvider implements GraphTokenProvider {
  getAccessToken(): Promise<string | undefined> {
    const result = new Promise<string>(function (resovle, {}) {
      resovle("success");
    });
    return result;
  }

  getJsonObject(): Promise<Record<string, unknown> | undefined> {
    const result = new Promise<Record<string, unknown>>(function (resovle, {}) {
      resovle({});
    });
    return result;
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
    ) => Promise<void>
  ): Promise<boolean> {
    throw new Error("Method not implemented.");
  }

  removeStatusChangeMap(name: string): Promise<boolean> {
    throw new Error("Method not implemented.");
  }
}

export class MockAppStudioTokenProvider implements AppStudioTokenProvider {
  /**
   * Get team access token
   * @param showDialog Control whether the UI layer displays pop-up windows
   */
  getAccessToken(showDialog?: boolean): Promise<string | undefined> {
    throw new Error("Method not implemented.");
  }

  /**
   * Get app studio token JSON object
   * - tid : tenantId
   * - unique_name : user name
   * - ...
   * @param showDialog Control whether the UI layer displays pop-up windows
   */
  getJsonObject(showDialog?: boolean): Promise<Record<string, unknown> | undefined> {
    throw new Error("Method not implemented.");
  }

  /**
   * App studio sign out
   */
  signout(): Promise<boolean> {
    throw new Error("Method not implemented.");
  }

  /**
   * Add update account info callback
   * @param name callback name
   * @param statusChange callback method
   * @param immediateCall whether callback when register, the default value is true
   */
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

  /**
   * Remove update account info callback
   * @param name callback name
   */
  removeStatusChangeMap(name: string): Promise<boolean> {
    throw new Error("Method not implemented.");
  }
}

export class MockSharepointTokenProvider implements SharepointTokenProvider {
  /**
   * Get sharepoint access token
   * @param showDialog Control whether the UI layer displays pop-up windows
   */
  getAccessToken(showDialog?: boolean): Promise<string | undefined> {
    throw new Error("Method not implemented.");
  }

  /**
   * Get sharepoint token JSON object
   * - tid : tenantId
   * - unique_name : user name
   * - ...
   * @param showDialog Control whether the UI layer displays pop-up windows
   */
  getJsonObject(showDialog?: boolean): Promise<Record<string, unknown> | undefined> {
    throw new Error("Method not implemented.");
  }

  /**
   * Add update account info callback
   * @param name callback name
   * @param statusChange callback method
   * @param immediateCall whether callback when register, the default value is true
   */
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

  /**
   * Remove update account info callback
   * @param name callback name
   */
  removeStatusChangeMap(name: string): Promise<boolean> {
    throw new Error("Method not implemented.");
  }
}

class MockTelemetryReporter implements TelemetryReporter {
  sendTelemetryErrorEvent(
    eventName: string,
    properties?: { [key: string]: string },
    measurements?: { [key: string]: number }
  ): void {
    // do nothing
  }

  sendTelemetryEvent(
    eventName: string,
    properties?: { [key: string]: string },
    measurements?: { [key: string]: number },
    errorProps?: string[]
  ): void {
    // do nothing
  }

  sendTelemetryException(
    error: Error,
    properties?: { [key: string]: string },
    measurements?: { [key: string]: number }
  ): void {
    // do nothing
  }
}

export class MockUserInteraction implements UserInteraction {
  selectOption(config: SingleSelectConfig): Promise<Result<SingleSelectResult, FxError>> {
    throw new Error("Method not implemented.");
  }

  selectOptions(config: MultiSelectConfig): Promise<Result<MultiSelectResult, FxError>> {
    throw new Error("Method not implemented.");
  }

  inputText(config: InputTextConfig): Promise<Result<InputTextResult, FxError>> {
    throw new Error("Method not implemented.");
  }

  selectFile(config: SelectFileConfig): Promise<Result<SelectFileResult, FxError>> {
    throw new Error("Method not implemented.");
  }

  selectFiles(config: SelectFilesConfig): Promise<Result<SelectFilesResult, FxError>> {
    throw new Error("Method not implemented.");
  }

  selectFolder(config: SelectFolderConfig): Promise<Result<SelectFolderResult, FxError>> {
    throw new Error("Method not implemented.");
  }

  openUrl(link: string): Promise<Result<boolean, FxError>> {
    throw new Error("Method not implemented.");
  }

  async showMessage(
    level: "info" | "warn" | "error",
    message: string,
    modal: boolean,
    ...items: string[]
  ): Promise<Result<string | undefined, FxError>>;

  async showMessage(
    level: "info" | "warn" | "error",
    message: Array<{ content: string; color: Colors }>,
    modal: boolean,
    ...items: string[]
  ): Promise<Result<string | undefined, FxError>>;

  async showMessage(
    level: "info" | "warn" | "error",
    message: string | Array<{ content: string; color: Colors }>,
    modal: boolean,
    ...items: string[]
  ): Promise<Result<string | undefined, FxError>> {
    return ok("");
  }

  createProgressBar(title: string, totalSteps: number): IProgressHandler {
    const handler: IProgressHandler = {
      start: async (detail?: string): Promise<void> => {},
      next: async (detail?: string): Promise<void> => {},
      end: async (): Promise<void> => {},
    };
    return handler;
  }

  async runWithProgress<T>(
    task: RunnableTask<T>,
    config: TaskConfig,
    ...args: any
  ): Promise<Result<T, FxError>> {
    return task.run(args);
  }
}

export class MockTools implements Tools {
  logProvider = new MockLogProvider();
  tokenProvider: TokenProvider = {
    azureAccountProvider: new MockAzureAccountProvider(),
    graphTokenProvider: new MockGraphTokenProvider(),
    appStudioToken: new MockAppStudioTokenProvider(),
    sharepointTokenProvider: new MockSharepointTokenProvider(),
  };
  telemetryReporter = new MockTelemetryReporter();
  ui = new MockUserInteraction();
  cryptoProvider = new MockCryptoProvider();
  permissionRequestProvider = new MockPermissionRequestProvider();
}

export class MockCryptoProvider implements CryptoProvider {
  encrypt(plaintext: string): Result<string, FxError> {
    return ok(plaintext);
  }

  decrypt(ciphertext: string): Result<string, FxError> {
    return ok(ciphertext);
  }
}

export class MockPermissionRequestProvider implements PermissionRequestProvider {
  async checkPermissionRequest(): Promise<Result<undefined, FxError>> {
    return ok(undefined);
  }

  async getPermissionRequest(): Promise<Result<string, FxError>> {
    return ok(JSON.stringify(DEFAULT_PERMISSION_REQUEST));
  }
}

export class MockLogProvider implements LogProvider {
  async trace({}: string): Promise<boolean> {
    return true;
  }

  async debug({}: string): Promise<boolean> {
    return true;
  }

  async info({}: string | Array<any>): Promise<boolean> {
    return true;
  }

  async warning({}: string): Promise<boolean> {
    return true;
  }

  async error({}: string): Promise<boolean> {
    return true;
  }

  async fatal({}: string): Promise<boolean> {
    return true;
  }

  async log({}: LogLevel, {}: string): Promise<boolean> {
    return true;
  }
}

export function MockProjectSettings(appName: string): ProjectSettings {
  return {
    appName: appName,
    projectId: uuid.v4(),
    solutionSettings: {
      name: PluginNames.SOLUTION,
      version: "1.0.0",
      hostType: "Azure",
      capabilities: ["Tab"],
      azureResources: [],
      activeResourcePlugins: [
        PluginNames.FE,
        PluginNames.LDEBUG,
        PluginNames.AAD,
        PluginNames.SA,
        PluginNames.APPST,
      ],
    } as AzureSolutionSettings,
  };
}

export function MockPreviousVersionBefore2_3_0Context(): Json {
  return {
    solution: {
      teamsAppTenantId: "tenantId",
      localDebugTeamsAppId: "teamsAppId",
    },
    "fx-resource-aad-app-for-teams": {
      local_clientId: "local_clientId",
      local_clientSecret: "{{fx-resource-aad-app-for-teams.local_clientSecret}}",
      local_objectId: "local_objectId",
      local_oauth2PermissionScopeId: "local_oauth2PermissionScopeId",
      local_tenantId: "local_tenantId",
      local_applicationIdUris: "local_applicationIdUris",
    },
  };
}

export function MockPreviousVersionBefore2_3_0UserData(): Record<string, string> {
  return {
    "fx-resource-aad-app-for-teams.local_clientSecret": "local_clientSecret",
  };
}

export function MockLatestVersion2_3_0Context(): Json {
  return {
    solution: {
      teamsAppTenantId: "{{solution.teamsAppTenantId}}",
      localDebugTeamsAppId: "{{solution.localDebugTeamsAppId}}",
    },
    "fx-resource-aad-app-for-teams": {
      local_clientId: "{{fx-resource-aad-app-for-teams.local_clientId}}",
      local_clientSecret: "{{fx-resource-aad-app-for-teams.local_clientSecret}}",
      local_objectId: "{{fx-resource-aad-app-for-teams.local_objectId}}",
      local_oauth2PermissionScopeId:
        "{{fx-resource-aad-app-for-teams.local_oauth2PermissionScopeId}}",
      local_tenantId: "{{fx-resource-aad-app-for-teams.local_tenantId}}",
      local_applicationIdUris: "{{fx-resource-aad-app-for-teams.local_applicationIdUris}}",
    },
  };
}

export function MockLatestVersion2_3_0UserData(): Record<string, string> {
  return {
    "fx-resource-aad-app-for-teams.local_clientId": "local_clientId_new",
    "fx-resource-aad-app-for-teams.local_clientSecret": "local_clientSecret_new",
    "fx-resource-aad-app-for-teams.local_objectId": "local_objectId_new",
    "fx-resource-aad-app-for-teams.local_oauth2PermissionScopeId":
      "local_oauth2PermissionScopeId_new",
    "fx-resource-aad-app-for-teams.local_tenantId": "local_tenantId_new",
    "fx-resource-aad-app-for-teams.local_applicationIdUris": "local_applicationIdUris_new",
    "solution.teamsAppTenantId": "tenantId_new",
    "solution.localDebugTeamsAppId": "teamsAppId_new",
  };
}

export function deleteFolder(filePath?: string): void {
  if (!filePath) return;
  if (fs.existsSync(filePath)) {
    const files = fs.readdirSync(filePath);
    files.forEach((file) => {
      const nextFilePath = `${filePath}/${file}`;
      const states = fs.statSync(nextFilePath);
      if (states.isDirectory()) {
        //recurse
        deleteFolder(nextFilePath);
      } else {
        //delete file
        fs.unlinkSync(nextFilePath);
      }
    });
    fs.rmdirSync(filePath);
  }
}
