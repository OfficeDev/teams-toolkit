import {
  Activity,
  Attachment,
  CardAction,
  CardFactory,
  CardImage,
  HeroCard,
  O365ConnectorCard,
  ReceiptCard,
  ThumbnailCard,
} from "botbuilder";
import { AdaptiveCards } from "@microsoft/adaptivecards-tools";

export class MessageBuilder {
  /**
   * Utility method to convert the message data to adaptive card for bot framework.
   * @param getCardData Function to prepare your card data.
   * @param cardTemplate The adaptive card template.
   * @returns A bot activity object attached with adaptive card.
   */
  public static attachAdaptiveCard<TData>(
    getCardData: () => TData,
    cardTemplate: any
  ): Partial<Activity> {
    const cardData: TData = getCardData();

    // Wrap the message in adaptive card for bot framework
    return {
      attachments: [
        CardFactory.adaptiveCard(AdaptiveCards.declare<TData>(cardTemplate).render(cardData)),
      ],
    };
  }

  /**
   * Utility method to build adaptive card bot message without user data
   */
  public static attachAdaptiveCardWithoutData(card: any): Partial<Activity> {
    // Wrap the message in adaptive card
    return {
      attachments: [CardFactory.adaptiveCard(AdaptiveCards.declareWithoutData(card).render())],
    };
  }

  public static AttachHeroCard(
    title: string,
    images?: (CardImage | string)[],
    buttons?: (CardAction | string)[],
    other?: Partial<HeroCard>
  ): Partial<Activity> {
    return MessageBuilder.attachCard(CardFactory.heroCard(title, images, buttons, other));
  }

  public static AttachSigninCard(title: string, url: string, text?: string): Partial<Activity> {
    return MessageBuilder.attachCard(CardFactory.signinCard(title, url, text));
  }

  public static AttachO365ConnectorCard(card: O365ConnectorCard): Partial<Activity> {
    return MessageBuilder.attachCard(CardFactory.o365ConnectorCard(card));
  }

  public static AttachReceiptCard(card: ReceiptCard): Partial<Activity> {
    return MessageBuilder.attachCard(CardFactory.receiptCard(card));
  }

  public static AttachThumbnailCard(
    title: string,
    images?: (CardImage | string)[],
    buttons?: (CardAction | string)[],
    other?: Partial<ThumbnailCard>
  ): Partial<Activity> {
    return MessageBuilder.attachCard(CardFactory.thumbnailCard(title, images, buttons, other));
  }

  public static attachCard(cardPayload: Attachment): Partial<Activity> {
    return {
      attachments: [cardPayload],
    };
  }
}
