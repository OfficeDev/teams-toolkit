// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  BotState,
  ConversationState,
  MemoryStorage,
  SigninStateVerificationQuery,
  StatePropertyAccessor,
  TeamsActivityHandler,
  TurnContext,
  UserState,
} from "botbuilder";
import { TeamsBotSsoPromptSettings } from "../../bot/teamsBotSsoPrompt";
import { TeamsFx } from "../../core/teamsfx";
import { IdentityType } from "../../models/identityType";
import {
  SsoConfig,
  SsoExecutionActivityHandler,
  SsoExecutionDialogHandler,
  TeamsFxBotSsoCommandHandler,
  TriggerPatterns,
} from "../interface";
import { SsoExecutionDialog } from "./ssoExecutionDialog";

/**
 * Default sso execution activity handler
 */
export class DefaultSsoExecutionActivityHandler
  extends TeamsActivityHandler
  implements SsoExecutionActivityHandler
{
  private ssoExecutionDialog: SsoExecutionDialog;
  private userState: BotState;
  private conversationState: BotState;
  private dialogState: StatePropertyAccessor;

  /**
   * Creates a new instance of the DefaultSsoExecutionActivityHandler.
   * @param ssoConfig configuration for sso command bot
   */
  constructor(ssoConfig?: SsoConfig | undefined) {
    super();
    const memoryStorage = new MemoryStorage();
    const userState = ssoConfig?.userState ?? new UserState(memoryStorage);
    const conversationState = ssoConfig?.conversationState ?? new ConversationState(memoryStorage);
    const dedupStorage = ssoConfig?.dedupStorage ?? memoryStorage;
    const scopes = ssoConfig?.scopes ?? ["User.Read"];

    const teamsfx = new TeamsFx(IdentityType.User, { ...ssoConfig?.teamsFxConfig });
    const settings: TeamsBotSsoPromptSettings = {
      scopes: scopes,
      timeout: ssoConfig?.ssoPromptConfig?.timeout,
      endOnInvalidMessage: ssoConfig?.ssoPromptConfig?.endOnInvalidMessage,
    };
    this.ssoExecutionDialog = new SsoExecutionDialog(dedupStorage, settings, teamsfx);
    this.conversationState = conversationState;

    this.dialogState = conversationState.createProperty("DialogState");
    this.userState = userState;

    this.onMessage(async (context, next) => {
      await this.ssoExecutionDialog?.run(context, this.dialogState);
      await next();
    });
  }

  /**
   * Add TeamsFxBotSsoCommandHandler instance to sso execution dialog
   * @param handler {@link SsoExecutionDialogHandler} callback function
   * @param triggerPatterns The trigger pattern
   */
  addCommand(handler: SsoExecutionDialogHandler, triggerPatterns: TriggerPatterns): void {
    this.ssoExecutionDialog.addCommand(handler, triggerPatterns);
  }

  /**
   * Called to initiate the event emission process.
   * @param context The context object for the current turn.
   */
  async run(context: TurnContext) {
    await super.run(context);
    await this.conversationState.saveChanges(context, false);
    await this.userState.saveChanges(context, false);
  }

  /**
   * Receives invoke activities with Activity name of 'signin/verifyState'.
   * @param context A context object for this turn.
   * @param query Signin state (part of signin action auth flow) verification invoke query.
   * @returns A promise that represents the work queued.
   */
  async handleTeamsSigninVerifyState(context: TurnContext, query: SigninStateVerificationQuery) {
    await this.ssoExecutionDialog.run(context, this.dialogState);
  }

  /**
   * Receives invoke activities with Activity name of 'signin/tokenExchange'
   * @param context A context object for this turn.
   * @param query Signin state (part of signin action auth flow) verification invoke query
   * @returns A promise that represents the work queued.
   */
  async handleTeamsSigninTokenExchange(context: TurnContext, query: SigninStateVerificationQuery) {
    await this.ssoExecutionDialog.run(context, this.dialogState);
  }

  /**
   * Handle signin invoke activity type.
   *
   * @param context The context object for the current turn.
   *
   * @remarks
   * Override this method to support channel-specific behavior across multiple channels.
   */
  async onSignInInvoke(context: TurnContext) {
    await this.ssoExecutionDialog.run(context, this.dialogState);
  }
}
