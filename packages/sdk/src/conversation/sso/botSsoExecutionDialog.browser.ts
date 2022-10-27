// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { formatString } from "../../util/utils";
import { ErrorWithCode, ErrorCode, ErrorMessage } from "../../core/errors";
import { TeamsFx } from "../../core/teamsfx.browser";
import { BotSsoExecutionDialogHandler, TriggerPatterns } from "../interface";
import { StatePropertyAccessor, TurnContext, Storage } from "botbuilder";
import { OnBehalfOfCredentialAuthConfig } from "../../models/configuration";
import { TeamsBotSsoPromptSettings } from "../../index.browser";
/*
 * Sso execution dialog, use to handle sso command
 */
export class BotSsoExecutionDialog {
  /**
   * Constructor of BotSsoExecutionDialog
   *
   * @remarks
   * Can Only works in in server side.
   */
  constructor(
    dedupStorage: Storage,
    ssoPromptSettings: TeamsBotSsoPromptSettings,
    teamsfx: TeamsFx,
    dialogName?: string
  );
  constructor(
    dedupStorage: Storage,
    ssoPromptSettings: TeamsBotSsoPromptSettings,
    authConfig: OnBehalfOfCredentialAuthConfig,
    initiateLoginEndpoint: string,
    dialogName?: string
  );
  constructor(
    dedupStorage: Storage,
    ssoPromptSettings: TeamsBotSsoPromptSettings,
    authConfig: TeamsFx | OnBehalfOfCredentialAuthConfig,
    ...args: any
  ) {
    throw new ErrorWithCode(
      formatString(ErrorMessage.BrowserRuntimeNotSupported, "BotSsoExecutionDialog"),
      ErrorCode.RuntimeNotSupported
    );
  }

  /**
   * Add TeamsFxBotSsoCommandHandler instance
   * @param handler {@link BotSsoExecutionDialogHandler} callback function
   * @param triggerPatterns The trigger pattern
   */
  public addCommand(handler: BotSsoExecutionDialogHandler, triggerPatterns: TriggerPatterns): void {
    throw new ErrorWithCode(
      formatString(ErrorMessage.BrowserRuntimeNotSupported, "BotSsoExecutionDialog"),
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
      formatString(ErrorMessage.BrowserRuntimeNotSupported, "BotSsoExecutionDialog"),
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
      formatString(ErrorMessage.BrowserRuntimeNotSupported, "BotSsoExecutionDialog"),
      ErrorCode.RuntimeNotSupported
    );
  }
}
