// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  Colors,
  FxError,
  Inputs,
  InputTextConfig,
  InputTextResult,
  LogLevel,
  MultiSelectConfig,
  MultiSelectResult,
  Result,
  SelectFileConfig,
  SelectFileResult,
  SelectFilesConfig,
  SelectFilesResult,
  SelectFolderConfig,
  SelectFolderResult,
  SingleSelectConfig,
  SingleSelectResult,
  SubscriptionInfo,
  Void,
} from "@microsoft/teamsfx-api";
import {
  CancellationToken,
  NotificationType2,
  NotificationType3,
  NotificationType4,
  RequestType0,
  RequestType1,
  RequestType4,
} from "vscode-jsonrpc";

export enum Namespaces {
  /**
   * server-side
   */
  Server = "server",

  /**
   * client-side
   */
  Logger = "logger",
  Azure = "azure",
  Graph = "graph",
  AppStudio = "appStudio",
  SharePoint = "sharepoint",
  UserInteraction = "ui",
  Telemetry = "telemetry",
}

export type CustomizeFuncType = "LocalFunc" | "ValidateFunc" | "OnSelectionChangeFunc";

export interface CustomizeFuncRequestType {
  type: CustomizeFuncType;
  id: number;
}

/**
 * server-side request / notification types which are called from client to the server.
 */
export interface IServerConnection {
  createProjectRequest: (
    inputs: Inputs,
    token: CancellationToken
  ) => Promise<Result<string, FxError>>;
  localDebugRequest: (inputs: Inputs, token: CancellationToken) => Promise<Result<Void, FxError>>;
  provisionResourcesRequest: (
    inputs: Inputs,
    token: CancellationToken
  ) => Promise<Result<Void, FxError>>;
  deployArtifactsRequest: (
    inputs: Inputs,
    token: CancellationToken
  ) => Promise<Result<Void, FxError>>;
  buildArtifactsRequest: (
    inputs: Inputs,
    token: CancellationToken
  ) => Promise<Result<Void, FxError>>;
  publishApplicationRequest: (
    inputs: Inputs,
    token: CancellationToken
  ) => Promise<Result<Void, FxError>>;

  customizeLocalFuncRequest: (
    funcId: number,
    inputs: Inputs,
    token: CancellationToken
  ) => Promise<Result<Void, FxError>>;
  customizeValidateFuncRequest: (
    funcId: number,
    answer: any,
    previousAnswers: Inputs | undefined,
    token: CancellationToken
  ) => Promise<Result<Void, FxError>>;
  customizeOnSelectionChangeFuncRequest: (
    funcId: number,
    currentSelectedIds: Set<string>,
    previousSelectedIds: Set<string>,
    token: CancellationToken
  ) => Promise<Result<Void, FxError>>;
}

/**
 * notification types which are called from the server to the client.
 */
export const NotificationTypes = {
  [Namespaces.Logger]: {
    show: new NotificationType2<LogLevel, string>(`${Namespaces.Logger}/show`),
  },
  [Namespaces.Telemetry]: {
    sendTelemetryEvent: new NotificationType3<
      string,
      { [key: string]: string } | undefined,
      { [key: string]: number } | undefined
    >(`${Namespaces.Telemetry}/sendTelemetryEvent`),
    sendTelemetryErrorEvent: new NotificationType4<
      string,
      { [key: string]: string } | undefined,
      { [key: string]: number } | undefined,
      string[] | undefined
    >(`${Namespaces.Telemetry}/sendTelemetryErrorEvent`),
    sendTelemetryException: new NotificationType3<
      Error,
      { [key: string]: string } | undefined,
      { [key: string]: number } | undefined
    >(`${Namespaces.Telemetry}/sendTelemetryException`),
  },
};

/**
 * request types which are called from the server to the client.
 */
export const RequestTypes = {
  /**
   * token part.
   * TODO: do more investigation and update the parameters.
   * also, add other requests, such as signout.
   */
  [Namespaces.Azure]: {
    getAccountCredential: new RequestType0<
      { accessToken: string; tokenJsonString: string },
      FxError
    >(`${Namespaces.Azure}/getAccountCredentialRequest`),
    getJsonObject: new RequestType0<string, FxError>(`${Namespaces.Azure}/getJsonObjectRequest`),
    listSubscriptions: new RequestType0<SubscriptionInfo[], FxError>(
      `${Namespaces.Azure}/listSubscriptionsRequest`
    ),
    setSubscription: new RequestType1<string, undefined, FxError>(
      `${Namespaces.Azure}/setSubscriptionRequest`
    ),
    getSelectedSubscription: new RequestType0<SubscriptionInfo | undefined, FxError>(
      `${Namespaces.Azure}/getSelectedSubscriptionRequest`
    ),
  },
  [Namespaces.Graph]: {
    getAccessToken: new RequestType0<string, FxError>(`${Namespaces.Graph}/getAccessTokenRequest`),
    getJsonObject: new RequestType0<string, FxError>(`${Namespaces.Graph}/getJsonObjectRequest`),
  },
  [Namespaces.AppStudio]: {
    getAccessToken: new RequestType0<string, FxError>(
      `${Namespaces.AppStudio}/getAccessTokenRequest`
    ),
    getJsonObject: new RequestType0<string, FxError>(
      `${Namespaces.AppStudio}/getJsonObjectRequest`
    ),
  },
  [Namespaces.SharePoint]: {
    getAccessToken: new RequestType0<string, FxError>(
      `${Namespaces.SharePoint}/getAccessTokenRequest`
    ),
    getJsonObject: new RequestType0<string, FxError>(
      `${Namespaces.SharePoint}/getJsonObjectRequest`
    ),
  },

  /**
   * user interaction
   * TODO: add the progress part.
   */
  [Namespaces.UserInteraction]: {
    selectOption: new RequestType1<SingleSelectConfig, SingleSelectResult, FxError>(
      `${Namespaces.UserInteraction}/selectOptionRequest`
    ),
    selectOptions: new RequestType1<MultiSelectConfig, MultiSelectResult, FxError>(
      `${Namespaces.UserInteraction}/selectOptionsRequest`
    ),
    inputText: new RequestType1<InputTextConfig, InputTextResult, FxError>(
      `${Namespaces.UserInteraction}/inputTextRequest`
    ),
    openUrl: new RequestType1<string, boolean, FxError>(
      `${Namespaces.UserInteraction}/openUrlRequest`
    ),
    selectFile: new RequestType1<SelectFileConfig, SelectFileResult, FxError>(
      `${Namespaces.UserInteraction}/selectFileRequest`
    ),
    selectFiles: new RequestType1<SelectFilesConfig, SelectFilesResult, FxError>(
      `${Namespaces.UserInteraction}/selectFilesRequest`
    ),
    selectFolder: new RequestType1<SelectFolderConfig, SelectFolderResult, FxError>(
      `${Namespaces.UserInteraction}/selectFolderRequest`
    ),
    showMessage: new RequestType4<
      "info" | "warn" | "error",
      string | Array<{ content: string; color: Colors }>,
      boolean,
      string[],
      string | undefined,
      FxError
    >(`${Namespaces.UserInteraction}/showMessageRequest`),
  },
};

export interface IServerFxError {
  errorType: "UserError" | "SystemError";
  source: string;
  name: string;
  message: string;
  stack?: string;
  innerError?: any;
  userData?: any;
  timestamp: Date;
  helpLink?: string;
  issueLink?: string;
}
