/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/ban-types */
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import {
  FxError,
  M365TokenProvider,
  ok,
  Result,
  TokenRequest,
  err,
  LoginStatus,
  BasicLogin,
  UserError,
} from "@microsoft/teamsfx-api";
import { AccountInfo, LogLevel } from "@azure/msal-node";
import { ExtensionErrors } from "../error";
import { CodeFlowLogin, ConvertTokenToJson, UserCancelError } from "./codeFlowLogin";
import VsCodeLogInstance from "./log";
import * as vscode from "vscode";
import { CryptoCachePlugin } from "./cacheAccess";
import {
  loggedIn,
  loggingIn,
  m365CacheName,
  signedIn,
  signedOut,
  signingIn,
  switching,
} from "./common/constant";
import * as util from "util";
import { ExtTelemetry } from "../telemetry/extTelemetry";
import {
  AccountType,
  TelemetryErrorType,
  TelemetryEvent,
  TelemetryProperty,
  TelemetrySuccess,
} from "../telemetry/extTelemetryEvents";
import { getDefaultString, localize } from "../utils/localizeUtils";
import { AppStudioScopes } from "@microsoft/teamsfx-core/build/common/tools";
import { AppStudioClient } from "@microsoft/teamsfx-core/build/component/resource/appManifest/appStudioClient";

const SERVER_PORT = 0;
const cachePlugin = new CryptoCachePlugin(m365CacheName);

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

export class M365Login extends BasicLogin implements M365TokenProvider {
  private static instance: M365Login;
  private static codeFlowInstance: CodeFlowLogin;

  private constructor() {
    super();
    M365Login.codeFlowInstance = new CodeFlowLogin([], config, SERVER_PORT, m365CacheName);
  }

  /**
   * Gets instance
   * @returns instance
   */
  public static getInstance(): M365Login {
    if (!M365Login.instance) {
      M365Login.instance = new M365Login();
    }

    return M365Login.instance;
  }

  /**
   * Get team access token
   */
  async getAccessToken(
    tokenRequest: TokenRequest,
    isInitiatedFromTdp?: boolean
  ): Promise<Result<string, FxError>> {
    await M365Login.codeFlowInstance.reloadCache();
    let tokenRes: Result<string, FxError>;
    if (!M365Login.codeFlowInstance.account) {
      if (tokenRequest.showDialog === undefined || tokenRequest.showDialog) {
        let userConfirmation = false;
        if (!isInitiatedFromTdp) {
          userConfirmation = await this.doesUserConfirmLogin();
        } else {
          userConfirmation = await this.doesUserConfirmLoginWhenIntiatedFromTdp();
        }
        if (!userConfirmation) {
          const cancelError = !isInitiatedFromTdp
            ? UserCancelError(getDefaultString("teamstoolkit.codeFlowLogin.loginComponent"))
            : TdpIntegrationLoginUserCancelError(
                getDefaultString("teamstoolkit.codeFlowLogin.loginComponent")
              );
          ExtTelemetry.sendTelemetryErrorEvent(TelemetryEvent.Login, cancelError, {
            [TelemetryProperty.AccountType]: AccountType.M365,
            [TelemetryProperty.Success]: TelemetrySuccess.No,
            [TelemetryProperty.UserId]: "",
            [TelemetryProperty.Internal]: "",
            [TelemetryProperty.ErrorType]: TelemetryErrorType.UserError,
            [TelemetryProperty.ErrorCode]: `${getDefaultString(
              "teamstoolkit.codeFlowLogin.loginComponent"
            )}.${ExtensionErrors.UserCancel}`,
            [TelemetryProperty.ErrorMessage]: `${getDefaultString(
              "teamstoolkit.common.userCancel"
            )}`,
          });
          return err(cancelError);
        }
        M365Login.codeFlowInstance.status = loggingIn;
        this.notifyStatus(tokenRequest);
      }
      tokenRes = await M365Login.codeFlowInstance.getTokenByScopes(tokenRequest.scopes);
      await this.notifyStatus(tokenRequest);
    } else {
      tokenRes = await M365Login.codeFlowInstance.getTokenByScopes(
        tokenRequest.scopes,
        !isInitiatedFromTdp
      );
    }

    if (tokenRes.isOk()) {
      return ok(tokenRes.value);
    } else {
      return tokenRes;
    }
  }

  async getJsonObject(
    tokenRequest: TokenRequest
  ): Promise<Result<Record<string, unknown>, FxError>> {
    const tokenRes = await this.getAccessToken(tokenRequest);
    if (tokenRes.isOk()) {
      const tokenJson = ConvertTokenToJson(tokenRes.value);
      return ok(tokenJson as any);
    } else {
      return err(tokenRes.error);
    }
  }

