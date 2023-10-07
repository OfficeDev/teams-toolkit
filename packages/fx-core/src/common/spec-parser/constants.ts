// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { getLocalizedString } from "../localizeUtils";

export class ConstantString {
  static readonly CancelledMessage = getLocalizedString("core.common.CancelledMessage");
  static readonly NoServerInformation = getLocalizedString("core.common.NoServerInformation");
  static readonly RemoteRefNotSupported = getLocalizedString("core.common.RemoteRefNotSupported");
  static readonly MissingOperationId = getLocalizedString("core.common.MissingOperationId");
  static readonly NoSupportedApi = getLocalizedString("core.common.NoSupportedApi");
  static readonly AdditionalPropertiesNotSupported = getLocalizedString(
    "core.common.AdditionalPropertiesNotSupported"
  );
  static readonly SchemaNotSupported = getLocalizedString("core.common.SchemaNotSupported");
  static readonly UnknownSchema = getLocalizedString("core.common.UnknownSchema");

  static readonly UrlProtocolNotSupported = getLocalizedString(
    "core.common.UrlProtocolNotSupported"
  );
  static readonly RelativeServerUrlNotSupported = getLocalizedString(
    "core.common.RelativeServerUrlNotSupported"
  );
  static readonly ResolveServerUrlFailed = getLocalizedString("core.common.ResolveServerUrlFailed");
  static readonly OperationOnlyContainsOptionalParam = getLocalizedString(
    "core.common.OperationOnlyContainsOptionalParam"
  );
  static readonly ConvertSwaggerToOpenAPI = getLocalizedString(
    "core.common.ConvertSwaggerToOpenAPI"
  );

  static readonly WrappedCardVersion = "devPreview";
  static readonly WrappedCardSchema = "<URL_REFERENCE_TO_SCHEMA>";
  static readonly WrappedCardResponseLayout = "list";

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

  // TODO: update after investigating the usage of these constants.
  static readonly WellknownResultNames = [
    "result",
    "data",
    "items",
    "root",
    "matches",
    "queries",
    "list",
    "output",
  ];
  static readonly WellknownTitleName = ["title", "name", "summary", "caption", "subject", "label"];
  static readonly WellknownSubtitleName = [
    "subtitle",
    "id",
    "uid",
    "description",
    "desc",
    "detail",
  ];
  static readonly WellknownImageName = [
    "image",
    "icon",
    "avatar",
    "picture",
    "photo",
    "logo",
    "pic",
    "thumbnail",
    "img",
  ];
}
