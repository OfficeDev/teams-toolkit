// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { AdaptiveCard, WrappedAdaptiveCard } from "./interfaces";

export function wrapAdaptiveCard(
  card: AdaptiveCard,
  title: string,
  subtitle: string
): WrappedAdaptiveCard {
  const result: WrappedAdaptiveCard = {
    version: "devPreview",
    $schema: "<URL_REFERENCE_TO_SCHEMA>",
    responseLayout: "list",
    responseCardTemplate: card,
    previewCardTemplate: {
      title: title,
      subtitle: subtitle,
    },
  };

  return result;
}
