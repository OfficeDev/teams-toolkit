// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { BotFrameworkAdapter } from "botbuilder";
import { CommandBot } from "./command.browser";
import { ConversationOptions } from "./interface";
import { NotificationBot } from "./notification.browser";
import { ErrorWithCode, ErrorCode, ErrorMessage } from "../core/errors";
import { formatString } from "../util/utils";

/**
 * Provide utilities for bot conversation, including:
 *   - handle command and response.
 *   - send notification to varies targets (e.g., member, channel, incoming wehbook).
 *
 * @remarks
 * Only work on server side.
 *
 * @beta
 */
export class ConversationBot {
  /**
   * The bot adapter.
   *
   * @remarks
   * Only work on server side.
   *
   * @beta
   */
  public readonly adapter: BotFrameworkAdapter;

  /**
   * The entrypoint of command and response.
   *
   * @remarks
   * Only work on server side.
   *
   * @beta
   */
  public readonly command?: CommandBot;

  /**
   * The entrypoint of notification.
   *
   * @remarks
   * Only work on server side.
   *
   * @beta
   */
  public readonly notification?: NotificationBot;

  /**
   * Creates new instance of the `ConversationBot`.
   *
   * @param options - initialize options
   *
   * @remarks
   * Only work on server side.
   *
   * @beta
   */
  public constructor(options: ConversationOptions) {
    throw new ErrorWithCode(
      formatString(ErrorMessage.BrowserRuntimeNotSupported, "ConversationBot"),
      ErrorCode.RuntimeNotSupported
    );
  }
}
