// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ConfigValue, FxError } from "fx-api";

export enum InputResultType {
  cancel = "cancel",
  back = "back",
  sucess = "sucess",
  error = "error",
  pass = "pass" // for single select option quick pass it
}

export interface InputResult {
  type: InputResultType;
  result?: ConfigValue;
  error?: FxError;
}
