import { TokenCredentialsBase } from "@azure/ms-rest-nodeauth";
import { TokenResponse } from "adal-node";
import { TokenCredential } from "@azure/core-http";
import {
  v2,
  FxError,
  ok,
  PluginContext,
  Result,
  Void,
  Plugin,
  CryptoProvider,
  LogProvider,
  ProjectSettings,
  TelemetryReporter,
  UserInteraction,
  Colors,
  LogLevel,
  InputTextConfig,
  InputTextResult,
  IProgressHandler,
  MultiSelectConfig,
  MultiSelectResult,
  RunnableTask,
  SelectFileConfig,
  SelectFileResult,
  SelectFilesConfig,
  SelectFilesResult,
  SelectFolderConfig,
  SelectFolderResult,
  SingleSelectConfig,
  SingleSelectResult,
  TaskConfig,
  AzureAccountProvider,
  SubscriptionInfo,
  AppStudioTokenProvider,
  Inputs,
  PermissionRequestProvider,
  GraphTokenProvider,
  SharepointTokenProvider,
} from "@microsoft/teamsfx-api";
import { MockPermissionRequestProvider } from "../../core/utils";
import { ArmTemplateResult } from "../../../src/common/armInterface";

export const validManifest = {
  $schema:
    "https://developer.microsoft.com/en-us/json-schemas/teams/v1.11/MicrosoftTeams.schema.json",
  manifestVersion: "1.11",
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
    short: "MyApp",
    full: "This field is not used",
  },
  description: {
    short: "Short description of {appName}.",
    full: "Full description of {appName}.",
  },
  accentColor: "#FFFFFF",
  bots: [],
  composeExtensions: [],
  configurableTabs: [],
  staticTabs: [],
  permissions: ["identity", "messageTeamMembers"],
  validDomains: [],
  webApplicationInfo: {
    id: "{appClientId}",
    resource: "{webApplicationInfoResource}",
  },
};

export function mockPublishThatAlwaysSucceed(plugin: Plugin) {
  plugin.publish = async function (_ctx: PluginContext): Promise<Result<any, FxError>> {
    return ok(Void);
  };
}

export function mockV2PublishThatAlwaysSucceed(plugin: v2.ResourcePlugin): void {
  plugin.publishApplication = async function (): Promise<Result<Void, FxError>> {
    return ok(Void);
  };
}

export function mockScaffoldCodeThatAlwaysSucceeds(plugin: v2.ResourcePlugin): void {
  plugin.scaffoldSourceCode = async function (): Promise<
    Result<{ output: Record<string, string> }, FxError>
  > {
    return ok({ output: {} });
  };
}

export function mockExecuteUserTaskThatAlwaysSucceeds(plugin: v2.ResourcePlugin): void {
  plugin.executeUserTask = async function (): Promise<Result<unknown, FxError>> {
    return ok(Void);
  };
}

export function mockedFehostScaffoldArmResult(): ArmTemplateResult {
  const res: ArmTemplateResult = {
    Provision: {
      Orchestration:
        "Mocked frontend hosting module content. Module path: {{PluginOutput.fx-resource-frontend-hosting.Provision.frontendHostingProvision.ProvisionPath}}. Variable: {{PluginOutput.fx-resource-simple-auth.References.endpoint}}",
      Modules: {
        frontendHostingProvision: "Mocked frontend hosting provision module content",
      },
      Reference: {
        endpoint: "Mocked front end host endpoint",
      },
    },
    Configuration: {
      Orchestration: "",
    },
    Parameters: {
      FrontendParameter: "FrontendParameterValue",
    },
  };
  return res;
}

export function mockedSimpleAuthScaffoldArmResult(): ArmTemplateResult {
  const res: ArmTemplateResult = {
    Provision: {
      Orchestration:
        "Mocked simple auth module content. Module path: {{PluginOutput.fx-resource-simple-auth.Provision.simpleAuthProvision.ProvisionPath}}. Variable: {{PluginOutput.fx-resource-frontend-hosting.References.endpoint}}",
      Modules: {
        simpleAuthProvision: "Mocked simple auth provision module content",
      },
      Reference: {
        endpoint: "Mocked simple auth endpoint",
      },
    },
    Configuration: {
      Orchestration: "",
    },
    Parameters: {
      SimpleAuthParameter: "SimpleAuthParameterValue",
    },
  };
  return res;
}

export function mockedSimpleAuthUpdateArmResult(): ArmTemplateResult {
  const res: ArmTemplateResult = {
    Provision: {
      Reference: {
        endpoint: "Mocked simple auth endpoint",
      },
    },
  };
  return res;
}

