// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export class CommentMessages {
  public static ContextSchemaChanged =
    "TODO: Change the context interface, for more info, please refer to https://aka.ms/teamsfx-context-mapping.";
  public static APIWithCallbackChangedToPromise =
    "TODO: Convert callback to promise, for more info, please refer to https://aka.ms/teamsfx-callback-to-promise.";
  public static RequireModuleNotHandled =
    "TODO: Require module is not handled, please update it manually.";
  public static DynamicImportNotHandled =
    "TODO: Dynamic import is not handled, please update it manually.";
}

export const teamsClientSDKName = "@microsoft/teams-js";
export const teamsClientSDKVersion = "^2.0.0";
export const teamsManifestSchema =
  "https://developer.microsoft.com/en-us/json-schemas/teams/v1.17/MicrosoftTeams.schema.json";
export const teamsManifestVersion = "1.17";

export const teamsClientSDKDefaultNamespace = "microsoftTeams";

export const tsExtNames = [".ts", ".tsx"];
export const jsExtNames = [".js", ".jsx"];
export const htmlExtNames = [".html", ".cshtml"];
