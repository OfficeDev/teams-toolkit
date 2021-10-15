/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/ban-types */
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import { AppStudioTokenProvider, UserError } from "@microsoft/teamsfx-api";
import { LogLevel } from "@azure/msal-node";
import { ExtensionErrors } from "../error";
import { CodeFlowLogin } from "./codeFlowLogin";
import VsCodeLogInstance from "./log";
import * as vscode from "vscode";
import { CryptoCachePlugin } from "./cacheAccess";
import { loggedIn, loggingIn, signedIn, signedOut, signingIn } from "./common/constant";
import { login, LoginStatus } from "./common/login";
import * as StringResources from "../resources/Strings.json";
import * as util from "util";
import { ExtTelemetry } from "../telemetry/extTelemetry";
import {
  AccountType,
  TelemetryErrorType,
  TelemetryEvent,
  TelemetryProperty,
  TelemetrySuccess,
} from "../telemetry/extTelemetryEvents";
import { getAppStudioEndpoint } from "@microsoft/teamsfx-core";

const accountName = "appStudio";
const scopes = [`${getAppStudioEndpoint()}/AppDefinitions.ReadWrite`];
const SERVER_PORT = 0;

const cachePlugin = new CryptoCachePlugin(accountName);

const config = {
  auth: {
    clientId: "7ea7c24c-b1f6-4a20-9d11-9ae12e9e7ac0",
    authority: "https://login.microsoftonline.com/common",
  },
  system: {
    loggerOptions: {
      // @ts-ignore
      loggerCallback(loglevel, message, containsPii) {
        if (loglevel <= LogLevel.Error) {
          VsCodeLogInstance.error(message);
        }
      },
      piiLoggingEnabled: false,
      logLevel: LogLevel.Error,
    },
  },
  cache: {
    cachePlugin,
  },
};

export class AppStudioLogin extends login implements AppStudioTokenProvider {
  private static instance: AppStudioLogin;
  private static codeFlowInstance: CodeFlowLogin;

  private static statusChange?: (
    status: string,
    token?: string,
    accountInfo?: Record<string, unknown>
  ) => Promise<void>;

  private constructor() {
    super();
    AppStudioLogin.codeFlowInstance = new CodeFlowLogin(scopes, config, SERVER_PORT, accountName);
  }

  /**
   * Gets instance
   * @returns instance
   */
  public static getInstance(): AppStudioLogin {
    if (!AppStudioLogin.instance) {
      AppStudioLogin.instance = new AppStudioLogin();
    }

    return AppStudioLogin.instance;
  }

  /**
   * Get team access token
   */
  async getAccessToken(showDialog = true): Promise<string | undefined> {
    await AppStudioLogin.codeFlowInstance.reloadCache();
    if (!AppStudioLogin.codeFlowInstance.account) {
      if (showDialog) {
        const userConfirmation: boolean = await this.doesUserConfirmLogin();
        if (!userConfirmation) {
          // throw user cancel error
          ExtTelemetry.sendTelemetryEvent(TelemetryEvent.Login, {
            [TelemetryProperty.AccountType]: AccountType.M365,
            [TelemetryProperty.Success]: TelemetrySuccess.No,
            [TelemetryProperty.UserId]: "",
            [TelemetryProperty.Internal]: "",
            [TelemetryProperty.ErrorType]: TelemetryErrorType.UserError,
            [TelemetryProperty.ErrorCode]: `${StringResources.vsc.codeFlowLogin.loginComponent}.${ExtensionErrors.UserCancel}`,
            [TelemetryProperty.ErrorMessage]: `${StringResources.vsc.common.userCancel}`,
          });
          throw new UserError(
            ExtensionErrors.UserCancel,
            StringResources.vsc.common.userCancel,
            "Login"
          );
        }
        AppStudioLogin.codeFlowInstance.status = loggingIn;
        this.notifyStatus();
      }
      try {
        const loginToken = await AppStudioLogin.codeFlowInstance.getToken();
        if (loginToken && AppStudioLogin.statusChange !== undefined) {
          const tokenJson = await this.getJsonObject();
          await AppStudioLogin.statusChange(signedIn, loginToken, tokenJson);
        }
        await this.notifyStatus();
        return loginToken;
      } catch (error) {
        this.notifyStatus();
        throw error;
      }
    }

    return AppStudioLogin.codeFlowInstance.getToken();
  }

