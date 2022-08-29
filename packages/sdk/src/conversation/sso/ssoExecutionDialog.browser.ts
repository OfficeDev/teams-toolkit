// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { formatString } from "../../util/utils";
import { ErrorWithCode, ErrorCode, ErrorMessage } from "../../core/errors";
import { TeamsFx } from "../../core/teamsfx.browser";
import { TeamsFxBotSsoCommandHandler } from "../interface";
import { StatePropertyAccessor, TurnContext, Storage } from "botbuilder";
/*
 * Sso execution dialog, use to handle sso command
 */
export class SsoExecutionDialog {
  /**
   * Creates a new instance of the SsoExecutionDialog.
   * @param dedupStorage Helper storage to remove duplicated messages
   * @param requiredScopes The list of scopes for which the token will have access
   * @param teamsfx {@link TeamsFx} instance for authentication
   */
  constructor(dedupStorage: Storage, requiredScopes: string[], teamsfx: TeamsFx) {
    throw new ErrorWithCode(
      formatString(ErrorMessage.BrowserRuntimeNotSupported, "SsoExecutionDialog"),
      ErrorCode.RuntimeNotSupported
    );
  }

  /**
   * Add TeamsFxBotSsoCommandHandler instance
   * @param handler TeamsFxBotSsoCommandHandler instance
   */
  public addCommand(handler: TeamsFxBotSsoCommandHandler): void {
    throw new ErrorWithCode(
      formatString(ErrorMessage.BrowserRuntimeNotSupported, "SsoExecutionDialog"),
      ErrorCode.RuntimeNotSupported
    );
  }

  /**
   * The run method handles the incoming activity (in the form of a DialogContext) and passes it through the dialog system.
   *
   * @param context The context object for the current turn.
   * @param accessor The instance of StatePropertyAccessor for dialog system.
   */
  public async run(context: TurnContext, accessor: StatePropertyAccessor) {
    throw new ErrorWithCode(
      formatString(ErrorMessage.BrowserRuntimeNotSupported, "SsoExecutionDialog"),
      ErrorCode.RuntimeNotSupported
    );
  }

  /**
   * Called when the component is ending.
   *
   * @param context Context for the current turn of conversation.
   */
  protected async onEndDialog(context: TurnContext) {
    throw new ErrorWithCode(
      formatString(ErrorMessage.BrowserRuntimeNotSupported, "SsoExecutionDialog"),
      ErrorCode.RuntimeNotSupported
    );
  }
}
