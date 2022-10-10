// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { OptionItem } from "@microsoft/teamsfx-api";
import { getLocalizedString } from "../../../common/localizeUtils";

export const manuallySubmitOption: OptionItem = {
  id: "ManuallySubmit",
  label: getLocalizedString("plugins.appstudio.manuallySubmitTip"),
  detail: getLocalizedString("plugins.appstudio.manuallySubmitDescription"),
};

export const autoPublishOption: OptionItem = {
  id: "AutoPublish",
  label: getLocalizedString("plugins.appstudio.autoPublishTip"),
  detail: getLocalizedString("plugins.appstudio.autoPublishDescription"),
};
