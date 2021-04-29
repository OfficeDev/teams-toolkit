// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ErrorNames } from "./constants";
import { Messages } from "./resources/messages";

export enum ErrorType {
    User,
    System
}

export class PluginError extends Error {
    public name: string;
    public details: string;
    public suggestions: string[];
    public errorType: ErrorType;
    public innerError?: Error;

    constructor(type: ErrorType, name: string, details: string, suggestions: string[], innerError?: Error) {
        super(details);
        this.name = name;
        this.details = details;
        this.suggestions = suggestions;
        this.errorType = type;
        this.innerError = innerError;
        Object.setPrototypeOf(this, PluginError.prototype);
    }

    genMessage(): string {
        return `${this.message} Suggestions: ${this.suggestions.join("\n")}`;
    }
}

export class PreconditionError extends PluginError {
    constructor(message: string, suggestions: string[]) {
        super(
            ErrorType.System,
            ErrorNames.PRECONDITION_ERROR,
            message,
            suggestions
        );
    }
}

export class DeployWithoutProvisionError extends PluginError {
    constructor() {
        super(
            ErrorType.User,
            ErrorNames.PRECONDITION_ERROR,
            Messages.DoSthBeforeSth("provision", "running deploy"),
            [
                "Please run provision first",
            ]
        );
    }
}

export class SomethingMissingError extends PreconditionError {
    constructor(something: string) {
        super(
            Messages.SomethingIsMissing(something),
            [
                Messages.ReferToHelpLink,
                Messages.RetryTheCurrentStep
            ]
        );
    }
}
export function CheckThrowSomethingMissing(name: string, value: any): void {
    if (!value) {
        throw new SomethingMissingError(name);
    }
}

export class UserInputsError extends PluginError {
    constructor(input: string, value: string) {
        super(
            ErrorType.User,
            ErrorNames.USER_INPUTS_ERROR,
            Messages.SomethingIsInvalidWithValue(input, value),
            [
                Messages.InputValidValueForSomething(input)
            ]
        );
    }
}

export class CallAppStudioError extends PluginError {
    constructor(apiName: string, innerError?: Error) {
        super(
            ErrorType.System,
            ErrorNames.CALL_APPSTUDIO_API_ERROR,
            Messages.FailToCallAppStudio(apiName),
            [
                Messages.RetryTheCurrentStep
            ],
            innerError
        );
    }
}

export class ClientCreationError extends PluginError {
    constructor(clientName: string, innerError?: Error) {
        super(
            ErrorType.System,
            ErrorNames.CLIENT_CREATION_ERROR,
            Messages.FailToCreateSomeClient(clientName),
            [
                Messages.RetryTheCurrentStep
            ],
            innerError
        );
    }
}

export class ProvisionError extends PluginError {
    constructor(resource: string, innerError?: Error) {
        super(
            ErrorType.System,
            ErrorNames.PROVISION_ERROR,
            Messages.FailToProvisionSomeResource(resource),
            [
                Messages.RetryTheCurrentStep
            ],
            innerError
        );
    }
}

export class MissingSubscriptionRegistrationError extends PluginError {
    constructor() {
        super(
            ErrorType.User,
            ErrorNames.MISSING_SUBSCRIPTION_REGISTRATION_ERROR,
            Messages.TheSubsNotRegisterToUseBotService,
            [
                Messages.HowToRegisterSubs
            ]
        );
    }
}

export class ConfigUpdatingError extends PluginError {
    constructor(configName: string, innerError?: Error) {
        super(
            ErrorType.System,
            ErrorNames.CONFIG_UPDATING_ERROR,
            Messages.FailToUpdateConfigs(configName),
            [
                Messages.RetryTheCurrentStep
            ],
            innerError
        );
    }
}

export class ValidationError extends PluginError {
    constructor(name: string, value: string) {
        super(
            ErrorType.System,
            ErrorNames.VALIDATION_ERROR,
            Messages.SomethingIsInvalidWithValue(name, value),
            [
                Messages.ReferToHelpLink
            ]
        );
    }
}

export class PackDirExistenceError extends PluginError {
    constructor() {
        super(
            ErrorType.User,
            ErrorNames.PACK_DIR_EXISTENCE_ERROR,
            Messages.SomethingIsNotExisting("pack directory"),
            [
                Messages.ReferToHelpLink
            ]
        );
    }
}

export class ListPublishingCredentialsError extends PluginError {
    constructor(innerError?: Error) {
        super(
            ErrorType.System,
            ErrorNames.LIST_PUBLISHING_CREDENTIALS_ERROR,
            Messages.FailToListPublishingCredentials,
            [
                Messages.RetryTheCurrentStep
            ],
            innerError
        );
    }
}

export class ZipDeployError extends PluginError {
    constructor(innerError?: Error) {
        super(
            ErrorType.System,
            ErrorNames.ZIP_DEPLOY_ERROR,
            Messages.FailToDoZipDeploy,
            [
                "Please retry the deploy command."
            ],
            innerError
        );
    }
}

export class MessageEndpointUpdatingError extends PluginError {
    constructor(endpoint: string, innerError?: Error) {
        super(
            ErrorType.System,
            ErrorNames.MSG_ENDPOINT_UPDATING_ERROR,
            Messages.FailToUpdateMessageEndpoint(endpoint),
            [
                Messages.RetryTheCurrentStep
            ],
            innerError
        );
    }
}

export class DownloadError extends PluginError {
    constructor(url: string, innerError?: Error) {
        super(
            ErrorType.System,
            ErrorNames.DOWNLOAD_ERROR,
            Messages.FailToDownloadFrom(url),
            [
                "Please check your network status and retry."
            ],
            innerError
        );
    }
}

export class TplManifestFormatError extends PluginError {
    constructor() {
        super(
            ErrorType.System,
            ErrorNames.MANIFEST_FORMAT_ERROR,
            Messages.SomethingIsInWrongFormat("Templates\" manifest.json"),
            [
                Messages.ReferToHelpLink
            ]
        );
    }
}

export class TemplateProjectNotFoundError extends PluginError {
    constructor() {
        super(
            ErrorType.System,
            ErrorNames.TEMPLATE_PROJECT_NOT_FOUND_ERROR,
            Messages.SomethingIsNotFound("Template project for scaffold"),
            [
                Messages.ReferToHelpLink
            ]
        );
    }
}

export class CommandExecutionError extends PluginError {
    constructor(cmd: string, message: string, innerError?: Error) {
        super(
            ErrorType.System,
            ErrorNames.COMMAND_EXECUTION_ERROR,
            Messages.CommandFailWithMessage(cmd, message),
            [
                Messages.RetryTheCurrentStep
            ],
            innerError
        );
    }
}