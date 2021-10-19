// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  AppStudioTokenProvider,
  AzureAccountProvider,
  Colors,
  CryptoProvider,
  FxError,
  GraphTokenProvider,
  InputTextConfig,
  InputTextResult,
  IProgressHandler,
  LogLevel,
  LogProvider,
  MultiSelectConfig,
  MultiSelectResult,
  PermissionRequestProvider,
  Result,
  RunnableTask,
  SelectFileConfig,
  SelectFileResult,
  SelectFilesConfig,
  SelectFilesResult,
  SelectFolderConfig,
  SelectFolderResult,
  SharepointTokenProvider,
  SingleSelectConfig,
  SingleSelectResult,
  SubscriptionInfo,
  TaskConfig,
  TelemetryReporter,
  TokenProvider,
  Tools,
  TreeProvider,
  UserInteraction,
} from "@microsoft/teamsfx-api";
import { MessageConnection } from "vscode-jsonrpc";
import { TokenCredential } from "../../api/node_modules/@azure/core-auth/types/latest/core-auth";
import { TokenCredentialsBase } from "../../api/node_modules/@azure/ms-rest-nodeauth/dist/lib/msRestNodeAuth";
import { Namespaces } from "./namespace";

export class RemoteLogProvider implements LogProvider {
  connection: MessageConnection;
  constructor(connection: MessageConnection) {
    this.connection = connection;
  }
  async log(logLevel: LogLevel, message: string): Promise<boolean> {
    this.connection.sendNotification(`${Namespaces.Logger}/log`, logLevel, message);
    return true;
  }
  async trace(message: string): Promise<boolean> {
    this.connection.sendNotification(`${Namespaces.Logger}/trace`, message);
    return true;
  }
  async debug(message: string): Promise<boolean> {
    this.connection.sendNotification(`${Namespaces.Logger}/debug`, message);
    return true;
  }
  info(message: string): Promise<boolean>;
  info(message: { content: string; color: Colors }[]): Promise<boolean>;
  async info(message: any): Promise<boolean> {
    this.connection.sendNotification(`${Namespaces.Logger}/info`, message);
    return true;
  }
  async warning(message: string): Promise<boolean> {
    this.connection.sendNotification(`${Namespaces.Logger}/warning`, message);
    return true;
  }
  async error(message: string): Promise<boolean> {
    this.connection.sendNotification(`${Namespaces.Logger}/error`, message);
    return true;
  }
  async fatal(message: string): Promise<boolean> {
    this.connection.sendNotification(`${Namespaces.Logger}/fatal`, message);
    return true;
  }
}

export class RemoteAzureAccountProvider implements AzureAccountProvider {
  connection: MessageConnection;
  constructor(connection: MessageConnection) {
    this.connection = connection;
  }
  getAccountCredentialAsync(
    showDialog?: boolean,
    tenantId?: string
  ): Promise<TokenCredentialsBase | undefined> {
    throw new Error(
      `Method not implemented:${Namespaces.AzureAccountProvider}/getAccountCredentialAsync`
    );
  }
  getIdentityCredentialAsync(showDialog?: boolean): Promise<TokenCredential | undefined> {
    throw new Error(
      `Method not implemented:${Namespaces.AzureAccountProvider}/getIdentityCredentialAsync`
    );
  }
  signout(): Promise<boolean> {
    throw new Error(`Method not implemented:${Namespaces.AzureAccountProvider}/signout`);
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
    throw new Error(`Method not implemented:${Namespaces.AzureAccountProvider}/setStatusChangeMap`);
  }
  removeStatusChangeMap(name: string): Promise<boolean> {
    throw new Error(
      `Method not implemented:${Namespaces.AzureAccountProvider}/removeStatusChangeMap`
    );
  }
  getJsonObject(showDialog?: boolean): Promise<Record<string, unknown> | undefined> {
    throw new Error(`Method not implemented:${Namespaces.AzureAccountProvider}/getJsonObject`);
  }
  listSubscriptions(): Promise<SubscriptionInfo[]> {
    throw new Error(`Method not implemented:${Namespaces.AzureAccountProvider}/listSubscriptions`);
  }
  setSubscription(subscriptionId: string): Promise<void> {
    throw new Error(`Method not implemented:${Namespaces.AzureAccountProvider}/setSubscription`);
  }
  getAccountInfo(): Record<string, string> | undefined {
    throw new Error(`Method not implemented:${Namespaces.AzureAccountProvider}/getAccountInfo`);
  }
  getSelectedSubscription(triggerUI?: boolean): Promise<SubscriptionInfo | undefined> {
    throw new Error(
      `Method not implemented:${Namespaces.AzureAccountProvider}/getSelectedSubscription`
    );
  }
}

