// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  ConfigMap,
  EnvConfig,
  FxError,
  LocalSettings,
  LogLevel,
  LogProvider,
  M365TokenProvider,
  PermissionRequestProvider,
  PluginContext,
  Result,
  TelemetryReporter,
  UserInteraction,
  ok,
} from "@microsoft/teamsfx-api";
import faker from "faker";
import sinon from "sinon";
import {
  LocalSettingsBotKeys,
  LocalSettingsFrontendKeys,
} from "../../../../src/common/localSettingsConstants";
import { DEFAULT_PERMISSION_REQUEST } from "../../../../src/component/constants";
import {
  ConfigKeys,
  ConfigKeysOfOtherPlugin,
  Plugins,
} from "../../../../src/component/resource/aadApp/constants";
import { AppUser } from "../../../../src/component/resource/appManifest/interfaces/appUser";
import { newEnvInfo } from "../../../../src/core/environment";
import { MockUserInteraction } from "../../../core/utils";

const mockPermissionRequestProvider: PermissionRequestProvider = {
  async checkPermissionRequest(): Promise<Result<undefined, FxError>> {
    return ok(undefined);
  },
  async getPermissionRequest(): Promise<Result<string, FxError>> {
    return ok(JSON.stringify(DEFAULT_PERMISSION_REQUEST));
  },
};

const mockLogProvider: LogProvider = {
  async log(logLevel: LogLevel, message: string): Promise<boolean> {
    console.log("Log log");
    console.log(message);
    return true;
  },
  async info(message: string | Array<any>): Promise<boolean> {
    console.log("Log info");
    console.log(message);
    return true;
  },
  async debug(message: string): Promise<boolean> {
    console.log("Log debug");
    console.log(message);
    return true;
  },
  async error(message: string): Promise<boolean> {
    console.log("Log error");
    console.error(message);
    return true;
  },
  async trace(message: string): Promise<boolean> {
    console.log("Log trace");
    console.log(message);
    return true;
  },
  async warning(message: string): Promise<boolean> {
    console.log("Log warning");
    console.log(message);
    return true;
  },
  async fatal(message: string): Promise<boolean> {
    console.log("Log fatal");
    console.log(message);
    return true;
  },
  getLogFilePath(): string {
    return "";
  },
};

const mockUI: UserInteraction = new MockUserInteraction();

const mockTelemetryReporter: TelemetryReporter = {
  async sendTelemetryEvent(
    eventName: string,
    properties?: { [key: string]: string },
    measurements?: { [key: string]: number }
  ) {
    console.log("Telemetry event");
    console.log(eventName);
    console.log(properties);
  },

  async sendTelemetryErrorEvent(
    eventName: string,
    properties?: { [key: string]: string },
    measurements?: { [key: string]: number }
  ) {
    console.log("Telemetry Error");
    console.log(eventName);
    console.log(properties);
  },

  async sendTelemetryException(
    error: Error,
    properties?: { [key: string]: string },
    measurements?: { [key: string]: number }
  ) {
    console.log("Telemetry Exception");
    console.log(error.message);
    console.log(properties);
  },
};

const userList: AppUser = {
  tenantId: faker.datatype.uuid(),
  aadId: faker.datatype.uuid(),
  displayName: "displayName",
  userPrincipalName: "userPrincipalName",
  isAdministrator: true,
};

export class TestHelper {
  // TODO: update type
  static async pluginContext(
    // eslint-disable-next-line @typescript-eslint/ban-types
    config?: object,
    frontend = true,
    bot = true,
    isLocalDebug = false
  ) {
    let domain: string | undefined = undefined;
    let endpoint: string | undefined = undefined;
    if (frontend) {
      domain = faker.internet.domainName();
      endpoint = "https://" + domain;
    }

    let botId: string | undefined = undefined;
    let botEndpoint: string | undefined = undefined;
    if (bot) {
      botId = faker.datatype.uuid();
      botEndpoint = "https://botendpoint" + botId + ".test";
    }

    const configOfOtherPlugins = isLocalDebug
      ? mockConfigOfOtherPluginsLocalDebug(domain, endpoint, botEndpoint, botId)
      : mockConfigOfOtherPluginsProvision(domain, endpoint, botEndpoint, botId);

    const pluginContext: PluginContext = {
      logProvider: mockLogProvider,
      ui: mockUI,
      telemetryReporter: mockTelemetryReporter,
      config: config,
      envInfo: newEnvInfo(undefined, undefined, configOfOtherPlugins),
      projectSettings: {
        appName: "aad-plugin-unit-test",
        solutionSettings: {
          capabilities: ["Tab"],
          hostType: "Azure",
          azureResources: [],
          activeResourcePlugins: ["fx-resource-aad-app-for-teams"],
        },
        components: [{ name: "teams-tab" }, { name: "aad-app" }],
      },
      permissionRequestProvider: mockPermissionRequestProvider,
    } as unknown as PluginContext;

    const localSettings: LocalSettings = {
      teamsApp: new ConfigMap(),
      auth: new ConfigMap(),
    };
    if (frontend) {
      localSettings.frontend = new ConfigMap([
        [LocalSettingsFrontendKeys.TabDomain, domain],
        [LocalSettingsFrontendKeys.TabEndpoint, endpoint],
      ]);
    }
    if (bot) {
      localSettings.bot = new ConfigMap([
        [LocalSettingsBotKeys.BotEndpoint, botEndpoint],
        [LocalSettingsBotKeys.BotId, botId],
      ]);
    }
    pluginContext.localSettings = localSettings;

    return pluginContext;
  }
}

