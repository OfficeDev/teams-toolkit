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
  Void,
} from "@microsoft/teamsfx-api";
import * as uuid from "uuid";
import {
  DEFAULT_PERMISSION_REQUEST,
  PluginNames,
} from "../../src/plugins/solution/fx-solution/constants";

export class MockSolution implements Solution {
  name = "fx-solution-azure";

  async create(ctx: SolutionContext): Promise<Result<any, FxError>> {
    ctx.projectSettings!.solutionSettings = this.solutionSettings();
    const config = new ConfigMap();
    config.set("create", true);
    ctx.envInfo.profile.set("solution", config);
    return ok(Void);
  }

  solutionSettings(): AzureSolutionSettings {
    return {
      name: this.name,
      version: "1.0.0",
      hostType: "Azure",
      capabilities: ["Tab"],
      azureResources: [],
      activeResourcePlugins: [PluginNames.FE, PluginNames.LDEBUG, PluginNames.AAD, PluginNames.SA],
    } as AzureSolutionSettings;
  }

  async scaffold(ctx: SolutionContext): Promise<Result<any, FxError>> {
    ctx.envInfo.profile.get("solution")!.set("scaffold", true);
    return ok(Void);
  }

  async provision(ctx: SolutionContext): Promise<Result<any, FxError>> {
    ctx.envInfo.profile.get("solution")!.set("provision", true);
    return ok(Void);
  }

  async deploy(ctx: SolutionContext): Promise<Result<any, FxError>> {
    ctx.envInfo.profile.get("solution")!.set("deploy", true);
    return ok(Void);
  }

  async publish(ctx: SolutionContext): Promise<Result<any, FxError>> {
    ctx.envInfo.profile.get("solution")!.set("publish", true);
    return ok(Void);
  }

  async localDebug(ctx: SolutionContext): Promise<Result<any, FxError>> {
    ctx.envInfo.profile.get("solution")!.set("localDebug", true);
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
    ctx.envInfo.profile.get("solution")!.set("executeUserTask", true);
    return ok(Void);
  }

