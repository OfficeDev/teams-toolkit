// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { ConstantString } from "./constants";
import { AdaptiveCard, WrappedAdaptiveCard } from "./interfaces";

export function wrapAdaptiveCard(
  card: AdaptiveCard,
  title: string,
  subtitle: string
): WrappedAdaptiveCard {
  const result: WrappedAdaptiveCard = {
    version: ConstantString.AdaptiveCardVersion,
    $schema: ConstantString.AdaptiveCardSchema,
    responseLayout: ConstantString.WrappedCardResponseLayout,
    responseCardTemplate: card,
    previewCardTemplate: {
      title: title,
      subtitle: subtitle,
    },
  };

  return result;
}
