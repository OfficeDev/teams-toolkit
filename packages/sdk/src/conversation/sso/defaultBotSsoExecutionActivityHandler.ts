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
  BotSsoConfig,
  BotSsoExecutionActivityHandler,
  BotSsoExecutionDialogHandler,
  TriggerPatterns,
} from "../interface";
import { BotSsoExecutionDialog } from "./botSsoExecutionDialog";

/**
 * Default sso execution activity handler
 */
export class DefaultBotSsoExecutionActivityHandler
  extends TeamsActivityHandler
  implements BotSsoExecutionActivityHandler
{
  private ssoExecutionDialog: BotSsoExecutionDialog;
  private userState: BotState;
  private conversationState: BotState;
  private dialogState: StatePropertyAccessor;

  /**
   * Creates a new instance of the DefaultBotSsoExecutionActivityHandler.
   * @param ssoConfig configuration for sso command bot
   */
  constructor(ssoConfig?: BotSsoConfig | undefined) {
    super();
    const memoryStorage = new MemoryStorage();
    const userState = ssoConfig?.dialog?.userState ?? new UserState(memoryStorage);
    const conversationState =
      ssoConfig?.dialog?.conversationState ?? new ConversationState(memoryStorage);
    const dedupStorage = ssoConfig?.dialog?.dedupStorage ?? memoryStorage;
    const scopes = ssoConfig?.aad.scopes ?? [".default"];
    const settings: TeamsBotSsoPromptSettings = {
      scopes: scopes,
      timeout: ssoConfig?.dialog?.ssoPromptConfig?.timeout,
      endOnInvalidMessage: ssoConfig?.dialog?.ssoPromptConfig?.endOnInvalidMessage,
    };

    let teamsfx: TeamsFx;
    if (ssoConfig) {
      const { scopes, ...customConfig } = ssoConfig?.aad;
      teamsfx = new TeamsFx(IdentityType.User, { ...customConfig });
    } else {
      teamsfx = new TeamsFx(IdentityType.User);
    }

    this.ssoExecutionDialog = new BotSsoExecutionDialog(dedupStorage, settings, teamsfx);
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
   * @param handler {@link BotSsoExecutionDialogHandler} callback function
   * @param triggerPatterns The trigger pattern
   */
  addCommand(handler: BotSsoExecutionDialogHandler, triggerPatterns: TriggerPatterns): void {
    this.ssoExecutionDialog.addCommand(handler, triggerPatterns);
  }

  /**
   * Called to initiate the event emission process.
   * @param context The context object for the current turn.
   */
  async run(context: TurnContext) {
    try {
      await super.run(context);
    } finally {
      await this.conversationState.saveChanges(context, false);
      await this.userState.saveChanges(context, false);
    }
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
