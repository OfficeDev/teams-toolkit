// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  err,
  FxError,
  ok,
  Result,
  SubscriptionInfo,
  SystemError,
  TreeCategory,
  TreeItem,
  Void,
} from "@microsoft/teamsfx-api";
import AppStudioLogin from "./commonlib/appStudioLogin";
import AzureAccountManager from "./commonlib/azureLogin";
import { core, getSystemInputs, tools, getAzureSolutionSettings } from "./handlers";
import { askSubscription, getSideloadingStatus, isValidProject } from "@microsoft/teamsfx-core";
import { VS_CODE_UI } from "./extension";
import { ExtTelemetry } from "./telemetry/extTelemetry";
import {
  AccountType,
  TelemetryEvent,
  TelemetryProperty,
  TelemetryTiggerFrom,
} from "./telemetry/extTelemetryEvents";
import axios from "axios";
import * as util from "util";
import * as StringResources from "./resources/Strings.json";
import { StringContext } from "./utils/stringContext";
import { registerEnvTreeHandler } from "./envTree";
import { TreeViewCommand } from "./treeview/commandsTreeViewProvider";

export async function getSubscriptionId(): Promise<string | undefined> {
  const subscriptionInfo = await AzureAccountManager.getSelectedSubscription();
  if (subscriptionInfo) {
    return subscriptionInfo.subscriptionId;
  }
  // else {
  //   showError(projectConfigRes.error);
  // }
  return undefined;
}

export async function isValid(): Promise<boolean> {
  const input = getSystemInputs();
  input.ignoreEnvInfo = true;

  const supported = isValidProject(input.projectPath);

  return supported;
}

