// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { FxError, Result, SystemError, UserError, ok } from 'teamsfx-api';

import { Constants, FrontendPluginInfo } from './constants';

export type TeamsFxResult = Result<any, FxError>;

export class ErrorFactory {
    static readonly source: string = FrontendPluginInfo.ShortName;
    static readonly issueLink: string = FrontendPluginInfo.IssueLink;
    static readonly helpLink: string = FrontendPluginInfo.HelpLink;

    public static UserError(
        name: string,
        message: string,
        innerError?: any,
        stack?: string,
        helpLink?: string,
    ): FxError {
        helpLink ??= this.helpLink;
        return new UserError(name, message, this.source, stack, helpLink, innerError);
    }

    public static SystemError(
        name: string,
        message: string,
        innerError?: any,
        stack?: string,
        issueLink?: string,
    ): FxError {
        issueLink ??= this.issueLink;
        return new SystemError(name, message, this.source, stack, issueLink, innerError);
    }
}
