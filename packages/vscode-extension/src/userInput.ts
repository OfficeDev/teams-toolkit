// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import {
  window,
  QuickPickOptions,
  InputBoxOptions,
  OpenDialogOptions,
  Uri,
  OutputChannel,
  commands,
  env,
  ProgressOptions,
  Progress,
  CancellationToken
} from "vscode";

import { IProgressStatus, Result, FxError } from "fx-api";

/**
 * Wrapper interface of several `vscode.window` methods that handle user input. The main reason for this interface
 * is to facilitate unit testing in non-interactive mode with the `TestUserInput` class.
 * // However, the `AzureUserInput` class does have a few minor differences from default vscode behavior:
 * // 1. Automatically throws a `UserCancelledError` instead of returning undefined when a user cancels
 * // 2. Persists 'recently used' items in quick picks and displays them at the top
 */
export interface IUserInput {
  /**
   * Shows a selection list.
   * // Automatically persists the 'recently used' item and displays that at the top of the list
   *
   * @param items An array of items, or a promise that resolves to an array of items.
   * @param options Configures the behavior of the selection list.
   * // @throws `UserCancelledError` if the user cancels.
   * @return A promise that resolves to the item the user picked.
   */
  showQuickPick(
    items: string[] | Thenable<string[]>,
    options: QuickPickOptions
  ): Promise<string | undefined>;

  /**
   * Opens an input box to ask the user for input.
   *
   * @param options Configures the behavior of the input box.
   * // @throws `UserCancelledError` if the user cancels.
   * @return A promise that resolves to a string the user provided.
   */
  showInputBox(options: InputBoxOptions): Promise<string | undefined>;

  /**
   * Shows a file open dialog to the user which allows to select a file
   * for opening-purposes.
   *
   * @param options Options that control the dialog.
   * // @throws `UserCancelledError` if the user cancels.
   * @returns A promise that resolves to the selected resources.
   */
  showOpenDialog(options: OpenDialogOptions): Promise<Uri[] | undefined>;

  /**
   * Open folder
   *
   * @param uri Uri which is the path of folder.
   * // @throws `UserCancelledError` if the user cancels.
   * @returns A promise that resolves to the selected resources.
   */
  openFolder(uri: Uri): Promise<string | undefined>;

  /**
   * Show a info message.
   *
   * @param message The message to show.
   * // @param items A set of items that will be rendered as actions in the message.
   * // @throws `UserCancelledError` if the user cancels.
   * @return A thenable that resolves to the selected item when being dismissed.
   */
  showInformationMessage(message: string, ...items: string[]): Promise<string | undefined>;

  /**
   * Show a warning message.
   *
   * @param message The message to show.
   * // @param items A set of items that will be rendered as actions in the message.
   * // @throws `UserCancelledError` if the user cancels.
   * @return A thenable that resolves to the selected item when being dismissed.
   */
  showWarningMessage(message: string, ...items: string[]): Promise<string | undefined>;

  /**
   * Show an error message.
   *
   * @param message The message to show.
   * // @param items A set of items that will be rendered as actions in the message.
   * // @throws `UserCancelledError` if the user cancels.
   * @return A thenable that resolves to the selected item when being dismissed.
   */
  showErrorMessage(message: string, ...items: string[]): Promise<string | undefined>;

  /**
   * Open an external url
   *
   * @param uri link
   */
  openExternal(link: Uri): Promise<boolean>;

  /**
   * Show progress.
   *
   * @param options see `ProgressOptions`
   * @param task see `task`
   */
  withProgress(
    options: ProgressOptions,
    task: (progress: Progress<IProgressStatus>, token: CancellationToken) => Promise<Result<null, FxError>>
  ): Promise<Result<null, FxError>>;
}

export class UserInput implements IUserInput {
  // constructor() {}

  public async showQuickPick(
    items: string[] | Thenable<string[]>,
    options: QuickPickOptions
  ): Promise<string | undefined> {
    return await window.showQuickPick(items, options);
  }

  public async showInputBox(options: InputBoxOptions): Promise<string | undefined> {
    return await window.showInputBox(options);
  }

  public async showOpenDialog(options: OpenDialogOptions): Promise<Uri[] | undefined> {
    return await window.showOpenDialog(options);
  }

  public async openFolder(uri: Uri): Promise<string | undefined> {
    await commands.executeCommand("vscode.openFolder", uri);
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
    task: (progress: Progress<IProgressStatus>, token: CancellationToken) => Promise<Result<null, FxError>>
  ): Promise<Result<null, FxError>> {
    return await window.withProgress(options, task);
  }
}
