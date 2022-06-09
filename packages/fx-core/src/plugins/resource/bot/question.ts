// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { Inputs, MultiSelectQuestion, OptionItem, Platform } from "@microsoft/teamsfx-api";
import { isCLIDotNetEnabled, isPreviewFeaturesEnabled } from "../../../common/featureFlags";
import { getLocalizedString } from "../../../common/localizeUtils";
import { CoreQuestionNames } from "../../../core/question";
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
import { Runtime } from "./v2/enum";

export interface HostTypeTriggerOptionItem extends OptionItem {
  hostType: HostType;
  trigger?: NotificationTrigger;
}

// NOTE: id must be the sample as cliName to prevent parsing error for CLI default value.
export const FunctionsTimerTriggerOptionItem: HostTypeTriggerOptionItem = optionWithL10n({
  id: "timer-functions",
  hostType: HostTypes.AZURE_FUNCTIONS,
  trigger: NotificationTriggers.TIMER,
});

export const FunctionsHttpTriggerOptionItem: HostTypeTriggerOptionItem = optionWithL10n({
  id: "http-functions",
  hostType: HostTypes.AZURE_FUNCTIONS,
  trigger: NotificationTriggers.HTTP,
});

export const AppServiceOptionItem: HostTypeTriggerOptionItem = optionWithL10n({
  id: "http-restify",
  hostType: HostTypes.APP_SERVICE,
  // trigger of app service host is hard-coded to http, so no need to set here
});

// TODO: this option will not be shown in UI, leave messages empty.
export const AppServiceOptionItemForVS: HostTypeTriggerOptionItem = {
  id: "http-webapi",
  hostType: HostTypes.APP_SERVICE,
  label: "",
  cliName: "",
  description: "",
  detail: "",
};

export const HostTypeTriggerOptions: HostTypeTriggerOptionItem[] = [
  AppServiceOptionItem,
  FunctionsHttpTriggerOptionItem,
  FunctionsTimerTriggerOptionItem,
];

export const HostTypeTriggerOptionsForVS: HostTypeTriggerOptionItem[] = [AppServiceOptionItemForVS];

// The restrictions of this question:
//   - appService and function are mutually exclusive
//   - users must select at least one trigger.
export function createHostTypeTriggerQuestion(
  platform?: Platform,
  runtime?: Runtime
): MultiSelectQuestion {
  const prefix = "plugins.bot.questionHostTypeTrigger";

  let staticOptions: HostTypeTriggerOptionItem[] = HostTypeTriggerOptions;
  let defaultOptionItem = AppServiceOptionItem;
  if (runtime === Runtime.Dotnet) {
    staticOptions = HostTypeTriggerOptionsForVS;
    defaultOptionItem = AppServiceOptionItemForVS;
  }
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
    type: "multiSelect",
    staticOptions: staticOptions,
    default: [defaultOptionItem.id],
    placeholder: getLocalizedString(`${prefix}.placeholder`),
    skipSingleOption: true,
    validation: {
      validFunc: async (input: string[]): Promise<string | undefined> => {
        const name = input as string[];
        if (name.length === 0) {
          return getLocalizedString(`${prefix}.error.emptySelection`);
        }

        //invalid if both appService and function items are selected
        if (name.includes(defaultOptionItem.id) && name.length > 1) {
          return getLocalizedString(`${prefix}.error.hostTypeConflict`);
        }

        return undefined;
      },
    },
    onDidChangeSelection: async function (
      currentSelectedIds: Set<string>,
      previousSelectedIds: Set<string>
    ): Promise<Set<string>> {
      if (currentSelectedIds.size > 1 && currentSelectedIds.has(defaultOptionItem.id)) {
        if (previousSelectedIds.has(defaultOptionItem.id)) {
          currentSelectedIds.delete(defaultOptionItem.id);
        } else {
          currentSelectedIds = new Set([defaultOptionItem.id]);
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

export function getNotificationTriggerQuestionCondition(runtime: Runtime) {
  return {
    validFunc: async (input: unknown, inputs?: Inputs) => {
      if (inputs?.platform === Platform.CLI) {
        if (isCLIDotNetEnabled()) {
          if (inputs && inputs[CoreQuestionNames.Runtime] === runtime) {
            return undefined;
          }
        } else if (runtime === Runtime.Node) {
          return undefined;
        }
      }
      if (inputs?.platform === Platform.VS && runtime === Runtime.Dotnet) {
        return undefined;
      }
      if (inputs?.platform === Platform.VSCode && runtime === Runtime.Node) {
        return undefined;
      }
      return `runtime is not ${runtime}`;
    },
  };
}

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
