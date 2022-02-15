// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Template } from "adaptivecards-templating";
import { AdaptiveCard, IAdaptiveCard } from "adaptivecards";

const card = new AdaptiveCard();

const card2: IAdaptiveCard = {
  type: "AdaptiveCard",
  body: [
    /* ... */
  ],
  actions: [
    /* .. */
  ],
};

const template = new Template(card2);

const card3 = template.expand({
  $root: {
    /* ... */
  },
});

card.parse(card3);

const html = card.render(document.body);
