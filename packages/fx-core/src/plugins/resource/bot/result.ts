/**
 * This file is used to wrap result type of teamsfx-api for function plugin because of its instability.
 */

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { FxError, Result, SystemError, UserError, err, ok } from "teamsfx-api";

import { Links, Alias } from "./constants";

export type FxResult = Result<any, FxError>;

class FxResultFactory {
    static readonly source: string = Alias.TEAMS_BOT_PLUGIN;
    static readonly defaultHelpLink = "";
    static readonly defaultIssueLink = "";

    private static _FxError(errorMessage: string, innerError: any): FxError {
        // TODO: These fields are unclear to me, it may be updated in the future.
        return {
            name: "TeamsfxError",
            message: errorMessage,
            source: this.source,
            timestamp: new Date(),
            innerError: innerError,
        };
    }

    public static FxError(errorMessage: string, innerError?: any): FxResult {
        return err(this._FxError(errorMessage, innerError));
    }

    public static UserError(errorName: string, errorMessage: string, helpLink?: string, innerError?: any): FxResult {
        return err({
            ...this._FxError(errorMessage, innerError),
            name: errorName,
            helpLink: helpLink ?? this.defaultHelpLink,
            stack: innerError?.stack,
        } as UserError);
    }

    public static SystemError(errorName: string, errorMessage: string, issueLink?: string, innerError?: any): FxResult {
        return err({
            ...this._FxError(errorMessage, innerError),
            name: errorName,
            issueLink: issueLink ?? this.defaultIssueLink,
            stack: innerError?.stack,
        } as SystemError);
    }

    public static Success(result?: any): FxResult {
        return ok(result);
    }
}

export class FxTeamsBotPluginResultFactory extends FxResultFactory {
    static readonly source: string = Alias.TEAMS_BOT_PLUGIN;
    static readonly defaultHelpLink = Links.HELP_LINK;
    static readonly defaultIssueLink = Links.ISSUE_LINK;
}