export function mockedAadScaffoldArmResult(): ArmTemplateResult {
  const res: ArmTemplateResult = {
    Provision: {
      Orchestration: "",
    },
    Configuration: {
      Orchestration: "",
    },
  };
  return res;
}

export function mockedBotArmTemplateResultFunc(): ArmTemplateResult {
  const res: ArmTemplateResult = {
    Provision: {
      Orchestration:
        "Bot Provision module content content and outputs, Module path: {{PluginOutput.fx-resource-bot.Provision.bot.ProvisionPath}}.",
      Modules: {
        bot: "Mocked bot Provision content. simple auth endpoint: {{PluginOutput.fx-resource-simple-auth.References.endpoint}}",
      },
      Reference: {
        URI: "Mocked bot URL",
        webAppEndpoint: "Mock web app end point",
      },
    },
    Configuration: {
      Orchestration:
        "Mocked bot Orchestration content, Module path: {{PluginOutput.fx-resource-bot.Configuration.bot.ConfigPath}}",
      Modules: {
        bot: "Mocked bot Configuration content, bot webAppEndpoint: {{PluginOutput.fx-resource-bot.References.webAppEndpoint}}",
      },
    },
    Parameters: {
      BotParameter: "BotParameterValue",
    },
  };
  return res;
}

export class MockedLogProvider implements LogProvider {
  async info(message: { content: string; color: Colors }[] | string | any): Promise<boolean> {
    return true;
  }
  async log(logLevel: LogLevel, message: string): Promise<boolean> {
    return true;
  }
  async trace(message: string): Promise<boolean> {
    return true;
  }
  async debug(message: string): Promise<boolean> {
    return true;
  }

  async warning(message: string): Promise<boolean> {
    return true;
  }
  async error(message: string): Promise<boolean> {
    return true;
  }
  async fatal(message: string): Promise<boolean> {
    return true;
  }
}

export class MockedTelemetryReporter implements TelemetryReporter {
  sendTelemetryEvent(
    eventName: string,
    properties?: { [key: string]: string },
    measurements?: { [key: string]: number }
  ): void {
    return;
  }
  sendTelemetryErrorEvent(
    eventName: string,
    properties?: { [key: string]: string },
    measurements?: { [key: string]: number },
    errorProps?: string[]
  ): void {
    return;
  }
  sendTelemetryException(
    error: Error,
    properties?: { [key: string]: string },
    measurements?: { [key: string]: number }
  ): void {
    return;
  }
}

export class MockedCryptoProvider implements CryptoProvider {
  encrypt(plaintext: string): Result<string, FxError> {
    return ok("");
  }
  decrypt(ciphertext: string): Result<string, FxError> {
    return ok("");
  }
}

export class MockedUserInteraction implements UserInteraction {
  async selectOption(config: SingleSelectConfig): Promise<Result<SingleSelectResult, FxError>> {
    return ok({ type: "success" });
  }

  async selectOptions(config: MultiSelectConfig): Promise<Result<MultiSelectResult, FxError>> {
    return ok({ type: "success" });
  }

  async inputText(config: InputTextConfig): Promise<Result<InputTextResult, FxError>> {
    return ok({ type: "success" });
  }

  async selectFile(config: SelectFileConfig): Promise<Result<SelectFileResult, FxError>> {
    return ok({ type: "success" });
  }

  async selectFiles(config: SelectFilesConfig): Promise<Result<SelectFilesResult, FxError>> {
    return ok({ type: "success" });
  }

  async selectFolder(config: SelectFolderConfig): Promise<Result<SelectFolderResult, FxError>> {
    return ok({ type: "success" });
  }

  async openUrl(link: string): Promise<Result<boolean, FxError>> {
    return ok(true);
  }

  async showMessage(
    level: "info" | "warn" | "error",
    message: string | { content: string; color: Colors }[],
    modal: boolean,
    ...items: string[]
  ): Promise<Result<string, FxError>> {
    return ok("");
  }

  createProgressBar(title: string, totalSteps: number): IProgressHandler {
    return {
      start: async (detail?: string) => {
        return;
      },
      end: async (success: boolean) => {
        return;
      },
      next: async (detail?: string) => {
        return;
      },
    };
  }

  async runWithProgress<T>(
    task: RunnableTask<T>,
    config: TaskConfig,
    ...args: any
  ): Promise<Result<T, FxError>> {
    return task.run(...args);
  }
}

export class MockedV2Context implements v2.Context {
  userInteraction: UserInteraction;
  logProvider: LogProvider;
  telemetryReporter: TelemetryReporter;
  cryptoProvider: CryptoProvider;
  projectSetting: ProjectSettings;
  permissionRequestProvider: PermissionRequestProvider;

