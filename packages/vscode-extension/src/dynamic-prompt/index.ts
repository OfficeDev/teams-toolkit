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
  templateSetName: T,
  args: ArgsType<T>,
  settings?: IDynamicPromptPartialSettings
): IDynamicPrompt {
  try {
    const templates = getTemplateSettings<T>(templateSetName, settings);
    if (!templates?.main) {
      throw Error("Dynamic prompt is not defined");
    }

    const prompt = buildDynamicPromptInternal("templates.main", {
      args,
      templates,
      common: getTemplateSettings("common", settings),
    });

    return {
      prompt,
      version: templates.$version,
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
