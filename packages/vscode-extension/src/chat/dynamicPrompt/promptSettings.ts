// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as prompts from "./prompts";
import { IDynamicPromptSettings } from "./utils/types";

export type TemplateSetName = keyof PromptMapType;
export type ArgsType<T extends TemplateSetName> = ArgsTypeHelper<T> extends infer U
  ? [U] extends [never]
    ? null
    : U
  : null;

export type IDynamicPromptPartialSettings = {
  [T in TemplateSetName]?: Partial<PromptMapType[T]>;
};

type PromptMapType = typeof prompts;
type ArgsTypeHelper<T extends TemplateSetName> = Exclude<
  PromptMapType[T]["$__args_type_helper__"],
  undefined
>;

export const dynamicPromptSettings: IDynamicPromptSettings = prompts;
