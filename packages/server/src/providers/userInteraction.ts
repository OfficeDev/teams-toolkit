// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { MessageConnection } from "vscode-jsonrpc";

import {
  Colors,
  FxError,
  InputTextConfig,
  InputTextResult,
  IProgressHandler,
  MultiSelectConfig,
  MultiSelectResult,
  NotImplementedError,
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

import { RequestTypes } from "../apis";
import { convertUIConfigToJson, getResponseWithErrorHandling } from "../utils";

export default class ServerUserInteraction implements UserInteraction {
  private readonly connection: MessageConnection;

  constructor(connection: MessageConnection) {
    this.connection = connection;
  }

  async selectOption(config: SingleSelectConfig): Promise<Result<SingleSelectResult, FxError>> {
    const promise = this.connection.sendRequest(
      RequestTypes.ui.selectOption,
      convertUIConfigToJson(config)
    );
    return getResponseWithErrorHandling(promise);
  }

  async selectOptions(config: MultiSelectConfig): Promise<Result<MultiSelectResult, FxError>> {
    const promise = this.connection.sendRequest(
      RequestTypes.ui.selectOptions,
      convertUIConfigToJson(config)
    );
    return getResponseWithErrorHandling(promise);
  }

  async inputText(config: InputTextConfig): Promise<Result<InputTextResult, FxError>> {
    const promise = this.connection.sendRequest(
      RequestTypes.ui.inputText,
      convertUIConfigToJson(config)
    );
    return getResponseWithErrorHandling(promise);
  }

  async openUrl(link: string): Promise<Result<boolean, FxError>> {
    const promise = this.connection.sendRequest(RequestTypes.ui.openUrl, link);
    return getResponseWithErrorHandling(promise);
  }

  async openFile(filePath: string): Promise<Result<boolean, FxError>> {
    const promise = this.connection.sendRequest(RequestTypes.ui.openFile, filePath);
    return getResponseWithErrorHandling(promise);
  }

  async selectFile(config: SelectFileConfig): Promise<Result<SelectFileResult, FxError>> {
    const promise = this.connection.sendRequest(
      RequestTypes.ui.selectFile,
      convertUIConfigToJson(config)
    );
    return getResponseWithErrorHandling(promise);
  }

  async selectFiles(config: SelectFilesConfig): Promise<Result<SelectFilesResult, FxError>> {
    const promise = this.connection.sendRequest(
      RequestTypes.ui.selectFiles,
      convertUIConfigToJson(config)
    );
    return getResponseWithErrorHandling(promise);
  }

  async selectFolder(config: SelectFolderConfig): Promise<Result<SelectFolderResult, FxError>> {
    const promise = this.connection.sendRequest(
      RequestTypes.ui.selectFolder,
      convertUIConfigToJson(config)
    );
    return getResponseWithErrorHandling(promise);
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
    const promise = this.connection.sendRequest(
      RequestTypes.ui.showMessage,
      level,
      message,
      modal,
      items
    );
    return getResponseWithErrorHandling(promise);
  }

  createProgressBar(title: string, totalSteps: number): IProgressHandler {
    // throw new NotImplementedError("FxServer", `${Namespaces.UserInteraction}/createProgressBar`);
    const handler: IProgressHandler = {
      start: async (detail?: string) => {},
      next: async (detail?: string) => {},
      end: async (success: boolean) => {},
    };
    return handler;
  }

  async runWithProgress<T>(
    task: RunnableTask<T>,
    config: TaskConfig,
    ...args: any
  ): Promise<Result<T, FxError>> {
    throw new NotImplementedError("FxServer", `ui/runWithProgress`);
  }
}
