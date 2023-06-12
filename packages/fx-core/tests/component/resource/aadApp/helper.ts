// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  ConfigMap,
  FxError,
  LocalSettings,
  LogLevel,
  LogProvider,
  PermissionRequestProvider,
  PluginContext,
  Result,
  TelemetryReporter,
  UserInteraction,
  ok,
} from "@microsoft/teamsfx-api";
import faker from "faker";
import {
  LocalSettingsBotKeys,
  LocalSettingsFrontendKeys,
} from "../../../../src/common/localSettingsConstants";
import { DEFAULT_PERMISSION_REQUEST } from "../../../../src/component/constants";
import { AppUser } from "../../../../src/component/resource/appManifest/interfaces/appUser";
import { newEnvInfo } from "../../../../src/core/environment";
import { MockUserInteraction } from "../../../core/utils";

const permissions = '[{"resource": "Microsoft Graph","delegated": ["User.Read"],"application":[]}]';
const permissionsWrong =
  '[{"resource": "Microsoft Graph","delegated": ["User.ReadData"],"application":[]}]';

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

    const configOfOtherPlugins = new Map();

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
