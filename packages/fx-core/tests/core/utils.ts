// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { TokenCredential } from "@azure/core-auth";
import {
  AzureAccountProvider,
  AzureSolutionSettings,
  Colors,
  ConfigMap,
  CryptoProvider,
  Func,
  FxError,
  Inputs,
  InputTextConfig,
  InputTextResult,
  IProgressHandler,
  Json,
  LoginStatus,
  LogLevel,
  LogProvider,
  M365TokenProvider,
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
  SingleSelectConfig,
  SingleSelectResult,
  Solution,
  SolutionContext,
  Stage,
  SubscriptionInfo,
  TaskConfig,
  TelemetryReporter,
  TokenProvider,
  TokenRequest,
  Tools,
  UserInteraction,
  v2,
  v3,
  Void,
} from "@microsoft/teamsfx-api";
import fs from "fs-extra";
import * as uuid from "uuid";
import {
  DEFAULT_PERMISSION_REQUEST,
  PluginNames,
} from "../../src/plugins/solution/fx-solution/constants";
import { TeamsAppSolutionNameV2 } from "../../src/plugins/solution/fx-solution/v2/constants";
import sinon from "sinon";
import { MyTokenCredential } from "../plugins/resource/bot/unit/utils";

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
  name = TeamsAppSolutionNameV2;
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
    envInfo: v2.EnvInfoV2,
    tokenProvider: TokenProvider
  ): Promise<Result<Void, FxError>> {
    return ok(Void);
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
    tokenProvider: M365TokenProvider
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
  async getIdentityCredentialAsync(): Promise<TokenCredential | undefined> {
    return new MyTokenCredential();
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

  async getJsonObject(showDialog?: boolean): Promise<Record<string, unknown>> {
    return {
      unique_name: "test",
    };
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

export class MockM365TokenProvider implements M365TokenProvider {
  /**
   * Get M365 access token
   * @param tokenRequest permission scopes or show user interactive UX
   */
  getAccessToken(tokenRequest: TokenRequest): Promise<Result<string, FxError>> {
    throw new Error("Method not implemented.");
  }

  /**
   * Get M365 token Json object
   * - tid : tenantId
   * - unique_name : user name
   * - ...
   * @param tokenRequest permission scopes or show user interactive UX
   */
  getJsonObject(tokenRequest: TokenRequest): Promise<Result<Record<string, unknown>, FxError>> {
    throw new Error("Method not implemented.");
  }

  /**
   * Get user login status
   * @param tokenRequest permission scopes or show user interactive UX
   */
  getStatus(tokenRequest: TokenRequest): Promise<Result<LoginStatus, FxError>> {
    throw new Error("Method not implemented.");
  }
  /**
   * m365 sign out
   */
  signout(): Promise<boolean> {
    throw new Error("Method not implemented.");
  }

  /**
   * Add update account info callback
   * @param name callback name
   * @param tokenRequest permission scopes
   * @param statusChange callback method
   * @param immediateCall whether callback when register, the default value is true
   */
  setStatusChangeMap(
    name: string,
    tokenRequest: TokenRequest,
    statusChange: (
      status: string,
      token?: string,
      accountInfo?: Record<string, unknown>
    ) => Promise<void>,
    immediateCall?: boolean
  ): Promise<Result<boolean, FxError>> {
    throw new Error("Method not implemented.");
  }

  /**
   * Remove update account info callback
   * @param name callback name
   */
  removeStatusChangeMap(name: string): Promise<Result<boolean, FxError>> {
    throw new Error("Method not implemented.");
  }
}

export class MockTelemetryReporter implements TelemetryReporter {
  sendTelemetryErrorEvent(
    eventName: string,
    properties?: { [key: string]: string },
    measurements?: { [key: string]: number },
    errorProps?: string[]
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
    throw new Error(`Method selectOption not implemented: ${JSON.stringify(config)}`);
  }

  selectOptions(config: MultiSelectConfig): Promise<Result<MultiSelectResult, FxError>> {
    throw new Error(`Method selectOptions not implemented: ${JSON.stringify(config)}`);
  }

  inputText(config: InputTextConfig): Promise<Result<InputTextResult, FxError>> {
    throw new Error(`Method inputText not implemented: ${JSON.stringify(config)}`);
  }

  selectFile(config: SelectFileConfig): Promise<Result<SelectFileResult, FxError>> {
    throw new Error(`Method selectFile not implemented: ${JSON.stringify(config)}`);
  }

  selectFiles(config: SelectFilesConfig): Promise<Result<SelectFilesResult, FxError>> {
    throw new Error(`Method selectFiles not implemented: ${JSON.stringify(config)}`);
  }

  selectFolder(config: SelectFolderConfig): Promise<Result<SelectFolderResult, FxError>> {
    throw new Error(`Method selectFolder not implemented: ${JSON.stringify(config)}`);
  }

  openUrl(link: string): Promise<Result<boolean, FxError>> {
    throw new Error(`Method openUrl not implemented: ${link}`);
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
    m365TokenProvider: new MockM365TokenProvider(),
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

export function MockSPFxProjectSettings(appName: string): ProjectSettings {
  return {
    appName: appName,
    projectId: uuid.v4(),
    solutionSettings: {
      name: PluginNames.SOLUTION,
      version: "1.0.0",
      hostType: "Azure",
      capabilities: ["SPFx"],
      azureResources: [],
      activeResourcePlugins: [PluginNames.SPFX, PluginNames.LDEBUG, PluginNames.APPST],
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

export function mockSolutionV3getQuestionsAPI(solution: v3.ISolution, sandbox: sinon.SinonSandbox) {
  if (solution.getQuestionsForAddFeature) {
    sandbox.stub(solution, "getQuestionsForAddFeature").resolves(ok(undefined));
  }
  if (solution.getQuestionsForInit) {
    sandbox.stub(solution, "getQuestionsForInit").resolves(ok(undefined));
  }
  if (solution.getQuestionsForProvision) {
    sandbox.stub(solution, "getQuestionsForProvision").resolves(ok(undefined));
  }
  if (solution.getQuestionsForDeploy) {
    sandbox.stub(solution, "getQuestionsForDeploy").resolves(ok(undefined));
  }
  if (solution.getQuestionsForPublish) {
    sandbox.stub(solution, "getQuestionsForPublish").resolves(ok(undefined));
  }
  if (solution.getQuestionsForUserTask) {
    sandbox.stub(solution, "getQuestionsForUserTask").resolves(ok(undefined));
  }
}
