// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import * as chai from "chai";
import {
  window,
  QuickPickOptions,
  InputBoxOptions,
  OpenDialogOptions,
  Uri,
  OutputChannel,
  env,
  ProgressOptions,
  Progress,
  CancellationToken
} from "vscode";

import { IProgressStatus, Result, FxError } from "fx-api";

import { IUserInput } from "../src/userInput";
import { testFolder } from "./globalVaribles";

export enum EInputType {
  defaultValue = "defaultValue",
  specifiedItem = "specifiedItem",
  specifiedValue = "specifiedValue"
}

export interface IUserInputItem {
  type: EInputType;
  index?: number | string;
  value?: string;
}

export class TestUserInput implements IUserInput {
  private inputs: IUserInputItem[];
  private workspace: string = testFolder;

  constructor() {
    this.inputs = [];
  }

  public addInputItems(items: IUserInputItem[]): void {
    this.inputs.push(...items);
  }

  public setWorkspace(workspace: string) {
    this.workspace = workspace;
  }

  private getInputItem(): IUserInputItem {
    const input: IUserInputItem | undefined = this.inputs.shift();
    return input || { type: EInputType.defaultValue };
  }

  public async showQuickPick(
    items: string[] | Thenable<string[]>,
    options: QuickPickOptions
  ): Promise<string | undefined> {
    const resolvedItems: string[] = await Promise.resolve(items);
    const input: IUserInputItem | undefined = this.getInputItem();
    if (!input) {
      return undefined;
    } else {
      switch (input.type) {
        case EInputType.defaultValue:
          return resolvedItems[0];
        case EInputType.specifiedItem:
          chai.assert(
            typeof input.index === "number",
            "[Mock] error: input.index must be number if specify the item!"
          );
          return resolvedItems[(input.index as number) || 0];
        case EInputType.specifiedValue:
          return input.value;
      }
    }
  }

  public async showInputBox(options: InputBoxOptions): Promise<string | undefined> {
    const input: IUserInputItem | undefined = this.getInputItem();
    if (!input) {
      return undefined;
    } else {
      switch (input.type) {
        case EInputType.defaultValue:
          return options.value;
        case EInputType.specifiedItem:
          chai.assert(
            typeof input.index === "string",
            "[Mock] error: input.index must be string if specify the item!"
          );
          return (options as any)[(input.index as string) || ""];
        case EInputType.specifiedValue:
          return input.value;
      }
    }
  }
  public async showOpenDialog(options: OpenDialogOptions): Promise<Uri[] | undefined> {
    const input: IUserInputItem | undefined = this.getInputItem();
    if (!input) {
      return undefined;
    } else {
      switch (input.type) {
        case EInputType.defaultValue:
          return [Uri.file(this.workspace)];
        case EInputType.specifiedItem:
          chai.assert(false, "[Mock] error: open dialog can't specify the item!");
          return undefined;
        case EInputType.specifiedValue:
          return input.value ? [Uri.file(input.value)] : undefined;
      }
    }
  }

  public async openFolder(uri: Uri): Promise<string | undefined> {
    return uri.fsPath;
  }

  public async showInformationMessage(
    message: string,
    ...items: string[]
  ): Promise<string | undefined> {
    return await window.showInformationMessage(message, ...items);
  }

  public async showWarningMessage(
    message: string,
    ...items: string[]
  ): Promise<string | undefined> {
    return await window.showWarningMessage(message, ...items);
  }

  public async showErrorMessage(message: string, ...items: string[]): Promise<string | undefined> {
    return await window.showErrorMessage(message, ...items);
  }

  public async openExternal(link: Uri): Promise<boolean> {
    return env.openExternal(link);
  }

  public async withProgress(
    options: ProgressOptions,
    task: (progress: Progress<IProgressStatus>) => Promise<Result<null, FxError>>
  ): Promise<Result<null, FxError>> {
    return await window.withProgress(options, task);
  }
}
