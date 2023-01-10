import { BotFrameworkAdapter } from "botbuilder";
import { CardActionMiddleware } from "./middlewares/cardActionMiddleware";
import { CardActionOptions, TeamsFxAdaptiveCardActionHandler } from "./interface";
import { ErrorWithCode, ErrorCode, ErrorMessage } from "../core/errors";
import { formatString } from "../util/utils";

/**
 * A card action bot to respond to adaptive card universal actions.
 *
 * @remarks
 * Only work on server side.
 */

/**
 * @deprecated Use `BotBuilderCloudAdapter.CardActionBot` instead.
 */
export class CardActionBot {
  private readonly adapter: BotFrameworkAdapter;
  private middleware: CardActionMiddleware;

  /**
   * Creates a new instance of the `CardActionBot`.
   *
   * @param adapter The bound `BotFrameworkAdapter`.
   * @param options - initialize options
   */
  constructor(adapter: BotFrameworkAdapter, options?: CardActionOptions) {
    throw new ErrorWithCode(
      formatString(ErrorMessage.BrowserRuntimeNotSupported, "CardActionBot"),
      ErrorCode.RuntimeNotSupported
    );
  }

  /**
   * Registers a card action handler to the bot.
   * @param actionHandler A card action handler to be registered.
   *
   * @remarks
   * Only work on server side.
   */
  registerHandler(actionHandler: TeamsFxAdaptiveCardActionHandler) {
    throw new ErrorWithCode(
      formatString(ErrorMessage.BrowserRuntimeNotSupported, "CardActionBot"),
      ErrorCode.RuntimeNotSupported
    );
  }

  /**
   * Registers card action handlers to the bot.
   * @param actionHandlers A set of card action handlers to be registered.
   *
   * @remarks
   * Only work on server side.
   */
  registerHandlers(actionHandlers: TeamsFxAdaptiveCardActionHandler[]) {
    throw new ErrorWithCode(
      formatString(ErrorMessage.BrowserRuntimeNotSupported, "CardActionBot"),
      ErrorCode.RuntimeNotSupported
    );
  }
}
