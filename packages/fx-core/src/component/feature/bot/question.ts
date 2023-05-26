// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { Inputs, SingleSelectQuestion, OptionItem, Platform } from "@microsoft/teamsfx-api";
import { isPreviewFeaturesEnabled } from "../../../common/featureFlags";
import { getLocalizedString } from "../../../common/localizeUtils";
import { AzureSolutionQuestionNames, NotificationOptionItem } from "../../constants";
import { Runtime } from "../../constants";
import { NotificationTrigger, NotificationTriggers, QuestionNames } from "./constants";

enum HostType {
  AppService = "app-service",
  Functions = "azure-functions",
}

export interface HostTypeTriggerOptionItem extends OptionItem {
  hostType: HostType;
  triggers?: NotificationTrigger[];
}

// NOTE: id must be the sample as cliName to prevent parsing error for CLI default value.
export function FunctionsTimerTriggerOptionItem(): HostTypeTriggerOptionItem {
  return {
    id: "timer-functions",
    hostType: HostType.Functions,
    triggers: [NotificationTriggers.TIMER],
    label: getLocalizedString("plugins.bot.triggers.timer-functions.label"),
    cliName: getLocalizedString("plugins.bot.triggers.timer-functions.cliName"),
    description: getLocalizedString("plugins.bot.triggers.timer-functions.description"),
    detail: getLocalizedString("plugins.bot.triggers.timer-functions.detail"),
  };
}

export function FunctionsHttpAndTimerTriggerOptionItem(): HostTypeTriggerOptionItem {
  return {
    id: "http-and-timer-functions",
    hostType: HostType.Functions,
    triggers: [NotificationTriggers.HTTP, NotificationTriggers.TIMER],
    label: getLocalizedString("plugins.bot.triggers.http-and-timer-functions.label"),
    cliName: getLocalizedString("plugins.bot.triggers.http-and-timer-functions.cliName"),
    description: getLocalizedString("plugins.bot.triggers.http-and-timer-functions.description"),
    detail: getLocalizedString("plugins.bot.triggers.http-and-timer-functions.detail"),
  };
}

export function FunctionsHttpTriggerOptionItem(): HostTypeTriggerOptionItem {
  return {
    id: "http-functions",
    hostType: HostType.Functions,
    triggers: [NotificationTriggers.HTTP],
    label: getLocalizedString("plugins.bot.triggers.http-functions.label"),
    cliName: getLocalizedString("plugins.bot.triggers.http-functions.cliName"),
    description: getLocalizedString("plugins.bot.triggers.http-functions.description"),
    detail: getLocalizedString("plugins.bot.triggers.http-functions.detail"),
  };
}

export function AppServiceOptionItem(): HostTypeTriggerOptionItem {
  return {
    id: "http-restify",
    hostType: HostType.AppService,
    label: getLocalizedString("plugins.bot.triggers.http-restify.label"),
    cliName: getLocalizedString("plugins.bot.triggers.http-restify.cliName"),
    description: getLocalizedString("plugins.bot.triggers.http-restify.description"),
    detail: getLocalizedString("plugins.bot.triggers.http-restify.detail"),
  };
}

// TODO: this option will not be shown in UI, leave messages empty.
export function AppServiceOptionItemForVS(): HostTypeTriggerOptionItem {
  return {
    id: "http-webapi",
    hostType: HostType.AppService,
    label: getLocalizedString("plugins.bot.triggers.http-webapi.label"),
    cliName: getLocalizedString("plugins.bot.triggers.http-webapi.cliName"),
    description: getLocalizedString("plugins.bot.triggers.http-webapi.description"),
    detail: getLocalizedString("plugins.bot.triggers.http-webapi.detail"),
  };
}

export function FunctionsOptionItems(): HostTypeTriggerOptionItem[] {
  return [
    FunctionsHttpTriggerOptionItem(),
    FunctionsTimerTriggerOptionItem(),
    FunctionsHttpAndTimerTriggerOptionItem(),
  ];
}

type HostTypeTriggerOptionItemWithoutText = Omit<
  HostTypeTriggerOptionItem,
  "label" | "cliName" | "description" | "detail"
>;

// The restrictions of this question:
//   - appService and function are mutually exclusive
//   - users must select at least one trigger.
export function createHostTypeTriggerQuestion(
  platform?: Platform,
  runtime?: Runtime
): SingleSelectQuestion {
  const appServiceOptionItem =
    runtime === Runtime.dotnet ? AppServiceOptionItemForVS() : AppServiceOptionItem();
  let staticOptions = [appServiceOptionItem, ...FunctionsOptionItems()];
  if (platform === Platform.CLI) {
    // The UI in CLI is different. It does not have description. So we need to merge that into label.
    staticOptions = staticOptions.map((option) => {
      // do not change the original option
      const cliOption = Object.assign({}, option);
      cliOption.label = `${option.label} (${option.description})`;
      return cliOption;
    });
  }

  return {
    name: QuestionNames.BOT_HOST_TYPE_TRIGGER,
    title: getLocalizedString("plugins.bot.questionHostTypeTrigger.title"),
    type: "singleSelect",
    staticOptions: staticOptions,
    default: appServiceOptionItem.id,
    placeholder: getLocalizedString("plugins.bot.questionHostTypeTrigger.placeholder"),
  };
}

// Question model condition to determine whether to show "Select triggers" question after "Select capabilities".
// Return undefined for true, a string for false. The string itself it not used.
export const showNotificationTriggerCondition = {
  validFunc: (input: unknown, inputs?: Inputs): string | undefined => {
    if (!inputs) {
      return "Invalid inputs";
    }
    const cap = inputs[AzureSolutionQuestionNames.Capabilities] as string;
    if (cap === NotificationOptionItem().id) {
      return undefined;
    }
    // Single Select Option for "Add Feature"
    const feature = inputs[AzureSolutionQuestionNames.Features];
    if (feature === NotificationOptionItem().id) {
      return undefined;
    }
    return "Notification is not selected";
  },
  // Workaround for CLI: it requires containsAny to be set, or it will crash.
  containsAny: [NotificationOptionItem().id],
};

export function getConditionOfNotificationTriggerQuestion(runtime: Runtime) {
  return {
    validFunc: async (input: unknown, inputs?: Inputs) => {
      if (inputs?.["runtime"] === runtime) {
        return undefined;
      } else {
        return `runtime is not ${runtime}`;
      }
    },
  };
}
