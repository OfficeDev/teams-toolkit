// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Inputs, UserError } from "@microsoft/teamsfx-api";

export class InvalidInputError extends UserError {
  constructor(inputs: Inputs, reason?: string) {
    super(new.target.name, `Invalid inputs: ${JSON.stringify(inputs)} ${reason}`, "Solution");
  }
}