  async signout(): Promise<boolean> {
    await M365Login.codeFlowInstance.reloadCache();
    const userConfirmation = await this.doesUserConfirmSignout();
    if (!userConfirmation) {
      ExtTelemetry.sendTelemetryErrorEvent(
        TelemetryEvent.SignOut,
        UserCancelError(getDefaultString("teamstoolkit.commands.signOut.title")),
        {
          [TelemetryProperty.AccountType]: AccountType.M365,
          [TelemetryProperty.Success]: TelemetrySuccess.No,
          [TelemetryProperty.UserId]: "",
          [TelemetryProperty.Internal]: "",
          [TelemetryProperty.ErrorType]: TelemetryErrorType.UserError,
          [TelemetryProperty.ErrorCode]: `${getDefaultString(
            "teamstoolkit.codeFlowLogin.loginComponent"
          )}.${ExtensionErrors.UserCancel}`,
          [TelemetryProperty.ErrorMessage]: `${getDefaultString("teamstoolkit.common.userCancel")}`,
        }
      );
      throw UserCancelError(getDefaultString("teamstoolkit.commands.signOut.title"));
    }
    await M365Login.codeFlowInstance.logout();
    await this.notifyStatus({ scopes: AppStudioScopes });
    return true;
  }

  private async doesUserConfirmLogin(): Promise<boolean> {
    const message = localize("teamstoolkit.appStudioLogin.message");
    const signin = localize("teamstoolkit.common.signin");
    const createTestingTenant = localize("teamstoolkit.appStudioLogin.createM365TestingTenant");
    let userSelected: string | undefined;
    do {
      userSelected = await vscode.window.showInformationMessage(
        message,
        { modal: true },
        signin,
        createTestingTenant
      );
      if (userSelected === createTestingTenant) {
        ExtTelemetry.sendTelemetryEvent(TelemetryEvent.OpenSignInJoinM365);
        vscode.env.openExternal(
          vscode.Uri.parse("https://developer.microsoft.com/en-us/microsoft-365/dev-program")
        );
      }
    } while (userSelected === createTestingTenant);
    return Promise.resolve(userSelected === signin);
  }

  private async doesUserConfirmLoginWhenIntiatedFromTdp(): Promise<boolean> {
    const message = localize("teamstoolkit.devPortalIntegration.appStudioLogin.message");
    const signin = localize("teamstoolkit.common.signin");

    const userSelected = await vscode.window.showInformationMessage(
      message,
      { modal: true },
      signin
    );

    return Promise.resolve(userSelected === signin);
  }

  private async doesUserConfirmSignout(): Promise<boolean> {
    const accountInfo = M365Login.codeFlowInstance.account;
    const email = accountInfo?.username;
    const confirm = localize("teamstoolkit.common.signout");
    const userSelected = await vscode.window.showInformationMessage(
      util.format(localize("teamstoolkit.common.signOutOf"), email),
      { modal: true },
      confirm
    );
    return Promise.resolve(userSelected === confirm);
  }

  async getStatus(tokenRequest: TokenRequest): Promise<Result<LoginStatus, FxError>> {
    if (M365Login.codeFlowInstance.status !== switching) {
      await M365Login.codeFlowInstance.reloadCache();
    }
    if (M365Login.codeFlowInstance.status === loggedIn) {
      const tokenRes = await M365Login.codeFlowInstance.getTokenByScopes(
        tokenRequest.scopes,
        false
      );
      if (tokenRes.isOk()) {
        const tokenJson = ConvertTokenToJson(tokenRes.value);
        return ok({ status: signedIn, token: tokenRes.value, accountInfo: tokenJson as any });
      } else {
        if (
          tokenRes.error.name !==
          getDefaultString("teamstoolkit.codeFlowLogin.checkOnlineFailTitle")
        ) {
          return ok({ status: signedOut, token: undefined, accountInfo: undefined });
        } else {
          return ok({
            status: signedIn,
            token: undefined,
            accountInfo: { upn: M365Login.codeFlowInstance.account?.username },
          });
        }
      }
    } else if (M365Login.codeFlowInstance.status === loggingIn) {
      return ok({ status: signingIn, token: undefined, accountInfo: undefined });
    } else if (M365Login.codeFlowInstance.status === switching) {
      return ok({ status: switching, token: undefined, accountInfo: undefined });
    } else {
      return ok({ status: signedOut, token: undefined, accountInfo: undefined });
    }
  }

