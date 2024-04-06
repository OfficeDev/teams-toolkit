// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as promptFormats from "./formats";
import { IDynamicPromptSettings } from "./utils/types";

export type TemplateSetName = keyof FormatMapType;
export type ArgsType<T extends TemplateSetName> = ArgsTypeHelper<T> extends infer U
  ? [U] extends [never]
    ? null
    : U
  : null;

export type IDynamicPromptPartialSettings = {
  [T in TemplateSetName]?: Partial<FormatMapType[T]>;
};

type FormatMapType = typeof promptFormats;
type ArgsTypeHelper<T extends TemplateSetName> = Exclude<
  FormatMapType[T]["$__args_type_helper__"],
  undefined
>;

export const dynamicPromptSettings: IDynamicPromptSettings = promptFormats;
