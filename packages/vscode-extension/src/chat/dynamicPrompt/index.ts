// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  ArgsType,
  IDynamicPromptPartialSettings,
  TemplateSetName,
  dynamicPromptSettings,
} from "./promptSettings";
import { buildDynamicPromptInternal } from "./utils/buildDynamicPrompt";
import { IDynamicPromptTemplateSet } from "./utils/types";

export interface IDynamicPrompt {
  prompt: string;
  version: string;
}

export function buildDynamicPrompt<T extends TemplateSetName>(
  name: T,
  args: ArgsType<T>,
  settings?: IDynamicPromptPartialSettings
): IDynamicPrompt {
  try {
    const templateSettings = getTemplateSettings<T>(name, settings);
    if (!templateSettings?.templates.main) {
      throw Error("Dynamic prompt is not defined");
    }

    const prompt = buildDynamicPromptInternal("templates.main", {
      args,
      common: getTemplateSettings("common", settings),
      presets: templateSettings.presets,
      templates: templateSettings.templates,
    });

    return {
      prompt,
      version: templateSettings.version,
    };
  } catch (e) {
    throw e;
  }
}

function getTemplateSettings<T extends TemplateSetName>(
  name: T,
  settings?: IDynamicPromptPartialSettings
) {
  settings = settings || {};
  const templates = {
    ...dynamicPromptSettings[name],
    ...settings[name],
  };

  return templates as IDynamicPromptTemplateSet<ArgsType<T>>;
}
