// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { UserError } from "@microsoft/teamsfx-api";

import { getDefaultString, getLocalizedString } from "../../common/localizeUtils";

export class NotExtendedToM365Error extends UserError {
  constructor(source: string) {
    super({
      source: source,
      name: "NotExtendedToM365Error",
      message: getDefaultString("error.m365.NotExtendedToM365Error"),
      displayMessage: getLocalizedString("error.m365.NotExtendedToM365Error"),
      helpLink: "https://aka.ms/teamsfx-actions/teamsapp-extendToM365",
    });
  }
}
