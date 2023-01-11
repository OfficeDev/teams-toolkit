import { BotFrameworkAdapter } from "botbuilder";
import { CardActionMiddleware } from "./middlewares/cardActionMiddleware";
import { CardActionOptions, TeamsFxAdaptiveCardActionHandler } from "./interface";

/**
 * A card action bot to respond to adaptive card universal actions.
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
    this.middleware = new CardActionMiddleware(options?.actions);
    this.adapter = adapter.use(this.middleware);
  }

  /**
   * Registers a card action handler to the bot.
   * @param actionHandler A card action handler to be registered.
   */
  registerHandler(actionHandler: TeamsFxAdaptiveCardActionHandler) {
    if (actionHandler) {
      this.middleware.actionHandlers.push(actionHandler);
    }
  }

  /**
   * Registers card action handlers to the bot.
   * @param actionHandlers A set of card action handlers to be registered.
   */
  registerHandlers(actionHandlers: TeamsFxAdaptiveCardActionHandler[]) {
    if (actionHandlers) {
      this.middleware.actionHandlers.push(...actionHandlers);
    }
  }
}
