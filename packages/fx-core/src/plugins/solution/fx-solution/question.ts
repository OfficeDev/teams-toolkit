// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
  FuncQuestion,
  Inputs,
  MultiSelectQuestion,
  ok,
  OptionItem,
  OptionItemKind,
  TextInputQuestion,
  Void,
} from "@microsoft/teamsfx-api";
import { isBotNotificationEnabled } from "../../../common/featureFlags";
import { getLocalizedString } from "../../../common/localizeUtils";

export const TabOptionItem: OptionItem = {
  id: "Tab",
  label: isBotNotificationEnabled() ? "SSO enabled launch page" : "Tab",
  cliName: "tab",
  description: isBotNotificationEnabled()
    ? undefined
    : getLocalizedString("core.TabOption.description"),
  detail: isBotNotificationEnabled()
    ? getLocalizedString("core.TabOption.detailNew")
    : getLocalizedString("core.TabOption.detail"),
};

export const BotOptionItem: OptionItem = {
  id: "Bot",
  label: "Bot",
  cliName: "bot",
  description: getLocalizedString("core.BotOption.description"),
  detail: getLocalizedString("core.BotOption.detail"),
};

export const NotificationOptionItem: OptionItem = {
  id: "Notification",
  label: getLocalizedString("core.NotificationOption.label"),
  cliName: "notification",
  detail: getLocalizedString("core.NotificationOption.detail"),
};

export const CommandAndResponseOptionItem: OptionItem = {
  // For default option, id and cliName must be the same
  id: "command-bot",
  label: getLocalizedString("core.CommandAndResponseOption.label"),
  cliName: "command-bot",
  detail: getLocalizedString("core.CommandAndResponseOption.detail"),
};

export const ExistingTabOptionItem: OptionItem = {
  id: "ExistingTab",
  label: getLocalizedString("core.ExistingTabOption.label"),
  cliName: "existing-tab",
  detail: getLocalizedString("core.ExistingTabOption.detail"),
};

export const MessageExtensionItem: OptionItem = {
  id: "MessagingExtension",
  label: isBotNotificationEnabled()
    ? getLocalizedString("core.MessageExtensionOption.labelNew")
    : getLocalizedString("core.MessageExtensionOption.label"),
  cliName: "messaging-extension",
  description: isBotNotificationEnabled()
    ? undefined
    : getLocalizedString("core.MessageExtensionOption.description"),
  detail: getLocalizedString("core.MessageExtensionOption.detail"),
};

export const TabSPFxItem: OptionItem = {
  id: "TabSPFx",
  label: isBotNotificationEnabled()
    ? getLocalizedString("core.TabSPFxOption.labelNew")
    : getLocalizedString("core.TabSPFxOption.label"),
  cliName: "tab-spfx",
  description: isBotNotificationEnabled()
    ? undefined
    : getLocalizedString("core.TabSPFxOption.description"),
  detail: isBotNotificationEnabled()
    ? getLocalizedString("core.TabSPFxOption.detailNew")
    : getLocalizedString("core.TabSPFxOption.detail"),
};

export const TabSsoItem: OptionItem = {
  id: "TabSSO",
  label: "TabSSO",
  cliName: "tab-sso",
  description: getLocalizedString("core.TabSso.description"),
  detail: getLocalizedString("core.TabSso.detail"),
};

export const BotSsoItem: OptionItem = {
  id: "BotSSO",
  label: "BotSSO",
  cliName: "bot-sso",
  description: getLocalizedString("core.BotSso.description"),
  detail: getLocalizedString("core.BotSso.detail"),
};

export const TabNonSsoItem: OptionItem = {
  id: "TabNonSso",
  label: getLocalizedString("core.TabNonSso.label"),
  cliName: "tab-non-sso",
  description: getLocalizedString("core.TabNonSso.description"),
  detail: getLocalizedString("core.TabNonSso.detail"),
};

export const M365SsoLaunchPageOptionItem: OptionItem = {
  id: "M365SsoLaunchPage",
  label: "SSO enabled launch page",
  cliName: "sso-launch-page",
  detail: getLocalizedString("core.M365SsoLaunchPageOptionItem.detail"),
};

export const M365SearchAppOptionItem: OptionItem = {
  id: "M365SearchApp",
  label: "Search app",
  cliName: "search-app",
  detail: getLocalizedString("core.M365SearchAppOptionItem.detail"),
};

export const TeamsAppSeparatorOptionItem: OptionItem = {
  id: "TeamsAppSeparator",
  label: getLocalizedString("core.TeamsAppSeparatorOptionItem.label"),
  kind: OptionItemKind.Separator,
};

export const TeamsM365AppSeparatorOptionItem: OptionItem = {
  id: "TeamsM365AppSeparator",
  label: getLocalizedString("core.TeamsM365AppSeparatorOptionItem.label"),
  kind: OptionItemKind.Separator,
};

export enum AzureSolutionQuestionNames {
  Capabilities = "capabilities",
  TabScopes = "tab-scopes",
  HostType = "host-type",
  AzureResources = "azure-resources",
  PluginSelectionDeploy = "deploy-plugin",
  AddResources = "add-azure-resources",
  AppName = "app-name",
  AskSub = "subscription",
  ProgrammingLanguage = "programming-language",
  Solution = "solution",
  Scenarios = "scenarios",
}

export const HostTypeOptionAzure: OptionItem = {
  id: "Azure",
  label: getLocalizedString("core.HostTypeOptionAzure.label"),
  cliName: "azure",
};