export class RemoteGraphTokenProvider implements GraphTokenProvider {
  connection: MessageConnection;
  constructor(connection: MessageConnection) {
    this.connection = connection;
  }
  getAccessToken(showDialog?: boolean): Promise<string | undefined> {
    throw new Error(`Method not implemented:${Namespaces.GraphTokenProvider}/getAccessToken`);
  }
  getJsonObject(showDialog?: boolean): Promise<Record<string, unknown> | undefined> {
    throw new Error(`Method not implemented:${Namespaces.GraphTokenProvider}/getJsonObject`);
  }
  signout(): Promise<boolean> {
    throw new Error(`Method not implemented:${Namespaces.GraphTokenProvider}/signout`);
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
    throw new Error(`Method not implemented:${Namespaces.GraphTokenProvider}/setStatusChangeMap`);
  }
  removeStatusChangeMap(name: string): Promise<boolean> {
    throw new Error(
      `Method not implemented:${Namespaces.GraphTokenProvider}/removeStatusChangeMap`
    );
  }
}

export class RemoteAppStudioTokenProvider implements AppStudioTokenProvider {
  connection: MessageConnection;
  constructor(connection: MessageConnection) {
    this.connection = connection;
  }
  getAccessToken(showDialog?: boolean): Promise<string | undefined> {
    throw new Error(`Method not implemented:${Namespaces.AppStudioTokenProvider}/getAccessToken`);
  }
  getJsonObject(showDialog?: boolean): Promise<Record<string, unknown> | undefined> {
    throw new Error(`Method not implemented:${Namespaces.AppStudioTokenProvider}/getJsonObject`);
  }
  signout(): Promise<boolean> {
    throw new Error(`Method not implemented:${Namespaces.AppStudioTokenProvider}/signout`);
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
    throw new Error(
      `Method not implemented:${Namespaces.AppStudioTokenProvider}/setStatusChangeMap`
    );
  }
  removeStatusChangeMap(name: string): Promise<boolean> {
    throw new Error(
      `Method not implemented:${Namespaces.AppStudioTokenProvider}/removeStatusChangeMap`
    );
  }
}

export class RemoteSharepointTokenProvider implements SharepointTokenProvider {
  connection: MessageConnection;
  constructor(connection: MessageConnection) {
    this.connection = connection;
  }
  getAccessToken(showDialog?: boolean): Promise<string | undefined> {
    throw new Error(`Method not implemented:${Namespaces.SharepointTokenProvider}/getAccessToken`);
  }
  getJsonObject(showDialog?: boolean): Promise<Record<string, unknown> | undefined> {
    throw new Error(`Method not implemented:${Namespaces.SharepointTokenProvider}/getJsonObject`);
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
    throw new Error(
      `Method not implemented:${Namespaces.SharepointTokenProvider}/setStatusChangeMap`
    );
  }
  removeStatusChangeMap(name: string): Promise<boolean> {
    throw new Error(
      `Method not implemented:${Namespaces.SharepointTokenProvider}/removeStatusChangeMap`
    );
  }
}

export class RemoteTokenProvider implements TokenProvider {
  connection: MessageConnection;
  azureAccountProvider: AzureAccountProvider;
  graphTokenProvider: GraphTokenProvider;
  appStudioToken: AppStudioTokenProvider;
  sharepointTokenProvider: SharepointTokenProvider;
  constructor(connection: MessageConnection) {
    this.connection = connection;
    this.azureAccountProvider = new RemoteAzureAccountProvider(connection);
    this.graphTokenProvider = new RemoteGraphTokenProvider(connection);
    this.appStudioToken = new RemoteAppStudioTokenProvider(connection);
    this.sharepointTokenProvider = new RemoteSharepointTokenProvider(connection);
  }
}

