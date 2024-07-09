// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

export class ConstantString {
  static readonly CancelledMessage = "Operation is cancelled.";
  static readonly NoServerInformation =
    "No server information is found in the OpenAPI description document.";
  static readonly RemoteRefNotSupported = "Remote reference is not supported: %s.";
  static readonly MissingOperationId = "Missing operationIds: %s.";
  static readonly NoSupportedApi =
    "No supported API is found in the OpenAPI description document: only GET and POST methods are supported, additionally, there can be at most one required parameter, and no auth is allowed.";

  static readonly AdditionalPropertiesNotSupported =
    "'additionalProperties' is not supported, and will be ignored.";
  static readonly SchemaNotSupported =
    "'oneOf', 'allOf', 'anyOf', and 'not' schema are not supported: %s.";
  static readonly UnknownSchema = "Unknown schema: %s.";

  static readonly UrlProtocolNotSupported =
    "Server url is not correct: protocol %s is not supported, you should use https protocol instead.";
  static readonly RelativeServerUrlNotSupported =
    "Server url is not correct: relative server url is not supported.";
  static readonly ResolveServerUrlFailed =
    "Unable to resolve the server URL: please make sure that the environment variable %s is defined.";
  static readonly OperationOnlyContainsOptionalParam =
    "Operation %s contains multiple optional parameters. The first optional parameter is used for this command.";
  static readonly ConvertSwaggerToOpenAPI =
    "The Swagger 2.0 file has been converted to OpenAPI 3.0.";

  static readonly SwaggerNotSupported =
    "Swagger 2.0 is not supported. Please convert to OpenAPI 3.0 manually before proceeding.";

  static readonly SpecVersionNotSupported =
    "Unsupported OpenAPI version %s. Please use version 3.0.x.";

  static readonly MultipleAuthNotSupported =
    "Multiple authentication methods are unsupported. Ensure all selected APIs use identical authentication.";

  static readonly UnsupportedSchema = "Unsupported schema in %s %s: %s";

  static readonly WrappedCardVersion = "devPreview";
  static readonly WrappedCardSchema =
    "https://developer.microsoft.com/json-schemas/teams/vDevPreview/MicrosoftTeams.ResponseRenderingTemplate.schema.json";
  static readonly WrappedCardResponseLayout = "list";

  static readonly GetMethod = "get";
  static readonly PostMethod = "post";
  static readonly AdaptiveCardVersion = "1.5";
  static readonly AdaptiveCardSchema = "http://adaptivecards.io/schemas/adaptive-card.json";
  static readonly AdaptiveCardType = "AdaptiveCard";
  static readonly TextBlockType = "TextBlock";
  static readonly ImageType = "Image";
  static readonly ContainerType = "Container";
  static readonly RegistrationIdPostfix: { [key: string]: string } = {
    apiKey: "REGISTRATION_ID",
    oauth2: "CONFIGURATION_ID",
    http: "REGISTRATION_ID",
    openIdConnect: "REGISTRATION_ID",
  };
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

  static readonly ShortDescriptionMaxLens = 80;
  static readonly FullDescriptionMaxLens = 4000;
  static readonly CommandDescriptionMaxLens = 128;
  static readonly ParameterDescriptionMaxLens = 128;
  static readonly ConversationStarterMaxLens = 50;
  static readonly CommandTitleMaxLens = 32;
  static readonly ParameterTitleMaxLens = 32;
  static readonly SMERequiredParamsMaxNum = 5;
  static readonly DefaultPluginId = "plugin_1";
  static readonly PluginManifestSchema =
    "https://aka.ms/json-schemas/copilot-extensions/v2.1/plugin.schema.json";
}
