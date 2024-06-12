// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
/* eslint-disable @typescript-eslint/no-empty-function */

/* eslint-disable @typescript-eslint/no-empty-function */

"use strict";

import type { TokenCredential } from "@azure/core-auth";
import {
  AzureAccountProvider,
  UserError,
  SubscriptionInfo,
  SingleSelectConfig,
  OptionItem,
} from "@microsoft/teamsfx-api";
import { ExtensionErrors } from "../error";
import { LoginFailureError } from "./codeFlowLogin";
import * as vscode from "vscode";
import { loggedIn, loggedOut, loggingIn, signedIn, signedOut, signingIn } from "./common/constant";
import { login, LoginStatus } from "./common/login";
import * as util from "util";
import { ExtTelemetry } from "../telemetry/extTelemetry";
import VsCodeLogInstance from "./log";
import {
  TelemetryEvent,
  TelemetryProperty,
  TelemetrySuccess,
  AccountType,
  TelemetryErrorType,
} from "../telemetry/extTelemetryEvents";
import { VS_CODE_UI } from "../qm/vsc_ui";
import { AzureScopes, globalStateGet, globalStateUpdate } from "@microsoft/teamsfx-core";
import { getDefaultString, localize } from "../utils/localizeUtils";
import {
  Microsoft,
  VSCodeAzureSubscriptionProvider,
  getSessionFromVSCode,
} from "./vscodeAzureSubscriptionProvider";

const showAzureSignOutHelp = "ShowAzureSignOutHelp";

export class AzureAccountManager extends login implements AzureAccountProvider {
  private static instance: AzureAccountManager;
  private static subscriptionId: string | undefined;
  private static subscriptionName: string | undefined;
  private static tenantId: string | undefined;
  private static currentStatus: string | undefined;
  private vscodeAzureSubscriptionProvider: VSCodeAzureSubscriptionProvider;

  private constructor() {
    super();
    this.vscodeAzureSubscriptionProvider = new VSCodeAzureSubscriptionProvider();
    void this.addStatusChangeEvent();
  }

  /**
   * Gets instance
   * @returns instance
   */
  public static getInstance(): AzureAccountManager {
    if (!AzureAccountManager.instance) {
      AzureAccountManager.instance = new AzureAccountManager();
    }

    return AzureAccountManager.instance;
  }

  /**
   * Async get identity [crendential](https://github.com/Azure/azure-sdk-for-js/blob/master/sdk/core/core-auth/src/tokenCredential.ts)
   */
  async getIdentityCredentialAsync(showDialog = true): Promise<TokenCredential | undefined> {
    if (await this.isUserLogin()) {
      return this.doGetIdentityCredentialAsync();
    }
    await this.login(showDialog);
    return this.doGetIdentityCredentialAsync();
  }

  private async isUserLogin(): Promise<boolean> {
    const session = await getSessionFromVSCode(AzureScopes, undefined, {
      createIfNone: false,
      silent: true,
    });
    return session !== undefined;
  }

  private async login(showDialog: boolean): Promise<void> {
    if (showDialog) {
      const userConfirmation: boolean = await this.doesUserConfirmLogin();
      if (!userConfirmation) {
        // throw user cancel error
        throw new UserError(
          "Login",
          ExtensionErrors.UserCancel,
          getDefaultString("teamstoolkit.common.userCancel"),
          localize("teamstoolkit.common.userCancel")
        );
      }
    }

    ExtTelemetry.sendTelemetryEvent(TelemetryEvent.LoginStart, {
      [TelemetryProperty.AccountType]: AccountType.Azure,
    });
    try {
      AzureAccountManager.currentStatus = loggingIn;
      void this.notifyStatus();
      const session = await getSessionFromVSCode(AzureScopes, undefined, { createIfNone: true });
      if (session === undefined) {
        throw new UserError(
          getDefaultString("teamstoolkit.codeFlowLogin.loginComponent"),
          getDefaultString("teamstoolkit.codeFlowLogin.loginTimeoutTitle"),
          getDefaultString("teamstoolkit.codeFlowLogin.loginTimeoutDescription"),
          localize("teamstoolkit.codeFlowLogin.loginTimeoutDescription")
        );
      }
      if (await globalStateGet(showAzureSignOutHelp, true)) {
        void vscode.window
          .showInformationMessage(
            localize("teamstoolkit.commands.azureAccount.signOutHelp"),
            "Got it"
          )
          .then(async (userClicked) => {
            if (userClicked === "Got it") {
              await globalStateUpdate(showAzureSignOutHelp, false);
            }
          });
      }
    } catch (e) {
      AzureAccountManager.currentStatus = loggedOut;
      void this.notifyStatus();
      if (e?.message.includes("User did not consent ")) {
        // throw user cancel error
        throw new UserError(
          "Login",
          ExtensionErrors.UserCancel,
          getDefaultString("teamstoolkit.common.userCancel"),
          localize("teamstoolkit.common.userCancel")
        );
      } else {
        throw e;
      }
    }
  }