export class RemoteUserInteraction implements UserInteraction {
  connection: MessageConnection;
  constructor(connection: MessageConnection) {
    this.connection = connection;
  }
  openUrl(link: string): Promise<Result<boolean, FxError>> {
    throw new Error(`Method not implemented:${Namespaces.UserInteraction}/openUrl`);
  }
  runWithProgress<T>(
    task: RunnableTask<T>,
    config: TaskConfig,
    ...args: any
  ): Promise<Result<T, FxError>> {
    throw new Error(`Method not implemented:${Namespaces.UserInteraction}/runWithProgress`);
  }
  async selectOption(config: SingleSelectConfig): Promise<Result<SingleSelectResult, FxError>> {
    throw new Error(`Method not implemented:${Namespaces.UserInteraction}/selectOption`);
  }
  selectOptions(config: MultiSelectConfig): Promise<Result<MultiSelectResult, FxError>> {
    throw new Error(`Method not implemented:${Namespaces.UserInteraction}/selectOptions`);
  }
  inputText(config: InputTextConfig): Promise<Result<InputTextResult, FxError>> {
    throw new Error(`Method not implemented:${Namespaces.UserInteraction}/inputText`);
  }
  selectFile(config: SelectFileConfig): Promise<Result<SelectFileResult, FxError>> {
    throw new Error(`Method not implemented:${Namespaces.UserInteraction}/selectFile`);
  }
  selectFiles(config: SelectFilesConfig): Promise<Result<SelectFilesResult, FxError>> {
    throw new Error(`Method not implemented:${Namespaces.UserInteraction}/selectFiles`);
  }
  selectFolder(config: SelectFolderConfig): Promise<Result<SelectFolderResult, FxError>> {
    throw new Error(`Method not implemented:${Namespaces.UserInteraction}/selectFolder`);
  }
  public async showMessage(
    level: "info" | "warn" | "error",
    message: string,
    modal: boolean,
    ...items: string[]
  ): Promise<Result<string | undefined, FxError>>;

  public async showMessage(
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
    throw new Error(`Method not implemented:${Namespaces.UserInteraction}/showMessage`);
  }
  createProgressBar(title: string, totalSteps: number): IProgressHandler {
    throw new Error(`Method not implemented:${Namespaces.UserInteraction}/createProgressBar`);
  }
}

export class RemoteTelemetryReporter implements TelemetryReporter {
  connection: MessageConnection;
  constructor(connection: MessageConnection) {
    this.connection = connection;
  }
  sendTelemetryEvent(
    eventName: string,
    properties?: { [key: string]: string },
    measurements?: { [key: string]: number }
  ): void {
    throw new Error(`Method not implemented:${Namespaces.TelemetryReporter}/sendTelemetryEvent`);
  }
  sendTelemetryErrorEvent(
    eventName: string,
    properties?: { [key: string]: string },
    measurements?: { [key: string]: number },
    errorProps?: string[]
  ): void {
    throw new Error(
      `Method not implemented:${Namespaces.TelemetryReporter}/sendTelemetryErrorEvent`
    );
  }
  sendTelemetryException(
    error: Error,
    properties?: { [key: string]: string },
    measurements?: { [key: string]: number }
  ): void {
    throw new Error(
      `Method not implemented:${Namespaces.TelemetryReporter}/sendTelemetryException`
    );
  }
}
export class RemoteTools implements Tools {
  connection: MessageConnection;
  logProvider: LogProvider;
  tokenProvider: TokenProvider;
  telemetryReporter?: TelemetryReporter | undefined;
  treeProvider?: TreeProvider | undefined;
  ui: UserInteraction;
  cryptoProvider?: CryptoProvider | undefined;
  permissionRequest?: PermissionRequestProvider | undefined;
  constructor(connection: MessageConnection) {
    this.connection = connection;
    this.logProvider = new RemoteLogProvider(connection);
    this.tokenProvider = new RemoteTokenProvider(connection);
    this.telemetryReporter = new RemoteTelemetryReporter(connection);
    this.ui = new RemoteUserInteraction(connection);
  }
}
