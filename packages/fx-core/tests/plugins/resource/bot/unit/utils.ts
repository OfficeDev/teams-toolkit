// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
  ConfigMap,
  LogProvider,
  PluginContext,
  LogLevel,
  Platform,
  GraphTokenProvider,
} from "@microsoft/teamsfx-api";
import { ResourceGroups, ResourceManagementClientContext } from "@azure/arm-resources";
import { ServiceClientCredentials } from "@azure/ms-rest-js";
import { TokenCredentialsBase } from "@azure/ms-rest-nodeauth";
import { TokenResponse } from "adal-node";

import * as utils from "../../../../../src/plugins/resource/bot/utils/common";
import {
  PluginAAD,
  PluginSolution,
  PluginLocalDebug,
} from "../../../../../src/plugins/resource/bot/resources/strings";
import {
  Colors,
  FxError,
  InputTextConfig,
  InputTextResult,
  IProgressHandler,
  MultiSelectConfig,
  MultiSelectResult,
  ok,
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
  TaskConfig,
  UserInteraction,
} from "@microsoft/teamsfx-api";
import { LocalCrypto } from "../../../../../src/core/crypto";
import faker from "faker";
import sinon from "sinon";

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
    return ok("default");
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

export function generateFakeDialog(): UserInteraction {
  return new MockUserInteraction();
}
export function generateFakeServiceClientCredentials(): ServiceClientCredentials {
  return {
    signRequest: (anything) => {
      return Promise.resolve(anything);
    },
  };
}

export function generateFakeLogProvider(): LogProvider {
  return {
    info: (message: string | Array<any>) => {
      return Promise.resolve(true);
    },
    log: (logLevel: LogLevel, message: string) => {
      return Promise.resolve(true);
    },
    trace: (message: string) => {
      return Promise.resolve(true);
    },
    debug: (message: string) => {
      return Promise.resolve(true);
    },
    error: (message: string) => {
      return Promise.resolve(true);
    },
    warning: (message: string) => {
      return Promise.resolve(true);
    },
    fatal: (message: string) => {
      return Promise.resolve(true);
    },
  };
}

class FakeTokenCredentials extends TokenCredentialsBase {
  public async getToken(): Promise<TokenResponse> {
    return {
      tokenType: "Bearer",
      expiresIn: Date.now(),
      expiresOn: new Date(),
      resource: "anything",
      accessToken: "anything",
    };
  }
}
export function generateFakeTokenCredentialsBase(): TokenCredentialsBase {
  return new FakeTokenCredentials("anything", "anything");
}

export async function ensureResourceGroup(
  rgName: string,
  creds: ServiceClientCredentials,
  subs: string
): Promise<void> {
  const client = new ResourceGroups(new ResourceManagementClientContext(creds, subs));
  const res = await client.createOrUpdate(rgName, {
    location: "Central US",
  });
  if (!res || (res._response.status !== 201 && res._response.status !== 200)) {
    throw new Error(`Fail to ensure resource group with name: ${rgName}`);
  }
}

export function newPluginContext(): PluginContext {
  return {
    root: "",
    envInfo: newEnvInfo(
      undefined,
      undefined,
      new Map<string, Map<string, string>>([
        [
          PluginAAD.PLUGIN_NAME,
          new Map<string, string>([
            [PluginAAD.CLIENT_ID, utils.genUUID()],
            [PluginAAD.CLIENT_SECRET, utils.genUUID()],
            [PluginAAD.APPLICATION_ID_URIS, "anything"],
            [PluginAAD.CLIENT_ID, "anything"],
            [PluginAAD.CLIENT_SECRET, "anything"],
          ]),
        ],
        [
          PluginSolution.PLUGIN_NAME,
          new Map<string, string>([
            [PluginSolution.LOCATION, "Central US"],
            [PluginSolution.RESOURCE_GROUP_NAME, "anything"],
            [PluginSolution.M365_TENANT_ID, "anything"],
            [PluginSolution.SUBSCRIPTION_ID, "subscriptionId"],
          ]),
        ],
        [
          PluginLocalDebug.PLUGIN_NAME,
          new Map<string, string>([[PluginLocalDebug.LOCAL_BOT_ENDPOINT, "anything"]]),
        ],
      ])
    ),
    config: new ConfigMap(),
    answers: { platform: Platform.VSCode },
    projectSettings: {
      appName: "My App",
      projectId: utils.genUUID(),
      solutionSettings: {
        name: "AnyName",
        version: "0.0.1",
        capabilities: ["Bot"],
      },
    },
    cryptoProvider: new LocalCrypto(""),
    graphTokenProvider: mockTokenProviderGraph(),
    appStudioToken: {
      getAccessToken: (showDialog?: boolean) => {
        return Promise.resolve(undefined);
      },
      getJsonObject: (showDialog?: boolean) => {
        return Promise.resolve(undefined);
      },
      signout: () => {
        return Promise.resolve(true);
      },
      setStatusChangeMap: (name: string, anything) => {
        return Promise.resolve(true);
      },
      removeStatusChangeMap: (name: string) => {
        return Promise.resolve(true);
      },
    },
    azureAccountProvider: {
      getAccountCredentialAsync: (showDialog?: boolean) => {
        return Promise.resolve(undefined);
      },
      getIdentityCredentialAsync: (showDialog?: boolean) => {
        return Promise.resolve(undefined);
      },
      signout: () => {
        return Promise.resolve(true);
      },
      setStatusChangeMap: (name: string, anything) => {
        return Promise.resolve(true);
      },
      removeStatusChangeMap: (name: string) => {
        return Promise.resolve(true);
      },
      getJsonObject: (showDialog?: boolean) => {
        return Promise.resolve(undefined);
      },
      setSubscription: (subsId: string) => {
        return Promise.resolve();
      },
      listSubscriptions: () => {
        return Promise.resolve([]);
      },
      getAccountInfo: () => {
        return {};
      },
      getSelectedSubscription: () => {
        return Promise.resolve({
          subscriptionId: "subscriptionId",
          tenantId: "tenantId",
          subscriptionName: "subscriptionName",
        });
      },
    },
    localSettings: {
      bot: new ConfigMap(),
      teamsApp: new ConfigMap(),
      auth: new ConfigMap(),
      frontend: new ConfigMap(),
      backend: new ConfigMap(),
    },
  };
}

export function mockTokenProviderGraph(): GraphTokenProvider {
  const provider = <GraphTokenProvider>{};
  const mockTokenObject = {
    tid: faker.datatype.uuid(),
  };

  provider.getAccessToken = sinon.stub().returns("token");
  provider.getJsonObject = sinon.stub().returns(mockTokenObject);
  return provider;
}

export function genTomorrow(): number {
  return Date.now() + 24 * 60 * 60 * 1000;
}

export function genYesterday(): number {
  return Date.now() - 24 * 60 * 60 * 1000;
}
