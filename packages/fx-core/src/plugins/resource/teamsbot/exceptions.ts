// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ExceptionNames } from './constants';
import { Messages } from './resources/messages';
import { CommonStrings } from './resources/strings';
import { Logger } from './logger';

export enum ExceptionType {
    User,
    System
};

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

    genMessage() {
        return `${this.message} Suggestions: ${this.suggestions.join('\n')}`;
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

export class SomethingMissingException extends PreconditionException {
    constructor(something: string) {
        super(
            Messages.SomethingIsMissing(something),
            [
                Messages.ReferToIssueLink
            ]
        );
    }
}
export function CheckThrowSomethingMissing(name: string, value: any) {
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

export class ClientCreationException extends PluginException {
    constructor(clientName: string, innerError?: Error) {
        super(
            ExceptionType.System,
            ExceptionNames.CLIENT_CREATION_EXCEPTION,
            Messages.FailToCreateSomeClient(clientName),
            [
                Messages.ReferToIssueLink
            ],
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
            [
                Messages.ReferToIssueLink
            ],
            innerError
        );
    }
}

export class ConfigUpdatingException extends PluginException {
    constructor(innerError?: Error) {
        super(
            ExceptionType.System,
            ExceptionNames.CONFIG_UPDATING_EXCEPTION,
            Messages.FailToUpdateConfigs('azure web app'),
            [
                Messages.ReferToIssueLink
            ],
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
            [
                Messages.ReferToIssueLink
            ]
        );
    }
}

export class PackDirExistenceException extends PluginException {
    constructor() {
        super(
            ExceptionType.User,
            ExceptionNames.PACK_DIR_EXISTENCE_EXCEPTION,
            Messages.SomethingIsNotExisting('pack directory'),
            [
                Messages.ReferToHelpLink
            ]
        );
    }
}

export class ListPublishingCredentialsException extends PluginException {
    constructor(innerError?: Error) {
        super(
            ExceptionType.System,
            ExceptionNames.LIST_PUBLISHING_CREDENTIALS_EXCEPTION,
            Messages.FailToListPublishingCredentials,
            [
                Messages.ReferToIssueLink
            ],
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
                Messages.ReferToIssueLink
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
            [
                Messages.ReferToIssueLink
            ],
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
                Messages.ReferToIssueLink
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
            Messages.SomethingIsInWrongFormat('Templates\' manifest.json'),
            [
                Messages.ReferToIssueLink
            ]
        );
    }
}

export class TemplateProjectNotFoundException extends PluginException {
    constructor() {
        super(
            ExceptionType.System,
            ExceptionNames.TEMPLATE_PROJECT_NOT_FOUND_EXCEPTION,
            Messages.SomethingIsNotFound('Template project for scaffold'),
            [
                Messages.ReferToIssueLink
            ]
        );
    }
}

export class LanguageStrategyNotFoundException extends PluginException {
    constructor(lang: string) {
        super(
            ExceptionType.System,
            ExceptionNames.LANGUAGE_STRATEGY_NOT_FOUND_EXCEPTION,
            Messages.FailToFindSomethingFor(CommonStrings.CONFIG_ITEM, lang),
            [
                Messages.ReferToIssueLink
            ]
        );
    }
}

export class CommandExecutionException extends PluginException {
    constructor(cmd: string, message: string, innerError?: Error) {
        super(
            ExceptionType.System,
            ExceptionNames.COMMAND_EXECUTION_EXCEPTION,
            Messages.CommandFailWithMessage(cmd, message),
            [
                Messages.ReferToIssueLink
            ],
            innerError
        )
    }
}