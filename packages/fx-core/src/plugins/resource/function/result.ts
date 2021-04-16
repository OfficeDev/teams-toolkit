// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { FxError, Result, SystemError, UserError, err, ok } from "fx-api";

import { CommonConstants, DefaultValues, FunctionPluginInfo } from "./constants";

export type FxResult = Result<any, FxError>;

class FxResultFactory {
    static readonly source: string = CommonConstants.emptyString;
    static readonly defaultHelpLink = CommonConstants.emptyString;
    static readonly defaultIssueLink = CommonConstants.emptyString;

    public static UserError(
        errorMessage: string,
        name: string,
        helpLink?: string,
        innerError?: any,
        stack?: string
    ): FxResult {
        return err(
            new UserError(name, errorMessage, this.source, stack, helpLink ?? this.defaultHelpLink, innerError)
        );
    }

    public static SystemError(
        errorMessage: string,
        name: string,
        issueLink?: string,
        innerError?: any,
        stack?: string
    ): FxResult {
        return err(
            new SystemError(name, errorMessage, this.source, stack, issueLink ?? this.defaultIssueLink, innerError)
        );
    }

    public static Success<T>(result?: T): FxResult {
        return ok(result);
    }
}

export class FunctionPluginResultFactory extends FxResultFactory {
    static readonly source: string = FunctionPluginInfo.alias;
    static readonly defaultHelpLink = DefaultValues.helpLink;
    static readonly defaultIssueLink = DefaultValues.issueLink;
}
