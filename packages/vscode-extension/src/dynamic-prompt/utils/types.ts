// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export type IDynamicPromptTemplateSet<TArgs> = Record<StringStartsWithLowercase, string> & {
  main?: string;
  $presets?: IDynamicPromptPresets;
  $version: string;
  $__args_type_helper__?: TArgs;
};

export interface IDynamicPromptSettings {
  [templateName: string]: IDynamicPromptTemplateSet<unknown>;
}

export interface IDynamicPromptParams<TArgs = never> {
  args: TArgs;

  templates: IDynamicPromptTemplateSet<TArgs>;
  common: IDynamicPromptTemplateSet<unknown>;

  item?: unknown;
  itemIndex?: number;
  itemOrdinal?: number;
}

export interface IDynamicPromptPresets {
  [key: string]: SingleOrArray<string | number | boolean | undefined | IDynamicPromptPresets>;
}

type LowercaseLetter =
  | "a"
  | "b"
  | "c"
  | "d"
  | "e"
  | "f"
  | "g"
  | "h"
  | "i"
  | "j"
  | "k"
  | "l"
  | "m"
  | "n"
  | "o"
  | "p"
  | "q"
  | "r"
  | "s"
  | "t"
  | "u"
  | "v"
  | "w"
  | "x"
  | "y"
  | "z";

type StringStartsWithLowercase = `${LowercaseLetter}${string}`;

type SingleOrArray<T> = T | T[];
