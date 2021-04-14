// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ExceptionNames } from "./constants";
import { Messages } from "./resources/messages";
import { CommonStrings } from "./resources/strings";

export enum ExceptionType {
    User,
    System
}

export class PluginException extends Error {
    public name: string;
    public details: string;
    public suggestions: string[];
    public exceptionType: ExceptionType;
    public innerError?: Error;

    constructor(type: ExceptionType, name: string, details: string, suggestions: string[], innerError?: Error) {
        super(details);
        this.name = name;
        this.details = details;
        this.suggestions = suggestions;
        this.exceptionType = type;
        this.innerError = innerError;
        Object.setPrototypeOf(this, PluginException.prototype);
    }

    genMessage(): string {
        return `${this.message} Suggestions: ${this.suggestions.join("\n")}`;
    }
}

export class PreconditionException extends PluginException {
    constructor(message: string, suggestions: string[]) {
        super(
            ExceptionType.System,
            ExceptionNames.PRECONDITION_EXCEPTION,
            message,
            suggestions
        );
    }
}

export class DeployWithoutProvisionException extends PluginException {
    constructor() {
        super(
            ExceptionType.User,
            ExceptionNames.PRECONDITION_EXCEPTION,
            Messages.DoSthBeforeSth("provision", "running deploy"),
            [
                "Please run provision first",
            ]
        );
    }
}

export class SomethingMissingException extends PreconditionException {
    constructor(something: string) {
        super(
            Messages.SomethingIsMissing(something),
            []
        );
    }
}
export function CheckThrowSomethingMissing(name: string, value: any): void {
    if (!value) {
        throw new SomethingMissingException(name);
    }
}

export class UserInputsException extends PluginException {
    constructor(input: string, value: string) {
        super(
            ExceptionType.User,
            ExceptionNames.USER_INPUTS_EXCEPTION,
            Messages.SomethingIsInvalidWithValue(input, value),
            [
                Messages.InputValidValueForSomething(input)
            ]
        );
    }
}

export class CallAppStudioException extends PluginException {
    constructor(apiName: string, innerError?: Error) {
        super(
            ExceptionType.System,
            ExceptionNames.CALL_APPSTUDIO_API_EXCEPTION,
            Messages.FailToCallAppStudio(apiName),
            [],
            innerError
        );
    }
}

export class ClientCreationException extends PluginException {
    constructor(clientName: string, innerError?: Error) {
        super(
            ExceptionType.System,
            ExceptionNames.CLIENT_CREATION_EXCEPTION,
            Messages.FailToCreateSomeClient(clientName),
            [],
            innerError
        );
    }
}

export class ProvisionException extends PluginException {
    constructor(resource: string, innerError?: Error) {
        super(
            ExceptionType.System,
            ExceptionNames.PROVISION_EXCEPTION,
            Messages.FailToProvisionSomeResource(resource),
            [],
            innerError
        );
    }
}

export class ConfigUpdatingException extends PluginException {
    constructor(configName: string, innerError?: Error) {
        super(
            ExceptionType.System,
            ExceptionNames.CONFIG_UPDATING_EXCEPTION,
            Messages.FailToUpdateConfigs(configName),
            [],
            innerError
        );
    }
}

export class ValidationException extends PluginException {
    constructor(name: string, value: string) {
        super(
            ExceptionType.System,
            ExceptionNames.VALIDATION_EXCEPTION,
            Messages.SomethingIsInvalidWithValue(name, value),
            []
        );
    }
}

export class PackDirExistenceException extends PluginException {
    constructor() {
        super(
            ExceptionType.User,
            ExceptionNames.PACK_DIR_EXISTENCE_EXCEPTION,
            Messages.SomethingIsNotExisting("pack directory"),
            []
        );
    }
}

export class ListPublishingCredentialsException extends PluginException {
    constructor(innerError?: Error) {
        super(
            ExceptionType.System,
            ExceptionNames.LIST_PUBLISHING_CREDENTIALS_EXCEPTION,
            Messages.FailToListPublishingCredentials,
            [],
            innerError
        );
    }
}

export class ZipDeployException extends PluginException {
    constructor(innerError?: Error) {
        super(
            ExceptionType.System,
            ExceptionNames.ZIP_DEPLOY_EXCEPTION,
            Messages.FailToDoZipDeploy,
            [
                "Please retry the deploy command."
            ],
            innerError
        );
    }
}

export class MessageEndpointUpdatingException extends PluginException {
    constructor(endpoint: string, innerError?: Error) {
        super(
            ExceptionType.System,
            ExceptionNames.MSG_ENDPOINT_UPDATING_EXCEPTION,
            Messages.FailToUpdateMessageEndpoint(endpoint),
            [],
            innerError
        );
    }
}

export class DownloadException extends PluginException {
    constructor(url: string, innerError?: Error) {
        super(
            ExceptionType.System,
            ExceptionNames.DOWNLOAD_EXCEPTION,
            Messages.FailToDownloadFrom(url),
            [
                "Please check your network status and retry."
            ],
            innerError
        );
    }
}

export class TplManifestFormatException extends PluginException {
    constructor() {
        super(
            ExceptionType.System,
            ExceptionNames.MANIFEST_FORMAT_EXCEPTION,
            Messages.SomethingIsInWrongFormat("Templates\" manifest.json"),
            []
        );
    }
}

export class TemplateProjectNotFoundException extends PluginException {
    constructor() {
        super(
            ExceptionType.System,
            ExceptionNames.TEMPLATE_PROJECT_NOT_FOUND_EXCEPTION,
            Messages.SomethingIsNotFound("Template project for scaffold"),
            []
        );
    }
}

export class CommandExecutionException extends PluginException {
    constructor(cmd: string, message: string, innerError?: Error) {
        super(
            ExceptionType.System,
            ExceptionNames.COMMAND_EXECUTION_EXCEPTION,
            Messages.CommandFailWithMessage(cmd, message),
            [],
            innerError
        );
    }
}