// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { UserError } from "@microsoft/teamsfx-api";

import { getDefaultString, getLocalizedString } from "../localizeUtils";

export class M365TitleNotAcquiredError extends UserError {
  constructor(source: string) {
    super({
      source: source,
      name: "M365TitleNotAcquiredError",
      message: getDefaultString("error.m365.M365TitleNotAcquiredError"),
      displayMessage: getLocalizedString("error.m365.M365TitleNotAcquiredError"),
      helpLink: "https://aka.ms/teamsfx-actions/m365-title-acquire",
    });
  }
}