  async getJsonObject(showDialog = true): Promise<Record<string, unknown> | undefined> {
    const token = await this.getAccessToken(showDialog);
    if (token) {
      const array = token.split(".");
      const buff = Buffer.from(array[1], "base64");
      return new Promise((resolve) => {
        resolve(JSON.parse(buff.toString("utf-8")));
      });
    } else {
      return new Promise((resolve) => {
        resolve(undefined);
      });
    }
  }

  async signout(): Promise<boolean> {
    await AppStudioLogin.codeFlowInstance.reloadCache();
    const userConfirmation = await this.doesUserConfirmSignout();
    if (!userConfirmation) {
      ExtTelemetry.sendTelemetryEvent(TelemetryEvent.SignOut, {
        [TelemetryProperty.AccountType]: AccountType.M365,
        [TelemetryProperty.Success]: TelemetrySuccess.No,
        [TelemetryProperty.UserId]: "",
        [TelemetryProperty.Internal]: "",
        [TelemetryProperty.ErrorType]: TelemetryErrorType.UserError,
        [TelemetryProperty.ErrorCode]: `${StringResources.vsc.codeFlowLogin.loginComponent}.${ExtensionErrors.UserCancel}`,
        [TelemetryProperty.ErrorMessage]: `${StringResources.vsc.common.userCancel}`,
      });
      throw new UserError(
        ExtensionErrors.UserCancel,
        StringResources.vsc.common.userCancel,
        "SignOut"
      );
    }
    await AppStudioLogin.codeFlowInstance.logout();
    if (AppStudioLogin.statusChange !== undefined) {
      await AppStudioLogin.statusChange(signedOut, undefined, undefined);
    }
    await this.notifyStatus();
    return new Promise((resolve) => {
      resolve(true);
    });
  }

  private async doesUserConfirmLogin(): Promise<boolean> {
    const message = StringResources.vsc.appStudioLogin.message;
    const signin = StringResources.vsc.common.signin;
    const readMore = StringResources.vsc.common.readMore;
    let userSelected: string | undefined;
    do {
      userSelected = await vscode.window.showInformationMessage(
        message,
        { modal: true },
        signin,
        readMore
      );
      if (userSelected === readMore) {
        vscode.env.openExternal(
          vscode.Uri.parse("https://developer.microsoft.com/en-us/microsoft-365/dev-program")
        );
      }
    } while (userSelected === readMore);
    return Promise.resolve(userSelected === signin);
  }

  private async doesUserConfirmSignout(): Promise<boolean> {
    const accountInfo = AppStudioLogin.codeFlowInstance.account;
    const email = accountInfo?.username;
    const confirm = StringResources.vsc.common.signout;
    const userSelected = await vscode.window.showInformationMessage(
      util.format(StringResources.vsc.common.signOutOf, email),
      { modal: true },
      confirm
    );
    return Promise.resolve(userSelected === confirm);
  }

  async getStatus(): Promise<LoginStatus> {
    await AppStudioLogin.codeFlowInstance.reloadCache();
    if (AppStudioLogin.codeFlowInstance.status === loggedIn) {
      const loginToken = await AppStudioLogin.codeFlowInstance.getToken(false);
      if (loginToken) {
        const tokenJson = await this.getJsonObject();
        return Promise.resolve({ status: signedIn, token: loginToken, accountInfo: tokenJson });
      } else {
        return Promise.resolve({ status: signedOut, token: undefined, accountInfo: undefined });
      }
    } else if (AppStudioLogin.codeFlowInstance.status === loggingIn) {
      return Promise.resolve({ status: signingIn, token: undefined, accountInfo: undefined });
    } else {
      return Promise.resolve({ status: signedOut, token: undefined, accountInfo: undefined });
    }
  }
}

export default AppStudioLogin.getInstance();