  getCachedAccountInfo(): AccountInfo | undefined {
    return M365Login.codeFlowInstance.account;
  }

  async signInWhenInitiatedFromTdp(
    tokenRequest: TokenRequest,
    teamsAppId: string
  ): Promise<Result<string, FxError>> {
    await M365Login.codeFlowInstance.reloadCache();
    const tokenRes = await this.getAccessToken(tokenRequest, true);

    // TODO: add telemetry
    if (tokenRes.isOk()) {
      // signed in silently with cached account successfully or signed in successfully without cache before.
      const checkAccountRes = await this.checkWhetherSignedInWithCorrectAccount(
        tokenRequest,
        teamsAppId,
        tokenRes.value
      );
      if (checkAccountRes.isOk()) {
        return ok(tokenRes.value as any);
      } else {
        return err(checkAccountRes.error);
      }
    } else {
      if (tokenRes.error.name === ExtensionErrors.UserCancel) {
        return tokenRes;
      }

      // accountId in cache has been set to undefined if acquiring token silently for the cached account failed.
      // will pop up signIn dialog for user to select to continue.
      const newTokenRes = await this.getAccessToken(tokenRequest, true);
      if (newTokenRes.isOk()) {
        const checkAccountRes = await this.checkWhetherSignedInWithCorrectAccount(
          tokenRequest,
          teamsAppId,
          newTokenRes.value
        );
        if (checkAccountRes.isOk()) {
          return ok(newTokenRes.value as any);
        } else {
          return err(checkAccountRes.error);
        }
      } else {
        return err(newTokenRes.error);
      }
    }
  }

  private async doesUserConfirmSwitchAccount(): Promise<boolean> {
    const message = localize("teamstoolkit.devPortalIntegration.appStudioSwitchAccount.message");
    const switchAccount = localize("teamstoolkit.devPortalIntegration.switchAccount");

    const userSelected = await vscode.window.showInformationMessage(
      message,
      { modal: true },
      switchAccount
    );

    return Promise.resolve(userSelected === switchAccount);
  }

  private async checkWhetherSignedInWithCorrectAccount(
    tokenRequest: TokenRequest,
    teamsAppId: string,
    token: any
  ): Promise<Result<string, FxError>> {
    const maxSwitchTimes = 3;
    let switchTimes = 0;
    let currentToken = token;
    while (switchTimes < maxSwitchTimes) {
      try {
        await AppStudioClient.getApp(teamsAppId, currentToken, VsCodeLogInstance);
        VsCodeLogInstance.info(`Switched to correct Microsoft 365 account.`);
        return ok(token as any);
      } catch (error: any) {
        VsCodeLogInstance.error(
          `Failed to get app with ${M365Login.codeFlowInstance.account?.username}`
        );
        if (error.message) {
          VsCodeLogInstance.error(error.message);
        }
        if (error.message && (error.message.includes("404") || error.message.includes("401"))) {
          const userConfirmation = await this.doesUserConfirmSwitchAccount();

          if (!userConfirmation) {
            const error = new UserError({
              name: ExtensionErrors.UserCancel,
              message: getDefaultString(
                "teamstoolkit.devPortalIntegration.switchAccountCancel.message"
              ),
              displayMessage: localize(
                "teamstoolkit.devPortalIntegration.switchAccountCancel.message"
              ),
              source: "switchAccount",
            });

            return err(error);
          }
          M365Login.codeFlowInstance.status = switching;
          await this.notifyStatus(tokenRequest);
          const newTokenRes = await M365Login.codeFlowInstance.switchAccount(tokenRequest.scopes);
          await this.notifyStatus(tokenRequest);
          if (newTokenRes.isOk()) {
            switchTimes += 1;
            currentToken = newTokenRes.value;
          } else {
            return err(newTokenRes.error);
          }
        } else {
          return err(CheckM365AccountError());
        }
      }
    }

    return err(CheckM365AccountError());
  }
}

export function CheckM365AccountError(): UserError {
  return new UserError({
    name: ExtensionErrors.UserCancel,
    message: getDefaultString("teamstoolkit.devPortalIntegration.getTeamsAppError.message"),
    displayMessage: localize("teamstoolkit.devPortalIntegration.getTeamsAppError.message"),
    source: "checkM365Account",
  });
}

export function TdpIntegrationLoginUserCancelError(source: string): UserError {
  return new UserError({
    name: ExtensionErrors.UserCancel,
    message: getDefaultString("teamstoolkit.devPortalIntegration.signInCancel.message"),
    displayMessage: localize("teamstoolkit.devPortalIntegration.signInCancel.message"),
    source: source,
  });
}

export default M365Login.getInstance();
