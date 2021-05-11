// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import faker from "faker";
import {
  PluginContext,
  DialogMsg,
  IProgressHandler,
  TelemetryReporter,
  Dialog,
  LogProvider,
  LogLevel,
  AppStudioTokenProvider,
  GraphTokenProvider,
} from "@microsoft/teamsfx-api";
import sinon from "sinon";
import { ConfigKeys, ConfigKeysOfOtherPlugin, Plugins } from "../../../../src/plugins/resource/aad/constants";
import jwt_decode from "jwt-decode";
import { Utils } from "../../../../src/plugins/resource/aad/utils/common";

const permissions = "[{\"resource\": \"Microsoft Graph\",\"delegated\": [\"User.Read\"],\"application\":[]}]";
const permissionsWrong =
  "[{\"resource\": \"Microsoft Graph\",\"delegated\": [\"User.ReadData\"],\"application\":[]}]";

const mockLogProvider: LogProvider = {
  async log(logLevel: LogLevel, message: string): Promise<boolean> {
    console.log("Log log");
    console.log(message);
    return true;
  },
  async info(message: string): Promise<boolean> {
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
};

const mockDialogProvider: Dialog = {
  async communicate(msg: DialogMsg): Promise<DialogMsg> {
    console.log("Dialog");
    console.log(msg.content);
    return msg;
  },
  createProgressBar(title: string, totalSteps: number): IProgressHandler {
    console.log(title + totalSteps);
    const progress: IProgressHandler = {
      async start(detail?: string): Promise<void> {
        console.log("progress start");
        console.log(detail);
      },
      async next(detail?: string): Promise<void> {
        console.log("progress");
        console.log(detail);
      },
      async end(): Promise<void> {
        console.log("progress end");
      },
    };
    return progress;
  },
};

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

export class TestHelper {
  // TODO: update type
  static async pluginContext(
    // eslint-disable-next-line @typescript-eslint/ban-types
    config?: object,
    frontend = true,
    bot = true,
    isLocalDebug = false,
    wrongPermission = false
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
      botId = faker.random.uuid();
      botEndpoint = "https://botendpoint" + botId + ".test";
    }

    const configOfOtherPlugins = isLocalDebug
      ? mockConfigOfOtherPluginsLocalDebug(
          domain,
          endpoint,
          botEndpoint,
          botId,
          wrongPermission
        )
      : mockConfigOfOtherPluginsProvision(
          domain,
          endpoint,
          botEndpoint,
          botId,
          wrongPermission
        );

    const pluginContext = ({
      logProvider: mockLogProvider,
      dialog: mockDialogProvider,
      telemetryReporter: mockTelemetryReporter,
      config: config,
      configOfOtherPlugins: configOfOtherPlugins,
      app: {
        name: {
          short: "aad-plugin-unit-test",
        },
      },
    } as unknown) as PluginContext;

    return pluginContext;
  }
}

function mockConfigOfOtherPluginsProvision(
  domain: string | undefined,
  endpoint: string | undefined,
  botEndpoint: string | undefined,
  botId: string | undefined,
  wrongPermission = false
) {
  return new Map([
    [
      Plugins.solution,
      new Map([
        [
          ConfigKeysOfOtherPlugin.solutionPermissionRequest,
          wrongPermission ? permissionsWrong : permissions,
        ],
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
  botId: string | undefined,
  wrongPermission = false
) {
  return new Map([
    [
      Plugins.solution,
      new Map([
        [
          ConfigKeysOfOtherPlugin.solutionPermissionRequest,
          wrongPermission ? permissionsWrong : permissions,
        ],
      ]),
    ],
    [
      Plugins.localDebug,
      new Map([
        [ConfigKeysOfOtherPlugin.localDebugTabDomain, domain],
        [ConfigKeysOfOtherPlugin.localDebugTabEndpoint, endpoint],
        [ConfigKeysOfOtherPlugin.localDebugBotEndpoint, botEndpoint],
      ]),
    ],
    [Plugins.teamsBot, new Map([[ConfigKeysOfOtherPlugin.teamsBotIdLocal, botId]])],
  ]);
}

export function mockProvisionResult(
  context: PluginContext,
  isLocalDebug = false
) {
  context.config.set(
    Utils.addLocalDebugPrefix(isLocalDebug, ConfigKeys.clientId),
    faker.random.uuid()
  );
  context.config.set(
    Utils.addLocalDebugPrefix(isLocalDebug, ConfigKeys.objectId),
    faker.random.uuid()
  );
  context.config.set(
    Utils.addLocalDebugPrefix(isLocalDebug, ConfigKeys.clientSecret),
    faker.random.uuid()
  );
}

export function mockTokenProvider(): AppStudioTokenProvider {
  const provider = <AppStudioTokenProvider>{};
  const mockTokenObject = {
    tid: faker.random.uuid(),
  };

  provider.getAccessToken = sinon.stub().returns("token");
  provider.getJsonObject = sinon.stub().returns(mockTokenObject);
  return provider;
}

export function mockTokenProviderGraph(): GraphTokenProvider {
  const provider = <GraphTokenProvider>{};
  const mockTokenObject = {
    tid: faker.random.uuid(),
  };

  provider.getAccessToken = sinon.stub().returns("token");
  provider.getJsonObject = sinon.stub().returns(mockTokenObject);
  return provider;
}

export function mockTokenProviderAzure(token: string): AppStudioTokenProvider {
  const provider = <AppStudioTokenProvider>{};
  const tokenObject = jwt_decode(token);

  provider.getAccessToken = sinon.stub().returns(token);
  provider.getJsonObject = sinon.stub().returns(tokenObject);
  return provider;
}

export function mockTokenProviderAzureGraph(token: string): GraphTokenProvider {
  const provider = <GraphTokenProvider>{};
  const tokenObject = jwt_decode(token);

  provider.getAccessToken = sinon.stub().returns(token);
  provider.getJsonObject = sinon.stub().returns(tokenObject);
  return provider;
}
