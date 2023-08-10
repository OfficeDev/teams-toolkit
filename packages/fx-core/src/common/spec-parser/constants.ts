// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { getLocalizedString } from "../localizeUtils";

export class ConstantString {
  static readonly CancelledMessage = getLocalizedString("core.common.CancelledMessage");
  static readonly SpecVersionNotSupported = getLocalizedString(
    "core.common.SpecVersionNotSupported"
  );
  static readonly NoServerInformation = getLocalizedString("core.common.NoServerInformation");
  static readonly MultipleServerInformation = getLocalizedString(
    "core.common.MultipleServerInformation"
  );
  static readonly RemoteRefNotSupported = getLocalizedString("core.common.RemoteRefNotSupported");

  static readonly MissingOperationId = getLocalizedString("core.common.MissingOperationId");
  static readonly NoSupportedApi = getLocalizedString("core.common.NoSupportedApi");
  static readonly AdditionalPropertiesNotSupported = getLocalizedString(
    "core.common.AdditionalPropertiesNotSupported"
  );
  static readonly SchemaNotSupported = getLocalizedString("core.common.SchemaNotSupported");
  static readonly UnknownSchema = getLocalizedString("core.common.UnknownSchema");
  static readonly GetMethod = "get";
  static readonly PostMethod = "post";
  static readonly AdaptiveCardVersion = "1.5";
  static readonly AdaptiveCardSchema = "http://adaptivecards.io/schemas/adaptive-card.json";
  static readonly AdaptiveCardType = "AdaptiveCard";
  static readonly TextBlockType = "TextBlock";
  static readonly ContainerType = "Container";
}