  private async doGetIdentityCredentialAsync(): Promise<TokenCredential | undefined> {
    const tokenCredential = await this.doGetAccountCredentialAsync();
    if (tokenCredential) {
      return tokenCredential;
    } else {
      return Promise.reject(LoginFailureError());
    }
  }

  private async doGetAccountCredentialAsync(): Promise<TokenCredential | undefined> {
    if (await this.isUserLogin()) {
      const subs = await this.vscodeAzureSubscriptionProvider.getSubscriptions();
      if (subs.length > 0) {
        if (AzureAccountManager.tenantId) {
          for (let i = 0; i < subs.length; ++i) {
            const item = subs[i];
            if (item.tenantId == AzureAccountManager.tenantId) {
              return item.credential;
            }
          }
        }
        return subs[0].credential;
      } else {
        const session = await getSessionFromVSCode(AzureScopes, undefined, {
          createIfNone: false,
          silent: true,
        });
        const credential: TokenCredential = {
          // eslint-disable-next-line @typescript-eslint/require-await
          getToken: async () => {
            return {
              token: session!.accessToken,
              expiresOnTimestamp: 0,
            };
          },
        };
        return credential;
      }
    }
    return Promise.reject(LoginFailureError());
  }

  private async doesUserConfirmLogin(): Promise<boolean> {
    const message = localize("teamstoolkit.azureLogin.message");
    const signin = localize("teamstoolkit.common.signin");
    const readMore = localize("teamstoolkit.common.readMore");
    let userSelected: string | undefined;
    do {
      userSelected = await vscode.window.showInformationMessage(
        message,
        { modal: true },
        signin,
        readMore
      );
      if (userSelected === readMore) {
        void vscode.env.openExternal(
          vscode.Uri.parse(
            "https://docs.microsoft.com/en-us/azure/cost-management-billing/manage/create-subscription"
          )
        );
      }
    } while (userSelected === readMore);

    return Promise.resolve(userSelected === signin);
  }

  private async doesUserConfirmSignout(): Promise<boolean> {
    const accountInfo = (await this.getStatus()).accountInfo;
    const email = (accountInfo as any).upn ? (accountInfo as any).upn : (accountInfo as any).email;
    const confirm = localize("teamstoolkit.common.signout");
    const userSelected: string | undefined = await vscode.window.showInformationMessage(
      util.format(localize("teamstoolkit.common.signOutOf"), email),
      { modal: true },
      confirm
    );
    return Promise.resolve(userSelected === confirm);
  }