  constructor(settings: ProjectSettings) {
    this.userInteraction = new MockedUserInteraction();
    this.logProvider = new MockedLogProvider();
    this.telemetryReporter = new MockedTelemetryReporter();
    this.cryptoProvider = new MockedCryptoProvider();
    this.projectSetting = settings;
    this.permissionRequestProvider = new MockPermissionRequestProvider();
  }
}

class MockedTokenCredentials extends TokenCredentialsBase {
  public async getToken(): Promise<TokenResponse> {
    return {
      tokenType: "Bearer",
      expiresIn: Date.now(),
      expiresOn: new Date(),
      resource: "mock",
      accessToken: "mock",
    };
  }
}

export class MockedAppStudioTokenProvider implements AppStudioTokenProvider {
  async getAccessToken(showDialog?: boolean): Promise<string> {
    return "someFakeToken";
  }
  async getJsonObject(showDialog?: boolean): Promise<Record<string, unknown>> {
    return {
      tid: "222",
    };
  }
  signout(): Promise<boolean> {
    throw new Error("Method not implemented.");
  }
  setStatusChangeCallback(
    statusChange: (
      status: string,
      token?: string,
      accountInfo?: Record<string, unknown>
    ) => Promise<void>
  ): Promise<boolean> {
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
}

export class MockedGraphTokenProvider implements GraphTokenProvider {
  async getAccessToken(showDialog?: boolean): Promise<string> {
    return "some token";
  }
  async getJsonObject(showDialog?: boolean): Promise<Record<string, unknown>> {
    return {};
  }
  async signout(): Promise<boolean> {
    return true;
  }
  async setStatusChangeMap(
    name: string,
    statusChange: (
      status: string,
      token?: string,
      accountInfo?: Record<string, unknown>
    ) => Promise<void>,
    immediateCall?: boolean
  ): Promise<boolean> {
    return true;
  }
  async removeStatusChangeMap(name: string): Promise<boolean> {
    return true;
  }
}

export class MockedAppStudioProvider implements AppStudioTokenProvider {
  async getAccessToken(showDialog?: boolean): Promise<string> {
    return "fakeToken";
  }
  async getJsonObject(showDialog?: boolean): Promise<Record<string, unknown>> {
    return {};
  }
  async signout(): Promise<boolean> {
    return true;
  }
  async setStatusChangeMap(
    name: string,
    statusChange: (
      status: string,
      token?: string,
      accountInfo?: Record<string, unknown>
    ) => Promise<void>,
    immediateCall?: boolean
  ): Promise<boolean> {
    return true;
  }
  async removeStatusChangeMap(name: string): Promise<boolean> {
    return true;
  }
}

export class MockedSharepointProvider implements SharepointTokenProvider {
  async getAccessToken(showDialog?: boolean): Promise<string> {
    return "fakeToken";
  }
  async getJsonObject(showDialog?: boolean): Promise<Record<string, unknown>> {
    return {};
  }
  async setStatusChangeMap(
    name: string,
    statusChange: (
      status: string,
      token?: string,
      accountInfo?: Record<string, unknown>
    ) => Promise<void>,
    immediateCall?: boolean
  ): Promise<boolean> {
    return true;
  }
  async removeStatusChangeMap(name: string): Promise<boolean> {
    return true;
  }
}

export class MockedAzureAccountProvider implements AzureAccountProvider {
  async getAccountCredentialAsync(
    showDialog?: boolean,
    tenantId?: string
  ): Promise<TokenCredentialsBase> {
    return new MockedTokenCredentials("mock", "mock");
  }

  async getIdentityCredentialAsync(showDialog?: boolean): Promise<TokenCredential | undefined> {
    return undefined;
  }

  async signout(): Promise<boolean> {
    return true;
  }
  async setStatusChangeMap(
    name: string,
    statusChange: (
      status: string,
      token?: string,
      accountInfo?: Record<string, unknown>
    ) => Promise<void>,
    immediateCall?: boolean
  ): Promise<boolean> {
    return true;
  }
  async removeStatusChangeMap(name: string): Promise<boolean> {
    return true;
  }
  async getJsonObject(showDialog?: boolean): Promise<Record<string, unknown>> {
    return {};
  }
  async listSubscriptions(): Promise<SubscriptionInfo[]> {
    return [];
  }
  async setSubscription(subscriptionId: string): Promise<void> {}
  getAccountInfo(): Record<string, string> {
    return {};
  }
  async getSelectedSubscription(triggerUI?: boolean): Promise<SubscriptionInfo> {
    return {
      subscriptionId: "",
      subscriptionName: "",
      tenantId: "",
    };
  }
}
