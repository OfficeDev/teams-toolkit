// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {Links} from '../constants';

export class Messages {
    public static readonly EnterFunc = (funcName: string, joinedParams?: string) => {
        if (joinedParams) {
            return `Enter function ${funcName} with params: ${joinedParams}.`;
        } else {
            return `Enter function ${funcName}.`;
        }
    };

    public static readonly SomethingIsInvalidWithValue = (something: string, value: string) => `${something} is invalid with ${value}.`;
    public static readonly InputValidValueForSomething = (something: string) => `Please select/re-enter valid values for ${something}.`;
    public static readonly SomethingIsMissing = (something: string) => `${something} is missing.`;
    public static readonly SomethingIsNotFound = (something: string) => `${something} is not found.`;
    public static readonly SomethingIsNotExisting = (something: string) => `${something} is not existing.`;
    public static readonly SomethingIsInWrongFormat = (something: string) => `${something} is in wrong format.`;
    public static readonly FailToCreateSomeClient = (clientName: string) => `Fail to create ${clientName}.`;
    public static readonly FailToProvisionSomeResource = (resource: string) => `Fail to provision ${resource}.`;
    public static readonly FailToUpdateConfigs = (something: string) => `Fail to update configs for ${something}.`;
    public static readonly FailToListPublishingCredentials = 'Fail to list publishing credentials.';
    public static readonly FailToDoZipDeploy = 'Fail to do zip deploy.';
    public static readonly FailToUpdateMessageEndpoint = (endpoint: string) => `Fail to update message endpoint with ${endpoint}.`;
    public static readonly FailToDownloadFrom = (url: string) => `Fail to download from ${url}.`;
    public static readonly FailToFindSomethingFor = (something: string, forsth: string) => `Fail to find ${something} for ${forsth}.`;
    public static readonly ReferToIssueLink = `Please refer to ${Links.ISSUE_LINK}.`;
    public static readonly ReferToHelpLink = `Please refer to ${Links.HELP_LINK}.`;
    public static readonly CommandFailWithMessage = (command: string, message: string) => `Run ${command} failed with message: ${message}`;
}