  async getJsonObject(showDialog = true): Promise<Record<string, unknown> | undefined> {
    const credential = await this.getIdentityCredentialAsync(showDialog);
    const token = await credential?.getToken("https://management.core.windows.net/.default");
    if (token) {
      const array = token.token.split(".");
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

  /**
   * signout from Azure
   */
  async signout(): Promise<boolean> {
    const userConfirmation: boolean = await this.doesUserConfirmSignout();
    if (!userConfirmation) {
      // throw user cancel error
      throw new UserError(
        "SignOut",
        ExtensionErrors.UserCancel,
        getDefaultString("teamstoolkit.common.userCancel"),
        localize("teamstoolkit.common.userCancel")
      );
    }
    try {
      // todo
      // await vscode.commands.executeCommand("azure-account.logout");
      AzureAccountManager.tenantId = undefined;
      AzureAccountManager.subscriptionId = undefined;
      ExtTelemetry.sendTelemetryEvent(TelemetryEvent.SignOut, {
        [TelemetryProperty.AccountType]: AccountType.Azure,
        [TelemetryProperty.Success]: TelemetrySuccess.Yes,
      });
      return new Promise((resolve) => {
        resolve(true);
      });
    } catch (e) {
      VsCodeLogInstance.error("[Logout Azure] " + (e.message as string));
      ExtTelemetry.sendTelemetryErrorEvent(TelemetryEvent.SignOut, e, {
        [TelemetryProperty.AccountType]: AccountType.Azure,
        [TelemetryProperty.Success]: TelemetrySuccess.No,
        [TelemetryProperty.ErrorType]:
          e instanceof UserError ? TelemetryErrorType.UserError : TelemetryErrorType.SystemError,
        [TelemetryProperty.ErrorCode]: `${e.source as string}.${e.name as string}`,
        [TelemetryProperty.ErrorMessage]: `${e.message as string}`,
      });
      return Promise.resolve(false);
    }
  }

  /**
   * list all subscriptions
   */
  async listSubscriptions(): Promise<SubscriptionInfo[]> {
    const arr: SubscriptionInfo[] = [];
    if (await this.isUserLogin()) {
      const subs = await this.vscodeAzureSubscriptionProvider.getSubscriptions();
      for (let i = 0; i < subs.length; ++i) {
        const item = subs[i];
        arr.push({
          subscriptionId: item.subscriptionId,
          tenantId: item.tenantId,
          subscriptionName: item.name,
        });
      }
    }

    return arr;
  }

  /**
   * set tenantId and subscriptionId
   */
  async setSubscription(subscriptionId: string): Promise<void> {
    if (subscriptionId === "") {
      AzureAccountManager.tenantId = undefined;
      AzureAccountManager.subscriptionId = undefined;
      AzureAccountManager.subscriptionName = undefined;
      return;
    }
    if (await this.isUserLogin()) {
      const subs = await this.vscodeAzureSubscriptionProvider.getSubscriptions();
      for (let i = 0; i < subs.length; ++i) {
        const item = subs[i];
        if (item.subscriptionId === subscriptionId) {
          AzureAccountManager.tenantId = item.tenantId;
          AzureAccountManager.subscriptionId = subscriptionId;
          AzureAccountManager.subscriptionName = item.name;
          return;
        }
      }
    }
    return Promise.reject(
      new UserError(
        "Login",
        ExtensionErrors.UnknownSubscription,
        getDefaultString("teamstoolkit.azureLogin.unknownSubscription"),
        localize("teamstoolkit.azureLogin.unknownSubscription")
      )
    );
  }

  async getStatus(): Promise<LoginStatus> {
    try {
      if (AzureAccountManager.currentStatus === loggingIn) {
        return Promise.resolve({ status: signingIn, token: undefined, accountInfo: undefined });
      }
      if (AzureAccountManager.currentStatus === loggedIn || (await this.isUserLogin())) {
        const credential = await this.doGetIdentityCredentialAsync();
        const token = await credential?.getToken(AzureScopes);
        const accountJson = await this.getJsonObject();
        return Promise.resolve({
          status: signedIn,
          token: token?.token,
          accountInfo: accountJson,
        });
      } else {
        return Promise.resolve({ status: signedOut, token: undefined, accountInfo: undefined });
      }
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async addStatusChangeEvent() {
    if (await this.isUserLogin()) {
      AzureAccountManager.currentStatus = loggedIn;
    }
    vscode.authentication.onDidChangeSessions(async (e) => {
      if (e.provider.id != Microsoft) {
        return;
      }
      if (await this.isUserLogin()) {
        AzureAccountManager.currentStatus = loggedIn;
        await this.notifyStatus();
      } else {
        AzureAccountManager.currentStatus = loggedOut;
        await this.notifyStatus();
      }
    });
  }

  public async clearSub() {
    await this.setSubscription("");
  }

  getAccountInfo(): Record<string, string> | undefined {
    if (AzureAccountManager.currentStatus === loggedIn) {
      return this.getJsonObject() as unknown as Record<string, string>;
    } else {
      return undefined;
    }
  }

  async getSelectedSubscription(triggerUI = false): Promise<SubscriptionInfo | undefined> {
    if (triggerUI) {
      if (AzureAccountManager.currentStatus !== loggedIn) {
        await this.login(true);
      }
      if (AzureAccountManager.currentStatus === loggedIn && !AzureAccountManager.subscriptionId) {
        await this.selectSubscription();
      }
    } else {
      if (AzureAccountManager.currentStatus === loggedIn && !AzureAccountManager.subscriptionId) {
        const subscriptionList = await this.listSubscriptions();
        if (subscriptionList && subscriptionList.length == 1) {
          await this.setSubscription(subscriptionList[0].subscriptionId);
        }
      }
    }
    if (AzureAccountManager.currentStatus === loggedIn && AzureAccountManager.subscriptionId) {
      const selectedSub: SubscriptionInfo = {
        subscriptionId: AzureAccountManager.subscriptionId,
        tenantId: AzureAccountManager.tenantId!,
        subscriptionName: AzureAccountManager.subscriptionName ?? "",
      };
      return selectedSub;
    } else {
      return undefined;
    }
  }

  async selectSubscription(): Promise<void> {
    const subscriptionList = await this.listSubscriptions();
    if (!subscriptionList || subscriptionList.length == 0) {
      throw new UserError(
        getDefaultString("teamstoolkit.codeFlowLogin.loginComponent"),
        getDefaultString("teamstoolkit.azureLogin.noSubscriptionFound"),
        getDefaultString("teamstoolkit.azureLogin.failToFindSubscription"),
        localize("teamstoolkit.azureLogin.failToFindSubscription")
      );
    }
    if (subscriptionList && subscriptionList.length == 1) {
      await this.setSubscription(subscriptionList[0].subscriptionId);
    } else if (subscriptionList.length > 1) {
      const options: OptionItem[] = subscriptionList.map((sub) => {
        return {
          id: sub.subscriptionId,
          label: sub.subscriptionName,
          data: sub.tenantId,
        } as OptionItem;
      });
      const config: SingleSelectConfig = {
        name: localize("teamstoolkit.azureLogin.subscription"),
        title: localize("teamstoolkit.azureLogin.selectSubscription"),
        options: options,
      };
      const result = await VS_CODE_UI.selectOption(config);
      if (result.isErr()) {
        throw result.error;
      } else {
        const subId = result.value.result as string;
        await this.setSubscription(subId);
      }
    }
  }
}

export default AzureAccountManager.getInstance();
