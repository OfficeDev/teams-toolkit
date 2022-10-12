// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
  PluginContext,
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
  FxError,
  Colors,
  M365TokenProvider,
} from "@microsoft/teamsfx-api";
import { SPFXQuestionNames } from "../../../../src/component/resource/spfx/utils/questions";
import faker from "faker";
import sinon from "sinon";
import { newEnvInfo } from "../../../../src/core/environment";

export class TestHelper {
  static getFakePluginContext(
    appName: string,
    testFolder: string,
    framework: string | undefined,
    webpartName?: string
  ): PluginContext {
    const pluginContext = {
      projectSettings: {
        appName: appName,
      },
      root: testFolder,
      m365TokenProvider: mockM365TokenProvider(),
      answers: {},
    } as PluginContext;
    pluginContext.answers![SPFXQuestionNames.webpart_name] = webpartName
      ? webpartName
      : "helloworld";
    pluginContext.answers![SPFXQuestionNames.webpart_desp] = "test";
    pluginContext.answers![SPFXQuestionNames.framework_type] = framework;
    pluginContext.envInfo = newEnvInfo("test", undefined, new Map<string, Map<string, string>>());
    return pluginContext;
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
    return ok("OK");
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

export function mockM365TokenProvider(): M365TokenProvider {
  const provider = <M365TokenProvider>{};
  const mockTokenObject = {
    tid: faker.datatype.uuid(),
  };

  provider.getAccessToken = sinon.stub().returns(ok("token"));
  provider.getJsonObject = sinon.stub().returns(ok(mockTokenObject));
  return provider;
}
