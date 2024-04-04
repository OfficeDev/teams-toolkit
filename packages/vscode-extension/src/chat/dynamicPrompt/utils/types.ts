// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export type IDynamicPromptTemplateSet<TArgs> = {
  templates: Record<string, string>;
  version: string;
  presets?: IDynamicPromptPresets;
  $__args_type_helper__?: TArgs;
};

export interface IDynamicPromptSettings {
  [templateName: string]: IDynamicPromptTemplateSet<unknown>;
}

export interface IDynamicPromptParams<TArgs = never> {
  args: TArgs;

  templates: Record<string, string>;
  common: IDynamicPromptTemplateSet<unknown>;
  presets?: IDynamicPromptPresets;

  item?: unknown;
  itemIndex?: number;
  itemOrdinal?: number;
}

export interface IDynamicPromptPresets {
  [key: string]: SingleOrArray<string | number | boolean | undefined | IDynamicPromptPresets>;
}

type SingleOrArray<T> = T | T[];