  async migrate(ctx: SolutionContext): Promise<Result<any, FxError>> {
    ctx.projectSettings!.solutionSettings = this.solutionSettings();
    const config = new ConfigMap();
    ctx.envInfo.profile.set("solution", config);
    return ok(Void);
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
      activeResourcePlugins: [PluginNames.FE, PluginNames.LDEBUG, PluginNames.AAD, PluginNames.SA],
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

export function MockEnvDefaultJson(): Json {
  return {
    solution: {
      programmingLanguage: "javascript",
      teamsAppTenantId: "{{solution.teamsAppTenantId}}",
    },
    "fx-resource-aad-app-for-teams": {
      local_clientId: "{{fx-resource-aad-app-for-teams.local_clientId}}",
      local_clientSecret: "{{fx-resource-aad-app-for-teams.local_clientSecret}}",
    },
    "fx-resource-function": {
      defaultFunctionName: "getUserProfile",
    },
    "fx-resource-local-debug": {
      trustDevCert: "{{fx-resource-local-debug.trustDevCert}}",
      localFunctionEndpoint: "{{fx-resource-local-debug.localFunctionEndpoint}}",
    },
    "fx-resource-simple-auth": {
      filePath: "{{fx-resource-simple-auth.filePath}}",
      environmentVariableParams: "{{fx-resource-simple-auth.environmentVariableParams}}",
    },
  };
}

export function MockSettingJson(appName: string): Json {
  return {
    appName: appName,
    projectId: "eb0243adb7-c44b7-46f4d6-9d9449-277daed20a07",
    solutionSettings: {
      name: "fx-solution-azure",
      version: "1.0.0",
      hostType: "Azure",
      capabilities: ["Tab"],
      azureResources: ["function"],
      activeResourcePlugins: [
        "fx-resource-frontend-hosting",
        "fx-resource-aad-app-for-teams",
        "fx-resource-function",
        "fx-resource-local-debug",
        "fx-resource-appstudio",
        "fx-resource-simple-auth",
      ],
    },
  };
}

export function MockDefaultUserData(): Record<string, string> {
  return {
    "solution.localDebugTeamsAppId": "fdef4257f878-bdcb-498b-ac85-137ef8d13723",
    "solution.teamsAppTenantId": "72f988bf-86f1-41af-91ab-2d7cd011db47",
    "fx-resource-aad-app-for-teams.local_clientId": "d170bea7-c0e6-4755-b569-6e5534fa1951",
    "fx-resource-aad-app-for-teams.local_clientSecret":
      "crypto_67fc9665b8f0de5fdee63f0ac39549783bf729c467d6c0e73de4ad79c855d254270e5a45b1b167694b2af56156961a2b5537580dc2344f43071bafc4bf0fbb905f5c7cf8f2170924bba8a66bbe1bb0f59ee92e5d0ae3498d31c8f0bdd5933cf405a8da600ecf5a9acd30165cae3d4ecb33dd506e0e9327935540ae012ac959b4be464d91ee",
    "fx-resource-simple-auth.filePath": "plugins\resourcesimpleauthSimpleAuth.zip",
    "fx-resource-simple-auth.environmentVariableParams":
      "crypto_2dee780c65c1ead7bc60491c2f8a82560216b9791e72bfd22051c02aa3f7a2f68a7765c4540345bd597124312ef9a7b264c9400a173b6ef4debed3bf57cc22e98ce436dbcf058abe4979dee884fbf77052764d17ff67dfe187a4f1fe57c701ccf9ef3b9eff08ba0df8ebb4e469d81fa43f18a95d83db0575311e688a3eb62f49772e08aa6a8c775542bcc50084790689956dfd5f0187644527c04c325f88825e57a46673c6c2c77d250692f147924cbb8fe8eccba3e3618005a2fcaec9d63cec06f83da386e6cef3f11a4362f73987d260295e535dfbea5368e48b1a0c8da81844bf5d84e637dd219c2393028f1dea941c117ab295684c3b49d17e8bc0ea1ddf030966adf5481a69489ad6cfac62250660209c26162b7b33fd9445cf7d2fc077b4c93c0604931c8a00aef3a8c2885b53d10ff5290469c7669e2ca3609721985d44c856dcf0ab2eb251c389ad03c2c3810e43005703d967abd07471dc1813e6e8404cace15eaaf8502df0beea714af994dee198e3a45d5720480a30dfc0f7cad0c698e5ea008722b8eb56128ddba261706cc61eeaa43d7799841a53de5feeb2c1f80797f2230348d92336dd9fe92b85fac3f0e4d20a892791ff0c2abe0a44d1cb00b9977aaa64eca236de1fbd220e901d7e6db9c3e856944344c7c3e4bf77999b171ed1d3c435e349d7bcb1fc0c654f5ae4c5dcbc87d308ebc84f080a96e0c51a4e1f582fe36a2b3acd2b532c94ba2d4efdb2018ebff1575f912eb7db42bc3c07996f4118077c2650c151bbc5f967f88da4129851d3ee59939ab2a440aadbdfa4a64550cc4ee23f4f3a7a8fc06e16c7d7962c682036d12cbc9b406fc8ad6755783a136f178075485bf5a6c7c5846216",
    "fx-resource-local-debug.trustDevCert": "true",
  };
}

export function MockManifest(): Json {
  return {
    $schema:
      "https://developer.microsoft.com/en-us/json-schemas/teams/v1.9/MicrosoftTeams.schema.json",
    manifestVersion: "1.9",
    version: "1.0.0",
    id: "{appid}",
    packageName: "com.microsoft.teams.extension",
    developer: {
      name: "Teams App, Inc.",
      websiteUrl: "{baseUrl}",
      privacyUrl: "{baseUrl}/index.html#/privacy",
      termsOfUseUrl: "{baseUrl}/index.html#/termsofuse",
    },
    icons: {
      color: "color.png",
      outline: "outline.png",
    },
    name: {
      short: "app914",
      full: "This field is not used",
    },
    description: {
      short: "Short description of app914.",
      full: "Full description of app914.",
    },
    accentColor: "#FFFFFF",
    bots: [],
    composeExtensions: [],
    configurableTabs: [
      {
        configurationUrl: "{baseUrl}/index.html#/config",
        canUpdateConfiguration: true,
        scopes: ["team", "groupchat"],
      },
    ],
    staticTabs: [
      {
        entityId: "index",
        name: "Personal Tab",
        contentUrl: "{baseUrl}/index.html#/tab",
        websiteUrl: "{baseUrl}/index.html#/tab",
        scopes: ["personal"],
      },
    ],
    permissions: ["identity", "messageTeamMembers"],
    validDomains: [],
    webApplicationInfo: {
      id: "{appClientId}",
      resource: "{webApplicationInfoResource}",
    },
  };
}

export function MockSub(): Json {
  return {
    subscriptionId: "d0a3dd39-a129-43cf-a31f-6871172164661",
    subscriptionName: "Visual Studio Enterprise 订阅1",
    tenantId: "7595292a-4fa2-4c76-b96a-a21f11df1d8w1",
  };
}
