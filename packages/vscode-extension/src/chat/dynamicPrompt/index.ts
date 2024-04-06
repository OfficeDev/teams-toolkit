// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  LanguageModelChatAssistantMessage,
  LanguageModelChatMessage,
  LanguageModelChatSystemMessage,
  LanguageModelChatUserMessage,
} from "vscode";
import {
  ArgsType,
  IDynamicPromptPartialSettings,
  TemplateSetName,
  dynamicPromptSettings,
} from "./promptSettings";
import { buildDynamicPromptInternal } from "./utils/buildDynamicPrompt";
import { IDynamicPromptFormat, MessageRole } from "./utils/types";

export interface IDynamicPrompt {
  messages: LanguageModelChatMessage[];
  version: string;
}

export function buildDynamicPrompt<T extends TemplateSetName>(
  formatName: T,
  args: ArgsType<T>,
  settings?: IDynamicPromptPartialSettings
): IDynamicPrompt {
  try {
    const templateSettings = getTemplateSettings<T>(formatName, settings);
    if (!templateSettings?.templates) {
      throw Error("Dynamic prompt is not defined");
    }

    const commonTemplates = getTemplateSettings("common", settings).templates;

    const messages = templateSettings.messages.map((messageFormat) => {
      const { role, entryTemplate } = messageFormat;

      const prompt = buildDynamicPromptInternal(`templates.${entryTemplate}`, {
        args,
        common: commonTemplates,
        presets: templateSettings.presets,
        templates: templateSettings.templates,
      });

      return createMessage(role, prompt);
    });

    return {
      messages,
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

  return templates as IDynamicPromptFormat<ArgsType<T>>;
}

function createMessage(role: MessageRole, prompt: string): LanguageModelChatMessage {
  switch (role) {
    case "system":
      return new LanguageModelChatSystemMessage(prompt);
    case "user":
      return new LanguageModelChatUserMessage(prompt);
    case "assistant":
      return new LanguageModelChatAssistantMessage(prompt);
  }
}
