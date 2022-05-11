// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { UserError } from "@microsoft/teamsfx-api";

export class AddModuleNotSupportedError extends UserError {
  constructor() {
    super("Solution", new.target.name, `AddModule is not supported for SPFx solution`);
  }
}
