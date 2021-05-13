// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export class AppStudioError {
    public static readonly FileNotFoundError = {
        name: "FileNotFoundError",
        message: (filePath: string) => `File ${filePath} not found.`
    }

    public static readonly NotADirectoryError = {
        name: "NotADirectory",
        message: (directoryPath: string) => `${directoryPath} is not a directory.`
    }

    public static readonly ParamUndefinedError = {
        name: "ParamUndefined",
        message: (param: string) => `${param} is undefined.`
    }

    public static readonly ValidationFailedError = {
        name: "ManifestValidationFailed",
        message: (errors: string[]) => `Validation error: \n ${errors.join("\n")}`
    }

    public static readonly TeamsAppUpdateFailedError = {
        name: "TeamsAppUpdateFailed",
        message: (teamsAppId: string) => `Failed to update Teams app with ID ${teamsAppId}.`
    }

    public static readonly TeamsAppUpdateIDNotMatchError = {
        name: "TeamsAppUpdateIDNotMatch",
        message: (oldTeamsAppId: string, newTeamsAppId?: string) => `Teams App ID mismatch. Input: ${oldTeamsAppId}. Got: ${newTeamsAppId}.`
    }

    public static readonly TeamsAppPublishFailedError = {
        name: "TeamsAppPublishFailed",
        message: (teamsAppId: string) => `Failed to publish Teams app with ID ${teamsAppId}.`
    }

    public static readonly TeamsAppPublishCancelError = {
        name: "TeamsAppPublishCancelled",
        message: (name: string) => `Publish Teams app with ID ${name} has been cancelled.`
    }

    public static readonly TeamsPackageBuildError = {
        name: "TeamsPackageBuildError",
        message: (error: any) => error.message ? error.message: "Teams Package built failed!"
    }

    public static readonly UnhandledError = {
        name: "UnhandledError",
        message: "UnhandledError"
    }
}