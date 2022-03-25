// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { Inputs, MultiSelectQuestion, OptionItem } from "@microsoft/teamsfx-api";
import { getLocalizedString } from "../../../common/localizeUtils";
import {
  AzureSolutionQuestionNames,
  NotificationOptionItem,
} from "../../solution/fx-solution/question";
import { QuestionNames } from "./constants";
import {
  HostType,
  HostTypes,
  NotificationTrigger,
  NotificationTriggers,
} from "./resources/strings";

export interface HostTypeTriggerOptionItem extends OptionItem {
  hostType: HostType;
  trigger?: NotificationTrigger;
}

// NOTE: id must be the sample as cliName to prevent parsing error for CLI default value.
export const FunctionsTimerTriggerOptionItem: HostTypeTriggerOptionItem = optionWithL10n({
  id: "timer",
  hostType: HostTypes.AZURE_FUNCTIONS,
  trigger: NotificationTriggers.TIMER,
});

export const FunctionsHttpTriggerOptionItem: HostTypeTriggerOptionItem = optionWithL10n({
  id: "http",
  hostType: HostTypes.AZURE_FUNCTIONS,
  trigger: NotificationTriggers.HTTP,
});

export const AppServiceOptionItem: HostTypeTriggerOptionItem = optionWithL10n({
  id: "http-restify",
  hostType: HostTypes.APP_SERVICE,
});

export const HostTypeTriggerOptions: HostTypeTriggerOptionItem[] = [
  FunctionsTimerTriggerOptionItem,
  FunctionsHttpTriggerOptionItem,
  AppServiceOptionItem,
];

// The restrictions of this question:
//   - appService and function are mutually exclusive
//   - users must select at least one trigger.
export function createHostTypeTriggerQuestion(): MultiSelectQuestion {
  const prefix = "plugins.bot.questionHostTypeTrigger";
  return {
    name: QuestionNames.BOT_HOST_TYPE_TRIGGER,
    title: getLocalizedString(`${prefix}.title`),
    type: "multiSelect",
    staticOptions: HostTypeTriggerOptions,
    default: [FunctionsTimerTriggerOptionItem.id],
    placeholder: getLocalizedString(`${prefix}.placeholder`),
    validation: {
      validFunc: async (input: string[]): Promise<string | undefined> => {
        const name = input as string[];
        if (name.length === 0) {
          return getLocalizedString(`${prefix}.error.emptySelection`);
        }

        if (name.includes(AppServiceOptionItem.id) && name.length > 1) {
          return getLocalizedString(`${prefix}.error.hostTypeConflict`);
        }

        return undefined;
      },
    },
    onDidChangeSelection: async function (
      currentSelectedIds: Set<string>,
      previousSelectedIds: Set<string>
    ): Promise<Set<string>> {
      if (currentSelectedIds.size > 1 && currentSelectedIds.has(AppServiceOptionItem.id)) {
        if (previousSelectedIds.has(AppServiceOptionItem.id)) {
          currentSelectedIds.delete(AppServiceOptionItem.id);
        } else {
          currentSelectedIds = new Set([AppServiceOptionItem.id]);
        }
      }

      return currentSelectedIds;
    },
  };
}

// Question model condition to determine whether to show "Select triggers" question after "Select capabilities".
// Return undefined for true, a string for false. The string itself it not used.
export const showNotificationTriggerCondition = {
  validFunc: (input: unknown, inputs?: Inputs): string | undefined => {
    if (!inputs) {
      return "Invalid inputs";
    }
    const cap = inputs[AzureSolutionQuestionNames.Capabilities];
    if (Array.isArray(cap) && cap.includes(NotificationOptionItem.id)) {
      return undefined;
    }
    return "Notification is not selected";
  },
};

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
