import { Activity } from "botbuilder";
import { AdaptiveCards } from "@microsoft/adaptivecards-tools";

export type AdaptiveCard = any;

/**
 * Build adaptive card payload with card template and data.
 * @param cardData The adaptive card data.
 * @param cardTemplate The adaptive card template.
 * @returns An adaptive card object.
 */
export function buildAdaptiveCard<TData>(cardData: TData, cardTemplate: any): Partial<Activity> {
  return AdaptiveCards.declare<TData>(cardTemplate).render(cardData);
}
