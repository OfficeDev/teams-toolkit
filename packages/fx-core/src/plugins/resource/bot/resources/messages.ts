// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { Links } from "../constants";

export class Messages {
    public static readonly EnterFunc = (funcName: string, joinedParams?: string): string => {
        if (joinedParams) {
            return `Enter function ${funcName} with params: ${joinedParams}.`;
        } else {
            return `Enter function ${funcName}.`;
        }
    };

    public static readonly SomethingIsInvalidWithValue = (something: string, value: string): string => `${something} is invalid with ${value}.`;
    public static readonly InputValidValueForSomething = (something: string): string => `Please select/re-enter valid values for ${something}.`;
    public static readonly SomethingIsMissing = (something: string): string => `${something} is missing.`;
    public static readonly SomethingIsNotFound = (something: string): string => `${something} is not found.`;
    public static readonly SomethingIsNotExisting = (something: string): string => `${something} is not existing.`;
    public static readonly SomethingIsInWrongFormat = (something: string): string => `${something} is in wrong format.`;
    public static readonly FailToCreateSomeClient = (clientName: string): string => `Fail to create ${clientName}.`;
    public static readonly FailToProvisionSomeResource = (resource: string): string => `Fail to provision ${resource}.`;
    public static readonly FailToUpdateConfigs = (something: string): string => `Fail to update configs for ${something}.`;
    public static readonly FailToListPublishingCredentials = "Fail to list publishing credentials.";
    public static readonly FailToDoZipDeploy = "Fail to do zip deploy.";
    public static readonly FailToUpdateMessageEndpoint = (endpoint: string): string => `Fail to update message endpoint with ${endpoint}.`;
    public static readonly FailToDownloadFrom = (url: string): string => `Fail to download from ${url}.`;
    public static readonly FailToFindSomethingFor = (something: string, forsth: string): string => `Fail to find ${something} for ${forsth}.`;
    public static readonly ReferToIssueLink = `Please refer to ${Links.ISSUE_LINK}.`;
    public static readonly ReferToHelpLink = `Please refer to ${Links.HELP_LINK}.`;
    public static readonly CommandFailWithMessage = (command: string, message: string): string => `Run ${command} failed with message: ${message}`;
    public static readonly DoSthBeforeSth = (sth: string, beforeSth: string): string => `Please do ${sth} before ${beforeSth}.`;

    public static readonly WORKING_DIR_IS_MISSING = "Working directory is missing.";
    public static readonly FAIL_TO_GET_AZURE_CREDS = "Fail to get azure credentials.";
    public static readonly TRY_LOGIN_AZURE = "Please try to login azure.";
    public static readonly SKIP_DEPLOY_NO_UPDATES = "Skip deploy since no updates.";
}