function mockConfigOfOtherPluginsProvision(
  domain: string | undefined,
  endpoint: string | undefined,
  botEndpoint: string | undefined,
  botId: string | undefined
) {
  return new Map([
    [
      Plugins.solution,
      new Map([
        [ConfigKeysOfOtherPlugin.remoteTeamsAppId, faker.datatype.uuid()],
        [ConfigKeysOfOtherPlugin.solutionUserInfo, JSON.stringify(userList)],
      ]),
    ],
    [
      Plugins.frontendHosting,
      new Map([
        [ConfigKeysOfOtherPlugin.frontendHostingDomain, domain],
        [ConfigKeysOfOtherPlugin.frontendHostingEndpoint, endpoint],
      ]),
    ],
    [
      Plugins.teamsBot,
      new Map([
        [ConfigKeysOfOtherPlugin.teamsBotEndpoint, botEndpoint],
        [ConfigKeysOfOtherPlugin.teamsBotId, botId],
      ]),
    ],
  ]);
}

function mockConfigOfOtherPluginsLocalDebug(
  domain: string | undefined,
  endpoint: string | undefined,
  botEndpoint: string | undefined,
  botId: string | undefined
) {
  const result = new Map([
    [
      Plugins.solution,
      new Map([[ConfigKeysOfOtherPlugin.remoteTeamsAppId, faker.datatype.uuid()]]),
    ],
    [Plugins.teamsBot, new Map([[ConfigKeysOfOtherPlugin.teamsBotIdLocal, botId]])],
  ]);
  // local debug config is stored in localSettings in multi-env
  const localDebugConfig = new Map([
    [ConfigKeysOfOtherPlugin.localDebugTabDomain, domain],
    [ConfigKeysOfOtherPlugin.localDebugTabEndpoint, endpoint],
    [ConfigKeysOfOtherPlugin.localDebugBotEndpoint, botEndpoint],
  ]);
  result.set(Plugins.localDebug, localDebugConfig);
  return result;
}

export function mockSkipFlag(context: PluginContext, isLocalDebug = false) {
  if (isLocalDebug) {
    const aadInfo = new ConfigMap();
    aadInfo.set(ConfigKeys.clientId, faker.datatype.uuid());
    aadInfo.set(ConfigKeys.objectId, faker.datatype.uuid());
    aadInfo.set(ConfigKeys.clientSecret, faker.datatype.uuid());
    aadInfo.set(ConfigKeys.oauth2PermissionScopeId, faker.datatype.uuid());
    const localSettings: LocalSettings = {
      teamsApp: new ConfigMap(),
      auth: aadInfo,
    };
    context.localSettings = localSettings;
  } else {
    const config: EnvConfig = {
      auth: {
        clientId: faker.datatype.uuid(),
        objectId: faker.datatype.uuid(),
        clientSecret: faker.datatype.uuid(),
        accessAsUserScopeId: faker.datatype.uuid(),
      },
      manifest: {
        appName: {
          short: "appName",
        },
      },
    };
    context.envInfo.config = config;
    context.envInfo.state.set(Plugins.pluginNameComplex, new Map());
  }
}

export function mockTokenProviderM365(): M365TokenProvider {
  const provider = <M365TokenProvider>{};
  const mockTokenObject = {
    tid: faker.datatype.uuid(),
  };

  provider.getAccessToken = sinon.stub().returns(ok("token"));
  provider.getJsonObject = sinon.stub().returns(ok(mockTokenObject));
  return provider;
}
