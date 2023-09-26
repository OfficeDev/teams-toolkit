// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { ConstantString } from "./constants";
import {
  AdaptiveCard,
  ArrayElement,
  PreviewCardTemplate,
  TextBlockElement,
  WrappedAdaptiveCard,
} from "./interfaces";
import { isWellKnownName } from "./utils";

export function wrapAdaptiveCard(card: AdaptiveCard, jsonPath: string): WrappedAdaptiveCard {
  const result: WrappedAdaptiveCard = {
    version: ConstantString.WrappedCardVersion,
    $schema: ConstantString.WrappedCardSchema,
    jsonPath: jsonPath,
    responseLayout: ConstantString.WrappedCardResponseLayout,
    responseCardTemplate: card,
    previewCardTemplate: inferPreviewCardTemplate(card),
  };

  return result;
}

/**
 * Infers the preview card template from an Adaptive Card and a JSON path.
 * The preview card template includes a title and an optional subtitle and image.
 * It populates the preview card template with the first text block that matches
 * each well-known name, in the order of title, subtitle, and image.
 * If no text block matches the title or subtitle, it uses the first two text block as the title and subtitle.
 * If the title is still empty and the subtitle is not empty, it uses subtitle as the title.
 * @param card The Adaptive Card to infer the preview card template from.
 * @param jsonPath The JSON path to the root object in the card body.
 * @returns The inferred preview card template.
 */
export function inferPreviewCardTemplate(card: AdaptiveCard): PreviewCardTemplate {
  const result: PreviewCardTemplate = {
    title: "",
  };
  const textBlockElements = new Set<TextBlockElement>();

  let rootObject: (TextBlockElement | ArrayElement)[];
  if (card.body[0]?.type === ConstantString.ContainerType) {
    rootObject = (card.body[0] as ArrayElement).items;
  } else {
    rootObject = card.body;
  }

  for (const element of rootObject) {
    if (element.type === ConstantString.TextBlockType) {
      const textElement = element as TextBlockElement;
      const index = textElement.text.indexOf("${if(");
      if (index > 0) {
        textElement.text = textElement.text.substring(index);
        textBlockElements.add(textElement);
      }
    }
  }

  for (const element of textBlockElements) {
    const text = element.text;
    if (!result.title && isWellKnownName(text, ConstantString.WellknownTitleName)) {
      result.title = text;
      textBlockElements.delete(element);
    } else if (!result.subtitle && isWellKnownName(text, ConstantString.WellknownSubtitleName)) {
      result.subtitle = text;
      textBlockElements.delete(element);
    } else if (!result.image && isWellKnownName(text, ConstantString.WellknownImageName)) {
      result.image = {
        url: text,
      };
      textBlockElements.delete(element);
    }
  }

  for (const element of textBlockElements) {
    const text = element.text;
    if (!result.title) {
      result.title = text;
      textBlockElements.delete(element);
    } else if (!result.subtitle) {
      result.subtitle = text;
      textBlockElements.delete(element);
    }
  }

  if (!result.title && result.subtitle) {
    result.title = result.subtitle;
    delete result.subtitle;
  }

  if (!result.title) {
    result.title = "result";
  }

  return result;
}
