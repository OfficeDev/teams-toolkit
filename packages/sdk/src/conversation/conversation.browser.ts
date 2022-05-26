// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { BotFrameworkAdapter, TurnContext, WebRequest, WebResponse } from "botbuilder";
import { CommandBot } from "./command.browser";
import { ConversationOptions } from "./interface";
import { NotificationBot } from "./notification.browser";
import { ErrorWithCode, ErrorCode, ErrorMessage } from "../core/errors";
import { formatString } from "../util/utils";

/**
 * Provide utilities for bot conversation, including:
 *   - handle command and response.
 *   - send notification to varies targets (e.g., member, group, channel).
 *
 * @remarks
 * Only work on server side.
 */
export class ConversationBot {
  /**
   * The bot adapter.
   *
   * @remarks
   * Only work on server side.
   */
  public readonly adapter: BotFrameworkAdapter;

  /**
   * The entrypoint of command and response.
   *
   * @remarks
   * Only work on server side.
   */
  public readonly command?: CommandBot;

  /**
   * The entrypoint of notification.
   *
   * @remarks
   * Only work on server side.
   */
  public readonly notification?: NotificationBot;

  /**
   * Creates new instance of the `ConversationBot`.
   *
   * @param options - initialize options
   *
   * @remarks
   * Only work on server side.
   */
  public constructor(options: ConversationOptions) {
    throw new ErrorWithCode(
      formatString(ErrorMessage.BrowserRuntimeNotSupported, "ConversationBot"),
      ErrorCode.RuntimeNotSupported
    );
  }

  /**
   * The request handler to integrate with web request.
   *
   * @param req - an Express or Restify style request object.
   * @param res - an Express or Restify style response object.
   * @param logic - the additional function to handle bot context.
   *
   * @remarks
   * Only work on server side.
   */
  public async requestHandler(
    req: WebRequest,
    res: WebResponse,
    logic?: (context: TurnContext) => Promise<any>
  ): Promise<void> {
    throw new ErrorWithCode(
      formatString(ErrorMessage.BrowserRuntimeNotSupported, "ConversationBot"),
      ErrorCode.RuntimeNotSupported
    );
  }
}
