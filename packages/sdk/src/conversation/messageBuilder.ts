// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

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
const { AdaptiveCards } = require("@microsoft/adaptivecards-tools");

/**
 * Provides utility method to build bot message with cards that supported in Teams.
 */
export class MessageBuilder {
  /**
   * Build a bot message activity attached with adaptive card.
   *
   * @param getCardData Function to prepare your card data.
   * @param cardTemplate The adaptive card template.
   * @returns A bot message activity attached with an adaptive card.
   *
   * @example
   * ```javascript
   * const cardTemplate = {
   *   type: "AdaptiveCard",
   *   body: [
   *     {
   *       "type": "TextBlock",
   *       "text": "${title}",
   *       "size": "Large"
   *     },
   *     {
   *       "type": "TextBlock",
   *       "text": "${description}"
   *     }],
   *     $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
   *     version: "1.4"
   *  };
   *
   * type CardData = {
   *   title: string,
   *   description: string
   * };
   * const card = MessageBuilder.attachAdaptiveCard<CardData>(() => {
   *     return {
   *       title: "sample card title",
   *       description: "sample card description"
   *     }}, cardTemplate);
   * ```
   *
   * @beta
   */
  public static attachAdaptiveCard<TData>(
    getCardData: () => TData,
    cardTemplate: any
  ): Partial<Activity> {
    const cardData: TData = getCardData();

    return {
      attachments: [CardFactory.adaptiveCard(AdaptiveCards.declare(cardTemplate).render(cardData))],
    };
  }

  /**
   * Build a bot message activity attached with an adaptive card.
   *
   * @param card The adaptive card content.
   * @returns A bot message activity attached with an adaptive card.
   *
   * @beta
   */
  public static attachAdaptiveCardWithoutData(card: any): Partial<Activity> {
    return {
      attachments: [CardFactory.adaptiveCard(AdaptiveCards.declareWithoutData(card).render())],
    };
  }

  /**
   * Build a bot message activity attached with an hero card.
   *
   * @param title The card title.
   * @param images Optional. The array of images to include on the card.
   * @param buttons Optional. The array of buttons to include on the card. Each `string` in the array
   *      is converted to an `imBack` button with a title and value set to the value of the string.
   * @param other Optional. Any additional properties to include on the card.
   *
   * @returns A bot message activity attached with a hero card.
   *
   * @example
   * ```javascript
   * const message = MessageBuilder.attachHeroCard(
   *      'sample title',
   *      ['https://example.com/sample.jpg'],
   *      ['action']
   * );
   * ```
   *
   * @beta
   */
  public static attachHeroCard(
    title: string,
    images?: (CardImage | string)[],
    buttons?: (CardAction | string)[],
    other?: Partial<HeroCard>
  ): Partial<Activity> {
    return MessageBuilder.attachContent(CardFactory.heroCard(title, images, buttons, other));
  }

  /**
   * Returns an attachment for a sign-in card.
   *
   * @param title The title for the card's sign-in button.
   * @param url The URL of the sign-in page to use.
   * @param text Optional. Additional text to include on the card.
   *
   * @returns A bot message activity attached with a sign-in card.
   *
   * @remarks
   * For channels that don't natively support sign-in cards, an alternative message is rendered.
   *
   * @beta
   */
  public static attachSigninCard(title: string, url: string, text?: string): Partial<Activity> {
    return MessageBuilder.attachContent(CardFactory.signinCard(title, url, text));
  }

  /**
   * Build a bot message activity attached with an Office 365 connector card.
   *
   * @param card A description of the Office 365 connector card.
   * @returns A bot message activity attached with an Office 365 connector card.
   *
   * @beta
   */
  public static attachO365ConnectorCard(card: O365ConnectorCard): Partial<Activity> {
    return MessageBuilder.attachContent(CardFactory.o365ConnectorCard(card));
  }

  /**
   * Build a message activity attached with a receipt card.
   * @param card A description of the receipt card.
   * @returns A message activity attached with a receipt card.
   *
   * @beta
   */
  public static AttachReceiptCard(card: ReceiptCard): Partial<Activity> {
    return MessageBuilder.attachContent(CardFactory.receiptCard(card));
  }

  /**
   *
   * @param title The card title.
   * @param images Optional. The array of images to include on the card.
   * @param buttons Optional. The array of buttons to include on the card. Each `string` in the array
   *      is converted to an `imBack` button with a title and value set to the value of the string.
   * @param other Optional. Any additional properties to include on the card.
   * @returns A message activity attached with a thumbnail card
   *
   * @beta
   */
  public static attachThumbnailCard(
    title: string,
    images?: (CardImage | string)[],
    buttons?: (CardAction | string)[],
    other?: Partial<ThumbnailCard>
  ): Partial<Activity> {
    return MessageBuilder.attachContent(CardFactory.thumbnailCard(title, images, buttons, other));
  }

  /**
   * Add an attachement to a bot activity.
   * @param attachement The attachment object to attach.
   * @returns A message activity with an attachment.
   *
   * @beta
   */
  public static attachContent(attachement: Attachment): Partial<Activity> {
    return {
      attachments: [attachement],
    };
  }
}
