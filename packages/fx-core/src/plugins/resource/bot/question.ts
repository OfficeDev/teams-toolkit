// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { MultiSelectQuestion, OptionItem } from "@microsoft/teamsfx-api";
import { getLocalizedString } from "../../../common/localizeUtils";
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

export const FunctionsTimerTriggerOptionItem: HostTypeTriggerOptionItem = {
  id: "functions-timer",
  label: getLocalizedString("plugins.bot.triggers.functionsTimer.label"),
  cliName: getLocalizedString("plugins.bot.triggers.functionsHttp.cliName"),
  description: getLocalizedString("plugins.bot.triggers.functionsTimer.description"),
  detail: getLocalizedString("plugins.bot.triggers.functionsTimer.detail"),

  // additional properties for notification
  hostType: HostTypes.AZURE_FUNCTIONS,
  trigger: NotificationTriggers.TIMER,
};
export const FunctionsHttpTriggerOptionItem: HostTypeTriggerOptionItem = {
  id: "functions-http",
  label: getLocalizedString("plugins.bot.triggers.functionsHttp.label"),
  cliName: getLocalizedString("plugins.bot.triggers.functionsHttp.cliName"),
  description: getLocalizedString("plugins.bot.triggers.functionsHttp.description"),
  detail: getLocalizedString("plugins.bot.triggers.functionsHttp.detail"),

  // additional properties for notification
  hostType: HostTypes.AZURE_FUNCTIONS,
  trigger: NotificationTriggers.HTTP,
};
export const AppServiceOptionItem: HostTypeTriggerOptionItem = {
  id: "app-service",
  label: getLocalizedString("plugins.bot.triggers.appService.label"),
  cliName: getLocalizedString("plugins.bot.triggers.appService.cliName"),
  description: getLocalizedString("plugins.bot.triggers.appService.description"),
  detail: getLocalizedString("plugins.bot.triggers.appService.detail"),

  // additional properties for notification
  hostType: HostTypes.APP_SERVICE,
};

export const HostTypeTriggerOptions: HostTypeTriggerOptionItem[] = [
  FunctionsTimerTriggerOptionItem,
  FunctionsHttpTriggerOptionItem,
  AppServiceOptionItem,
];

// The restrictions of this question:
//   - appService and function are mutually exclusive
//   - users must select at least one trigger.
export function createHostTypeTriggerQuestion(): MultiSelectQuestion {
  return {
    name: QuestionNames.BOT_HOST_TYPE_TRIGGER,
    title: getLocalizedString("plugins.bot.questionHostTypeTrigger.title"),
    type: "multiSelect",
    staticOptions: HostTypeTriggerOptions,
    default: [FunctionsTimerTriggerOptionItem.id],
    placeholder: getLocalizedString("plugins.bot.questionHostTypeTrigger.placeholder"),
    validation: {
      validFunc: async (input: string[]): Promise<string | undefined> => {
        const name = input as string[];
        if (name.length === 0) {
          return getLocalizedString("plugins.bot.questionHostTypeTrigger.error.emptySelection");
        }

        if (name.includes(AppServiceOptionItem.id) && name.length > 1) {
          return getLocalizedString("plugins.bot.questionHostTypeTrigger.error.hostTypeConflict");
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
