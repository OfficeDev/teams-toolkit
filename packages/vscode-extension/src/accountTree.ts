
  // Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AzureSolutionSettings, err, FxError, ok, Result, returnSystemError, returnUserError, SubscriptionInfo, TreeCategory, TreeItem, Void } from "@microsoft/teamsfx-api";
import { AzureAccount } from "./commonlib/azure-account.api";
import AzureAccountManager from "./commonlib/azureLogin";
import { ExtensionSource } from "./error";
import { core, getSystemInputs, tools } from "./handlers";
import * as vscode from "vscode";

 
enum TelemetryTiggerFrom {
  CommandPalette = "CommandPalette",
  TreeView = "TreeView",
}

enum TelemetryProperty {
  TriggerFrom = "trigger-from",
}

enum TelemetryEvent {
  SelectSubscription = "select-subscription",
}

export enum AccountType {
  M365 = "m365",
  Azure = "azure",
}


export async function registerAccountTreeHandler(): Promise<Result<Void, FxError>> {
  
  let activeSubscriptionId:string|undefined = undefined;
  const projectConfigRes = await core.getProjectConfig(getSystemInputs());
  let supported = false;
  let solutionSettings:AzureSolutionSettings;
  if(projectConfigRes.isOk()){
    if(projectConfigRes.value){
      supported = true;
      const solutionConfig = projectConfigRes.value.config;
      if(solutionConfig){
        activeSubscriptionId = solutionConfig.get("solution")?.get("subscriptionId");
      }
      solutionSettings = projectConfigRes.value.settings?.solutionSettings as AzureSolutionSettings;
    }
  }
  let getSelectSubItem:
    | undefined
    | ((token: any, valid: boolean) => Promise<[TreeItem, boolean]>) = undefined;
  
  getSelectSubItem = async (token: any, valid: boolean): Promise<[TreeItem, boolean]> => {
    let selectSubLabel = "";
    const subscriptions: SubscriptionInfo[] | undefined =
      await tools.tokenProvider.azureAccountProvider.listSubscriptions();
    if (subscriptions) {
      const activeSubscription = subscriptions.find(
        (subscription) => subscription.subscriptionId === activeSubscriptionId
      );
      let icon = "";
      let contextValue = "selectSubscription";
      if (activeSubscriptionId === undefined || activeSubscription === undefined) {
        selectSubLabel = `${subscriptions.length} subscriptions discovered`;
        icon = "subscriptions";

        if (subscriptions.length === 0) {
          contextValue = "emptySubscription";
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

  const selectSubscriptionCallback = async (args?: any[]): Promise<Result<null, FxError>> => {
    tools.telemetryReporter.sendTelemetryEvent(TelemetryEvent.SelectSubscription, {
      [TelemetryProperty.TriggerFrom]:
        args && args.toString() === "TreeView"
          ? TelemetryTiggerFrom.TreeView
          : TelemetryTiggerFrom.CommandPalette,
    });

    // const azureToken = await tools.tokenProvider.azureAccountProvider.getAccountCredentialAsync();
    const subscriptions: SubscriptionInfo[] | undefined =
      await tools.tokenProvider.azureAccountProvider?.listSubscriptions();
    if (!subscriptions) {
      return err(
        returnSystemError(
          new Error("No subscription was found"),
          ExtensionSource,
          "InvalidContext"
        )
      );
    }
    const subscriptionNames: string[] = subscriptions.map(
      (subscription) => subscription.subscriptionName
    );
    const askRes = await tools.ui.selectOption({
      name: "askSub",
      title: "Please select a subscription",
      options: subscriptionNames
    });
    let subscriptionName:string|undefined;
    if(askRes.isOk()){
      subscriptionName = askRes.value?.result as string;
    }
    if (subscriptionName === undefined || subscriptionName == "unknown") {
      return err(
        returnUserError(
          new Error("No subscription selected"),
          ExtensionSource,
          "NoSubscriptionSelected"
        )
      );
    }
    const subscription = subscriptions.find(
      (subscription) => subscription.subscriptionName === subscriptionName
    );
    setSubscription(subscription);
    return ok(null);
  };

  const signinM365Callback = async (args?: any[]): Promise<Result<null, FxError>> => {
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

    return ok(null);
  };

  const signinAzureCallback = async (
    validFxProject: boolean,
    args?: any[]
  ): Promise<Result<null, FxError>> => {
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

      const subItem = await getSelectSubItem!(token, validFxProject);
      tools.treeProvider?.add([subItem[0]]);

      if (validFxProject && !subItem[1]) {
        if (solutionSettings && "Azure" === solutionSettings.hostType) {
          await selectSubscriptionCallback();
        }
      }
    }

    return ok(null);
  };

  let azureAccountLabel = "Sign in to Azure";
  let azureAccountContextValue = "signinAzure";
  const azureAccount: AzureAccount = vscode.extensions.getExtension<AzureAccount>("ms-vscode.azure-account")!.exports;
  if (azureAccount.status === "LoggedIn") {
    const token = await tools.tokenProvider.azureAccountProvider.getAccountCredentialAsync();
    if (token !== undefined) {
      azureAccountLabel = (token as any).username ? (token as any).username : "";
      azureAccountContextValue = "signedinAzure";
    }
  }
  tools.tokenProvider.appStudioToken?.setStatusChangeMap(
    "tree-view",
    (
      status: string,
      token?: string | undefined,
      accountInfo?: Record<string, unknown> | undefined
    ) => {
      if (status === "SignedIn") {
        signinM365Callback();
      } else if (status === "SigningIn") {
        tools.treeProvider?.refresh([
          {
            commandId: "fx-extension.signinM365",
            label: "M365: Signing in...",
            callback: signinM365Callback,
            parent: TreeCategory.Account,
            icon: "spinner",
          },
        ]);
      } else if (status === "SignedOut") {
        tools.treeProvider?.refresh([
          {
            commandId: "fx-extension.signinM365",
            label: "Sign in to M365",
            callback: signinM365Callback,
            parent: TreeCategory.Account,
            icon: "M365",
            contextValue: "signinM365",
          },
        ]);
      }
      return Promise.resolve();
    }
  );
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
          const subItem = await getSelectSubItem!(token, supported);
          tools.treeProvider?.add([subItem[0]]);
        }
      } else if (status === "SigningIn") {
        tools.treeProvider?.refresh([
          {
            commandId: "fx-extension.signinAzure",
            label: "Azure: Signing in...",
            callback: signinAzureCallback,
            parent: TreeCategory.Account,
            icon: "spinner",
          },
        ]);
      } else if (status === "SignedOut") {
        tools.treeProvider?.refresh([
          {
            commandId: "fx-extension.signinAzure",
            label: "Sign in to Azure",
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
            parent: "fx-extension.signinAzure"
          }
        ]);
        await core.setSubscriptionInfo(getSystemInputs());
      }

      return Promise.resolve();
    }
  );

  tools.treeProvider!.add([
    {
      commandId: "fx-extension.signinM365",
      label: "Sign in to M365",
      callback: signinM365Callback,
      parent: TreeCategory.Account,
      contextValue: "signinM365",
      icon: "M365",
      tooltip: {
        isMarkdown: true,
        value:
          "M365 ACCOUNT  \nThe Teams Toolkit requires an Microsoft 365 organizational account where Teams is running and has been registered.",
      },
    },
    {
      commandId: "fx-extension.signinAzure",
      label: azureAccountLabel,
      callback: async (args?: any[]) => {
        return signinAzureCallback(supported, args);
      },
      parent: TreeCategory.Account,
      contextValue: azureAccountContextValue,
      subTreeItems: [],
      icon: "azure",
      tooltip: {
        isMarkdown: true,
        value:
          "AZURE ACCOUNT  \nThe Teams Toolkit may require an Azure subscription to deploy the Azure resources for your project.",
      },
    },
    {
      commandId: "fx-extension.specifySubscription",
      label: "Specify subscription",
      callback: selectSubscriptionCallback,
      parent: undefined,
    },
  ]);
  

  return ok(Void);
}



   
async function setSubscription(subscription: SubscriptionInfo | undefined) {
  if (subscription) {
    const inputs = getSystemInputs();
    inputs.tenantId = subscription.tenantId;
    inputs.subscriptionId = subscription.subscriptionId;
    await core.setSubscriptionInfo(inputs);
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
      },
    ]);
  }
}