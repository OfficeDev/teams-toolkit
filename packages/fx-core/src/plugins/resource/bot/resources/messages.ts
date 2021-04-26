// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { Links } from "../constants";

export class Messages {
    public static readonly SomethingIsInvalidWithValue = (something: string, value: string): string => `'${something}' is invalid with '${value}'.`;
    public static readonly InputValidValueForSomething = (something: string): string => `Please select valid values for '${something}'.`;
    public static readonly SomethingIsMissing = (something: string): string => `'${something}' is missing.`;
    public static readonly SomethingIsNotFound = (something: string): string => `'${something}' is not found.`;
    public static readonly SomethingIsNotExisting = (something: string): string => `'${something}' is not existing.`;
    public static readonly SomethingIsInWrongFormat = (something: string): string => `'${something}' is in wrong format.`;
    public static readonly FailToCreateSomeClient = (clientName: string): string => `Failed to create '${clientName}'.`;
    public static readonly FailToProvisionSomeResource = (resource: string): string => `Failed to provision '${resource}'.`;
    public static readonly FailToUpdateConfigs = (something: string): string => `Failed to update configs for '${something}'.`;
    public static readonly FailToListPublishingCredentials = "Failed to list publishing credentials.";
    public static readonly FailToDoZipDeploy = "Failed to deploy zip file.";
    public static readonly FailToUpdateMessageEndpoint = (endpoint: string): string => `Failed to update message endpoint with '${endpoint}'.`;
    public static readonly FailToDownloadFrom = (url: string): string => `Failed to download from '${url}'.`;
    public static readonly FailToFindSomethingFor = (something: string, forsth: string): string => `Failed to retrieve '${something}' for '${forsth}'.`;
    public static readonly ReferToIssueLink = `Refer to ${Links.ISSUE_LINK}.`;
    public static readonly ReferToHelpLink = `Refer to ${Links.HELP_LINK}.`;
    public static readonly CommandFailWithMessage = (command: string, message: string): string => `Run '${command}' failed with message: ${message}`;
    public static readonly DoSthBeforeSth = (sth: string, beforeSth: string): string => `Perform command '${sth}' before '${beforeSth}'.`;
    public static readonly FailToCallAppStudio = (apiName: string) => `Failed to execute '${apiName}'.`;
    public static readonly WORKING_DIR_IS_MISSING = "Working directory is missing.";
    public static readonly FAIL_TO_GET_AZURE_CREDS = "Failed to retrieve Azure credentials.";
    public static readonly TRY_LOGIN_AZURE = "Login to Azure.";
    public static readonly SKIP_DEPLOY_NO_UPDATES = "Skipping deployment: no updates found.";
}