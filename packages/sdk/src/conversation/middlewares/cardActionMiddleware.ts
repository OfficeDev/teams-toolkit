import {
  ActivityTypes,
  CardFactory,
  InvokeResponse,
  MessageFactory,
  Middleware,
  StatusCodes,
  TurnContext,
} from "botbuilder";
import {
  AdaptiveCardResponse,
  CardPromptMessage,
  CardPromptMessageType,
  TeamsFxAdaptiveCardActionHandler,
} from "../interface";
import { IAdaptiveCard } from "adaptivecards";

/**
 * @internal
 */
export class CardActionMiddleware implements Middleware {
  public readonly actionHandlers: TeamsFxAdaptiveCardActionHandler[] = [];
  private readonly defaultCardMessage: CardPromptMessage = {
    text: "Your response was sent to the app",
    type: CardPromptMessageType.Info,
  };

  constructor(handlers?: TeamsFxAdaptiveCardActionHandler[]) {
    if (handlers && handlers.length > 0) {
      this.actionHandlers.push(...handlers);
    }
  }

  async onTurn(context: TurnContext, next: () => Promise<void>): Promise<void> {
    if (context.activity.name === "adaptiveCard/action") {
      const action = context.activity.value.action;
      const actionVerb = action.verb;

      for (const handler of this.actionHandlers) {
        if (handler.triggerVerb === actionVerb) {
          const responseCard = await handler.handleActionInvoked(context, action.data);
          if (!responseCard || this.instanceOfCardPromptMessage(responseCard)) {
            // return card prompt message
            await this.sendInvokeResponse(context, responseCard || this.defaultCardMessage);
            return await next();
          }

          if (
            responseCard.refresh &&
            handler.adaptiveCardResponse !== AdaptiveCardResponse.NewForAll
          ) {
            // Card won't be refreshed with AdaptiveCardResponse.ReplaceForInteractor.
            // So set to AdaptiveCardResponse.ReplaceForAll here.
            handler.adaptiveCardResponse = AdaptiveCardResponse.ReplaceForAll;
          }

          const activity = MessageFactory.attachment(CardFactory.adaptiveCard(responseCard));
          switch (handler.adaptiveCardResponse) {
            case AdaptiveCardResponse.NewForAll:
              // Send an invoke response to respond to the `adaptiveCard/action` invoke activity
              await this.sendInvokeResponse(context, this.defaultCardMessage);
              await context.sendActivity(activity);
              break;
            case AdaptiveCardResponse.ReplaceForAll:
              activity.id = context.activity.replyToId;
              await context.updateActivity(activity);
              await this.sendInvokeResponse(context, responseCard);
              break;
            case AdaptiveCardResponse.ReplaceForInteractor:
            default:
              await this.sendInvokeResponse(context, responseCard);
          }
        }
      }
    }

    await next();
  }

  private async sendInvokeResponse(
    context: TurnContext,
    card: IAdaptiveCard | CardPromptMessage
  ): Promise<void> {
    const response: InvokeResponse = this.createInvokeResponse(card);
    await context.sendActivity({
      type: ActivityTypes.InvokeResponse,
      value: response,
    });
  }

  private createInvokeResponse(card: IAdaptiveCard | CardPromptMessage): InvokeResponse<any> {
    // refer to: https://docs.microsoft.com/en-us/adaptive-cards/authoring-cards/universal-action-model#response-format
    if (this.instanceOfCardPromptMessage(card)) {
      switch (card.type) {
        case CardPromptMessageType.Error:
          return {
            status: StatusCodes.OK,
            body: {
              statusCode: StatusCodes.BAD_REQUEST,
              type: "application/vnd.microsoft.error",
              value: {
                code: "BadRequest",
                message: card.text,
              },
            },
          };
        case CardPromptMessageType.Info:
        default:
          return {
            status: StatusCodes.OK,
            body: {
              statusCode: StatusCodes.OK,
              type: "application/vnd.microsoft.activity.message",
              value: card.text,
            },
          };
      }
    } else {
      return {
        status: StatusCodes.OK,
        body: {
          statusCode: StatusCodes.OK,
          type: "application/vnd.microsoft.card.adaptive",
          value: card,
        },
      };
    }
  }

  private instanceOfCardPromptMessage(card: any): card is CardPromptMessage {
    return "text" in card && "type" in card;
  }
}
