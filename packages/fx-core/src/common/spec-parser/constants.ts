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
  // TODO: remove core.common.MultipleServerInformation message which is not used
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
  // TODO: localization
  static readonly UrlProtocolNotSupported =
    "Sever url is not correct: protocol %s is not supported, you should use https protocol instead.";
  static readonly RelativeServerUrlNotSupported =
    "Server url is not correct: relative server url is not supported.";
  static readonly ResolveServerUrlFailed =
    "Resolve server Url failed: environment variable %s is not defined";
  static readonly OperationOnlyContainsOptionalParam =
    "Operation %s only contains optional parameters which is not supported";

  static readonly GetMethod = "get";
  static readonly PostMethod = "post";
  static readonly AdaptiveCardVersion = "1.5";
  static readonly AdaptiveCardSchema = "http://adaptivecards.io/schemas/adaptive-card.json";
  static readonly AdaptiveCardType = "AdaptiveCard";
  static readonly TextBlockType = "TextBlock";
  static readonly ContainerType = "Container";
  static readonly ResponseCodeFor20X = [
    "200",
    "201",
    "202",
    "203",
    "204",
    "205",
    "206",
    "207",
    "208",
    "226",
    "default",
  ];
  static readonly AllOperationMethods = [
    "get",
    "post",
    "put",
    "delete",
    "patch",
    "head",
    "options",
    "trace",
  ];
}