export async function registerAccountTreeHandler(): Promise<Result<Void, FxError>> {
  let getSelectSubItem: undefined | ((token: any) => Promise<[TreeItem, boolean]>) = undefined;
  getSelectSubItem = async (token: any): Promise<[TreeItem, boolean]> => {
    let selectSubLabel = "";
    const subscriptions: SubscriptionInfo[] | undefined =
      await tools.tokenProvider.azureAccountProvider.listSubscriptions();
    if (subscriptions) {
      const activeSubscriptionId = await getSubscriptionId();
      const activeSubscription = subscriptions.find(
        (subscription) => subscription.subscriptionId === activeSubscriptionId
      );
      let icon = "";
      let contextValue = "selectSubscription";
      const valid = await isValid();
      if (activeSubscriptionId === undefined || activeSubscription === undefined) {
        selectSubLabel = util.format(
          StringResources.vsc.accountTree.totalSubscriptions,
          subscriptions.length
        );
        icon = "subscriptions";
        if (subscriptions.length === 0) {
          contextValue = "emptySubscription";
          selectSubLabel = StringResources.vsc.accountTree.noSubscriptions;
          return [
            {
              commandId: "fx-extension.selectSubscription",
              label: selectSubLabel,
              callback: () => {
                return Promise.resolve(ok(null));
              },
              parent: "fx-extension.signinAzure",
              contextValue: valid ? contextValue : "invalidFxProject",
              icon: "warning",
              tooltip: {
                isMarkdown: false,
                value: StringResources.vsc.accountTree.noSubscriptionsTooltip,
              },
            },
            true,
          ];
        }

        if (subscriptions.length === 1) {
          await setSubscription(subscriptions[0]);
          selectSubLabel = subscriptions[0].subscriptionName;
          icon = "subscriptionSelected";
        }
      } else {
        selectSubLabel = activeSubscription.subscriptionName;
        icon = "subscriptionSelected";
      }
      return [
        {
          commandId: "fx-extension.selectSubscription",
          label: selectSubLabel,
          callback: () => {
            return Promise.resolve(ok(null));
          },
          parent: "fx-extension.signinAzure",
          contextValue: valid ? contextValue : "invalidFxProject",
          icon: icon,
        },
        !(activeSubscriptionId === undefined || activeSubscription === undefined) ||
          subscriptions.length === 1,
      ];
    } else {
      return [
        {
          commandId: "fx-extension.selectSubscription",
          label: selectSubLabel,
          callback: () => {
            return Promise.resolve(ok(null));
          },
          parent: "fx-extension.signinAzure",
          contextValue: "invalidFxProject",
          icon: "subscriptions",
        },
        false,
      ];
    }
  };

  const getSideloadingItem = async (token: string): Promise<TreeItem[]> => {
    const isSideloadingAllowed = await getSideloadingStatus(token);
    if (isSideloadingAllowed === undefined) {
      // show nothing if internal error (TODO: may add back if full status is required later)
      return [];
    } else if (isSideloadingAllowed === true) {
      return [
        {
          commandId: "fx-extension.checkSideloading",
          label: StringResources.vsc.accountTree.sideloadingPass,
          callback: () => {
            return Promise.resolve(ok(null));
          },
          parent: "fx-extension.signinM365",
          contextValue: "checkSideloading",
          icon: "pass",
          tooltip: {
            isMarkdown: false,
            value: StringResources.vsc.accountTree.sideloadingPassTooltip,
          },
        },
      ];
    } else {
      showSideloadingWarning();
      return [
        {
          commandId: "fx-extension.checkSideloading",
          label: StringResources.vsc.accountTree.sideloadingWarning,
          callback: () => {
            showSideloadingWarning();
            return Promise.resolve(ok(null));
          },
          parent: "fx-extension.signinM365",
          contextValue: "checkSideloading",
          icon: "warning",
          tooltip: {
            isMarkdown: false,
            value: StringResources.vsc.accountTree.sideloadingWarningTooltip,
          },
        },
      ];
    }
  };

  const selectSubscriptionCallback = async (args?: any[]): Promise<Result<null, FxError>> => {
    tools.telemetryReporter?.sendTelemetryEvent(TelemetryEvent.SelectSubscription, {
      [TelemetryProperty.TriggerFrom]: args
        ? TelemetryTiggerFrom.TreeView
        : TelemetryTiggerFrom.Other,
    });
    const askSubRes = await askSubscription(
      tools.tokenProvider.azureAccountProvider,
      VS_CODE_UI,
      undefined
    );
    if (askSubRes.isErr()) return err(askSubRes.error);
    await setSubscription(askSubRes.value);
    return ok(null);
  };

  const refreshSideloadingCallback = async (args?: any[]): Promise<Result<null, FxError>> => {
    const status = await AppStudioLogin.getStatus();
    if (status.token !== undefined) {
      const subItem = await getSideloadingItem(status.token);
      if (subItem && subItem.length > 0) {
        tools.treeProvider?.refresh(subItem);
      } else {
        // nothing to show, remove status
        tools.treeProvider?.remove([
          {
            commandId: "fx-extension.checkSideloading",
            label: "",
            parent: "fx-extension.signinM365",
          },
        ]);
      }
    }

    return ok(null);
  };

  const signinM365Callback = async (args?: any[]): Promise<Result<null, FxError>> => {
    if (args && args.length > 1) {
      const command: TreeViewCommand = args[1];
      if (command && command.contextValue === "signedinM365") return ok(null);
    }

    tools.telemetryReporter?.sendTelemetryEvent(TelemetryEvent.LoginClick, {
      [TelemetryProperty.TriggerFrom]:
        args && args.length > 0 ? TelemetryTiggerFrom.TreeView : TelemetryTiggerFrom.CommandPalette,
      [TelemetryProperty.AccountType]: AccountType.M365,
    });

    const token = await tools.tokenProvider.appStudioToken.getJsonObject(true);
    if (token !== undefined) {
      tools.treeProvider?.refresh([
        {
          commandId: "fx-extension.signinM365",
          label: (token as any).upn ? (token as any).upn : "",
          callback: signinM365Callback,
          parent: TreeCategory.Account,
          contextValue: "signedinM365",
          icon: "M365",
        },
      ]);
    }

    await registerEnvTreeHandler();
    return ok(null);
  };

  const signinAzureCallback = async (args?: any[]): Promise<Result<null, FxError>> => {
    if (args && args.length > 1) {
      const command: TreeViewCommand = args[1];
      if (command && command.contextValue === "signedinAzure") return ok(null);
    }

    if (AzureAccountManager.getAccountInfo() === undefined) {
      tools.telemetryReporter?.sendTelemetryEvent(TelemetryEvent.LoginClick, {
        [TelemetryProperty.TriggerFrom]:
          args && args.length > 0
            ? TelemetryTiggerFrom.TreeView
            : TelemetryTiggerFrom.CommandPalette,
        [TelemetryProperty.AccountType]: AccountType.Azure,
      });
    }
    const showDialog = args && args[1] !== undefined ? args[1] : true;
    const token = await AzureAccountManager.getAccountCredentialAsync(showDialog);
    if (token !== undefined) {
      tools.treeProvider?.refresh([
        {
          commandId: "fx-extension.signinAzure",

          label: (token as any).username ? (token as any).username : "",
          callback: signinAzureCallback,
          parent: TreeCategory.Account,
          contextValue: "signedinAzure",
        },
      ]);

      const subItem = await getSelectSubItem!(token);
      tools.treeProvider?.add([subItem[0]]);

      if (!subItem[1]) {
        const solutionSettings = await getAzureSolutionSettings();
        if (solutionSettings && "Azure" === solutionSettings.hostType) {
          await selectSubscriptionCallback();
        }
      }
    }

    await registerEnvTreeHandler();
    return ok(null);
  };

  const m365AccountCallback = async (
    status: string,
    token?: string | undefined,
    accountInfo?: Record<string, unknown> | undefined
  ) => {
    if (status === "SignedIn") {
      if (token !== undefined && accountInfo !== undefined) {
        const treeItem = {
          commandId: "fx-extension.signinM365",
          label: (accountInfo.upn as string) ? (accountInfo.upn as string) : "",
          callback: signinM365Callback,
          parent: TreeCategory.Account,
          contextValue: "signedinM365",
          icon: "M365",
        };
        tools.treeProvider?.refresh([treeItem]);
        const subItem = await getSideloadingItem(token);
        if (subItem && subItem.length > 0) {
          tools.treeProvider?.add(subItem);

          // this is a workaround to expand this child, to be improved when TreeView.reveal is supported
          treeItem.label += " ";
          tools.treeProvider?.refresh([treeItem]);
        }
      }
    } else if (status === "SigningIn") {
      tools.treeProvider?.refresh([
        {
          commandId: "fx-extension.signinM365",
          label: StringResources.vsc.accountTree.signingInM365,
          callback: signinM365Callback,
          parent: TreeCategory.Account,
          icon: "spinner",
        },
      ]);
    } else if (status === "SignedOut") {
      tools.treeProvider?.refresh([
        {
          commandId: "fx-extension.signinM365",
          label: StringResources.vsc.handlers.signIn365,
          callback: signinM365Callback,
          parent: TreeCategory.Account,
          icon: "M365",
          contextValue: "signinM365",
        },
      ]);
      tools.treeProvider?.remove([
        {
          commandId: "fx-extension.checkSideloading",
          label: "",
          parent: "fx-extension.signinM365",
        },
      ]);
    }
    return Promise.resolve();
  };

  tools.tokenProvider.appStudioToken?.setStatusChangeMap("tree-view", m365AccountCallback);
  tools.tokenProvider.sharepointTokenProvider?.setStatusChangeMap("tree-view", m365AccountCallback);
  tools.tokenProvider.graphTokenProvider?.setStatusChangeMap("tree-view", m365AccountCallback);

  tools.tokenProvider.azureAccountProvider?.setStatusChangeMap(
    "tree-view",
    async (
      status: string,
      token?: string | undefined,
      accountInfo?: Record<string, unknown> | undefined
    ) => {
      if (status === "SignedIn") {
        const token = await tools.tokenProvider.azureAccountProvider.getAccountCredentialAsync();
        if (token !== undefined) {
          tools.treeProvider?.refresh([
            {
              commandId: "fx-extension.signinAzure",
              label: (token as any).username ? (token as any).username : "",
              callback: signinAzureCallback,
              parent: TreeCategory.Account,
              contextValue: "signedinAzure",
              icon: "azure",
            },
          ]);
          const subItem = await getSelectSubItem!(token);
          tools.treeProvider?.add([subItem[0]]);
          await registerEnvTreeHandler();
        }
      } else if (status === "SigningIn") {
        tools.treeProvider?.refresh([
          {
            commandId: "fx-extension.signinAzure",
            label: StringResources.vsc.accountTree.signingInAzure,
            callback: signinAzureCallback,
            parent: TreeCategory.Account,
            icon: "spinner",
          },
        ]);
      } else if (status === "SignedOut") {
        tools.treeProvider?.refresh([
          {
            commandId: "fx-extension.signinAzure",
            label: StringContext.getSignInAzureContext(),
            callback: signinAzureCallback,
            parent: TreeCategory.Account,
            icon: "azure",
            contextValue: "signinAzure",
          },
        ]);
        tools.treeProvider?.remove([
          {
            commandId: "fx-extension.selectSubscription",
            label: "",
            parent: "fx-extension.signinAzure",
          },
        ]);
        await registerEnvTreeHandler();
      }

      return Promise.resolve();
    }
  );

  const signinM365TreeItem: TreeItem = {
    commandId: "fx-extension.signinM365",
    label: StringResources.vsc.handlers.signIn365,
    callback: signinM365Callback,
    parent: TreeCategory.Account,
    contextValue: "signinM365",
    subTreeItems: [],
    icon: "M365",
    tooltip: {
      isMarkdown: true,
      value: StringResources.vsc.accountTree.m365AccountTooltip,
    },
  };

  const refreshSideloadingTreeItem: TreeItem = {
    commandId: "fx-extension.refreshSideloading",
    label: StringResources.vsc.accountTree.sideloadingRefresh,
    callback: refreshSideloadingCallback,
    parent: undefined,
  };

  const signinAzureTreeItem: TreeItem = {
    commandId: "fx-extension.signinAzure",
    label: StringContext.getSignInAzureContext(),
    callback: async (args?: any[]) => {
      return signinAzureCallback(args);
    },
    parent: TreeCategory.Account,
    contextValue: "signinAzure",
    subTreeItems: [],
    icon: "azure",
    tooltip: {
      isMarkdown: true,
      value: StringResources.vsc.accountTree.azureAccountTooltip,
    },
  };

  const specifySubscriptionTreeItem: TreeItem = {
    commandId: "fx-extension.specifySubscription",
    label: StringResources.vsc.accountTree.specifySubscription,
    callback: selectSubscriptionCallback,
    parent: undefined,
  };

  const solutionSettings = await getAzureSolutionSettings();
  if (solutionSettings && "SPFx" === solutionSettings.hostType) {
    tools.treeProvider!.add([signinM365TreeItem, refreshSideloadingTreeItem]);
  } else {
    tools.treeProvider!.add([
      signinM365TreeItem,
      refreshSideloadingTreeItem,
      signinAzureTreeItem,
      specifySubscriptionTreeItem,
    ]);
  }

  return ok(Void);
}

