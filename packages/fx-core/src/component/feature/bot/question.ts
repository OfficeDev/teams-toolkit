// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { Inputs, SingleSelectQuestion, OptionItem, Platform } from "@microsoft/teamsfx-api";
import { isPreviewFeaturesEnabled } from "../../../common/featureFlags";
import { getLocalizedString } from "../../../common/localizeUtils";
import {
  AzureSolutionQuestionNames,
  NotificationOptionItem,
} from "../../../plugins/solution/fx-solution/question";
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
export const FunctionsTimerTriggerOptionItem: HostTypeTriggerOptionItem = optionWithL10n({
  id: "timer-functions",
  hostType: HostType.Functions,
  triggers: [NotificationTriggers.TIMER],
});

export const FunctionsHttpAndTimerTriggerOptionItem: HostTypeTriggerOptionItem = optionWithL10n({
  id: "http-and-timer-functions",
  hostType: HostType.Functions,
  triggers: [NotificationTriggers.HTTP, NotificationTriggers.TIMER],
});

export const FunctionsHttpTriggerOptionItem: HostTypeTriggerOptionItem = optionWithL10n({
  id: "http-functions",
  hostType: HostType.Functions,
  triggers: [NotificationTriggers.HTTP],
});

export const AppServiceOptionItem: HostTypeTriggerOptionItem = optionWithL10n({
  id: "http-restify",
  hostType: HostType.AppService,
  // trigger of app service host is hard-coded to http, so no need to set here
});

// TODO: this option will not be shown in UI, leave messages empty.
export const AppServiceOptionItemForVS: HostTypeTriggerOptionItem = optionWithL10n({
  id: "http-webapi",
  hostType: HostType.AppService,
});

export const FunctionsOptionItems: HostTypeTriggerOptionItem[] = [
  FunctionsHttpTriggerOptionItem,
  FunctionsTimerTriggerOptionItem,
  FunctionsHttpAndTimerTriggerOptionItem,
];

type HostTypeTriggerOptionItemWithoutText = Omit<
  HostTypeTriggerOptionItem,
  "label" | "cliName" | "description" | "detail"
>;

function optionWithL10n(option: HostTypeTriggerOptionItemWithoutText): HostTypeTriggerOptionItem {
  // e.g. expands to plugins.bot.triggers.functionsTimer.label
  const prefix = "plugins.bot.triggers";
  return {
    ...option,
    label: getLocalizedString(`${prefix}.${option.id}.label`),
    cliName: getLocalizedString(`${prefix}.${option.id}.cliName`),
    description: getLocalizedString(`${prefix}.${option.id}.description`),
    detail: getLocalizedString(`${prefix}.${option.id}.detail`),
  };
}

// The restrictions of this question:
//   - appService and function are mutually exclusive
//   - users must select at least one trigger.
export function createHostTypeTriggerQuestion(
  platform?: Platform,
  runtime?: Runtime
): SingleSelectQuestion {
  const prefix = "plugins.bot.questionHostTypeTrigger";

  const appServiceOptionItem =
    runtime === Runtime.dotnet ? AppServiceOptionItemForVS : AppServiceOptionItem;
  let staticOptions = [appServiceOptionItem, ...FunctionsOptionItems];
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
    title: getLocalizedString(`${prefix}.title`),
    type: "singleSelect",
    staticOptions: staticOptions,
    default: appServiceOptionItem.id,
    placeholder: getLocalizedString(`${prefix}.placeholder`),
  };
}

// Question model condition to determine whether to show "Select triggers" question after "Select capabilities".
// Return undefined for true, a string for false. The string itself it not used.
export const showNotificationTriggerCondition = {
  validFunc: (input: unknown, inputs?: Inputs): string | undefined => {
    if (!inputs) {
      return "Invalid inputs";
    }
    if (isPreviewFeaturesEnabled()) {
      const cap = inputs[AzureSolutionQuestionNames.Capabilities] as string;
      if (cap === NotificationOptionItem.id) {
        return undefined;
      }
      // Single Select Option for "Add Feature"
      const feature = inputs[AzureSolutionQuestionNames.Features];
      if (feature === NotificationOptionItem.id) {
        return undefined;
      }
    } else {
      const cap = inputs[AzureSolutionQuestionNames.Capabilities];
      if (Array.isArray(cap) && cap.includes(NotificationOptionItem.id)) {
        return undefined;
      }
    }
    return "Notification is not selected";
  },
  // Workaround for CLI: it requires containsAny to be set, or it will crash.
  containsAny: [NotificationOptionItem.id],
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