export const HostTypeOptionSPFx: OptionItem = {
  id: "SPFx",
  label: getLocalizedString("core.HostTypeOptionSPFx.label"),
  cliName: "spfx",
};

export const AzureResourceSQL: OptionItem = {
  id: "sql",
  label: getLocalizedString("core.AzureResourceSQL.label"),
  description: getLocalizedString("core.AzureResourceSQL.description"),
};

export const AzureResourceFunction: OptionItem = {
  id: "function",
  label: getLocalizedString("core.AzureResourceFunction.label"),
};

export const AzureResourceApim: OptionItem = {
  id: "apim",
  label: getLocalizedString("core.AzureResourceApim.label"),
  description: getLocalizedString("core.AzureResourceApim.description"),
};

export const AzureResourceKeyVault: OptionItem = {
  id: "keyvault",
  label: getLocalizedString("core.AzureResourceKeyVault.label"),
  description: getLocalizedString("core.AzureResourceKeyVault.description"),
};

export enum BotScenario {
  NotificationBot = "notificationBot",
  CommandAndResponseBot = "commandAndResponseBot",
}

export const BotNotificationTriggers = {
  Timer: "timer",
  Http: "http",
} as const;

export type BotNotificationTrigger =
  typeof BotNotificationTriggers[keyof typeof BotNotificationTriggers];

export const AzureResourcesQuestion: MultiSelectQuestion = {
  name: AzureSolutionQuestionNames.AzureResources,
  title: "Cloud resources",
  type: "multiSelect",
  staticOptions: [AzureResourceSQL, AzureResourceFunction],
  default: [],
  onDidChangeSelection: async function (
    currentSelectedIds: Set<string>,
    previousSelectedIds: Set<string>
  ): Promise<Set<string>> {
    if (currentSelectedIds.has(AzureResourceSQL.id)) {
      currentSelectedIds.add(AzureResourceFunction.id);
    }
    return currentSelectedIds;
  },
  placeholder: "Select a resource (optional)",
};

export function createAddAzureResourceQuestion(
  alreadyHaveFunction: boolean,
  alreadyHaveSQL: boolean,
  alreadyHaveAPIM: boolean,
  alreadyHaveKeyVault: boolean
): MultiSelectQuestion {
  const options: OptionItem[] = [AzureResourceFunction, AzureResourceSQL];
  if (!alreadyHaveAPIM) options.push(AzureResourceApim);
  if (!alreadyHaveKeyVault) options.push(AzureResourceKeyVault);
  return {
    name: AzureSolutionQuestionNames.AddResources,
    title: "Cloud resources",
    type: "multiSelect",
    staticOptions: options,
    default: [],
    onDidChangeSelection: async function (
      currentSelectedIds: Set<string>,
      previousSelectedIds: Set<string>
    ): Promise<Set<string>> {
      const hasSQL = currentSelectedIds.has(AzureResourceSQL.id);
      const hasAPIM = currentSelectedIds.has(AzureResourceApim.id);
      if ((hasSQL || hasAPIM) && !alreadyHaveFunction) {
        currentSelectedIds.add(AzureResourceFunction.id);
      }
      return currentSelectedIds;
    },
  };
}

export function addCapabilityQuestion(
  alreadyHaveTab: boolean,
  alreadyHaveBot: boolean
): MultiSelectQuestion {
  const options: OptionItem[] = [];
  if (!alreadyHaveTab) options.push(TabOptionItem);
  if (!alreadyHaveBot) {
    options.push(BotOptionItem);
    options.push(MessageExtensionItem);
    options.push(NotificationOptionItem);
    options.push(CommandAndResponseOptionItem);
  }
  return {
    name: AzureSolutionQuestionNames.Capabilities,
    title: isBotNotificationEnabled()
      ? getLocalizedString("core.addCapabilityQuestion.titleNew")
      : getLocalizedString("core.addCapabilityQuestion.title"),
    type: "multiSelect",
    staticOptions: options,
    default: [],
  };
}

export const DeployPluginSelectQuestion: MultiSelectQuestion = {
  name: AzureSolutionQuestionNames.PluginSelectionDeploy,
  title: `Select resources`,
  type: "multiSelect",
  skipSingleOption: true,
  staticOptions: [],
  default: [],
};

export const AskSubscriptionQuestion: FuncQuestion = {
  name: AzureSolutionQuestionNames.AskSub,
  type: "func",
  func: async (inputs: Inputs): Promise<Void> => {
    return ok(Void);
  },
};

export function getUserEmailQuestion(currentUserEmail: string): TextInputQuestion {
  let defaultUserEmail = "";
  if (currentUserEmail && currentUserEmail.indexOf("@") > 0) {
    defaultUserEmail = "[UserName]@" + currentUserEmail.split("@")[1];
  }
  return {
    name: "email",
    type: "text",
    title: getLocalizedString("core.getUserEmailQuestion.title"),
    default: defaultUserEmail,
    validation: {
      validFunc: (input: string, previousInputs?: Inputs): string | undefined => {
        if (!input || input.trim() === "") {
          return getLocalizedString("core.getUserEmailQuestion.validation1");
        }

        input = input.trim();

        if (input === defaultUserEmail) {
          return getLocalizedString("core.getUserEmailQuestion.validation2");
        }

        const re = /\S+@\S+\.\S+/;
        if (!re.test(input)) {
          return getLocalizedString("core.getUserEmailQuestion.validation3");
        }
        return undefined;
      },
    },
  };
}