async function setSubscription(subscription: SubscriptionInfo | undefined) {
  if (subscription) {
    const inputs = getSystemInputs();
    inputs.tenantId = subscription.tenantId;
    inputs.subscriptionId = subscription.subscriptionId;
    await tools.tokenProvider.azureAccountProvider.setSubscription(subscription.subscriptionId);
    tools.treeProvider?.refresh([
      {
        commandId: "fx-extension.selectSubscription",
        label: subscription.subscriptionName,
        callback: () => {
          return Promise.resolve(ok(null));
        },
        parent: "fx-extension.signinAzure",
        contextValue: "selectSubscription",
        icon: "subscriptionSelected",
        tooltip: {
          isMarkdown: false,
          value: subscription.subscriptionName,
        },
      },
    ]);
  }
}

function showSideloadingWarning() {
  VS_CODE_UI.showMessage(
    "warn",
    StringResources.vsc.accountTree.sideloadingMessage,
    false,
    StringResources.vsc.accountTree.sideloadingJoinM365,
    StringResources.vsc.common.readMore
  )
    .then(async (result) => {
      if (result.isOk() && result.value === StringResources.vsc.common.readMore) {
        await VS_CODE_UI.openUrl("https://aka.ms/teamsfx-custom-app");
        ExtTelemetry.sendTelemetryEvent(TelemetryEvent.OpenSideloadingReadmore);
      } else if (
        result.isOk() &&
        result.value === StringResources.vsc.accountTree.sideloadingJoinM365
      ) {
        await VS_CODE_UI.openUrl("https://developer.microsoft.com/microsoft-365/dev-program");
        ExtTelemetry.sendTelemetryEvent(TelemetryEvent.OpenSideloadingJoinM365);
      }
    })
    .catch((error) => {});
}
