// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { FxError, Result, SystemError, UserError, err, ok } from "fx-api";

import { CommonConstants, DefaultValues, FunctionPluginInfo } from "./constants";

export type FxResult = Result<any, FxError>;

class FxResultFactory {
    static readonly source: string = CommonConstants.emptyString;
    static readonly defaultHelpLink = CommonConstants.emptyString;
    static readonly defaultIssueLink = CommonConstants.emptyString;

    private static _FxError(errorMessage: string, innerError: any): FxError {
        // TODO: These fields are unclear to me, it may be updated in the future.
        return {
            name: "FxError",
            message: errorMessage,
            source: this.source,
            timestamp: new Date(),
            innerError: innerError
        };
    }

    public static FxError(errorMessage: string, innerError?: any): FxResult {
        return err(this._FxError(errorMessage, innerError));
    }

    public static UserError(errorMessage: string, name: string, helpLink?: string, innerError?: any, stack?: string): FxResult {
        return err({
            ... this._FxError(errorMessage, innerError),
            name: name,
            helpLink: helpLink ?? this.defaultHelpLink,
            stack: stack
        } as UserError);
    }

    public static SystemError(errorMessage: string, name: string, issueLink?: string, innerError?: any, stack?: string): FxResult {
        return err({
            ...this._FxError(errorMessage, innerError),
            name: name,
            issueLink: issueLink ?? this.defaultIssueLink,
            stack: stack
        } as SystemError);
    }

    public static Success(result?: any): FxResult {
        return ok(result);
    }
}

export class FunctionPluginResultFactory extends FxResultFactory {
    static readonly source: string = FunctionPluginInfo.alias;
    static readonly defaultHelpLink = DefaultValues.helpLink;
    static readonly defaultIssueLink = DefaultValues.issueLink;
}
