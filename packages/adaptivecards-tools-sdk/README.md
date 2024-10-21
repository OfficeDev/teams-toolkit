# AdaptiveCards SDK for TypeScript/JavaScript

> This package will be deprecated by 2025-08. Please use [adaptivecards-templating](https://www.npmjs.com/package/adaptivecards-templating) instead.

Adaptivecards-tools sdk aims to reduce developer's efforts to render an Adaptive Card in your project, especially for Adaptive Card with Data, provide type safety check.

## Getting started

### Install the `@microsoft/teamsfx` package

Install the adaptivecards-tools sdk for TypeScript/JavaScript with `npm`:

```bash
npm install @microsoft/adaptivecards-tools
```

### Create a card without data
```ts
import { AdaptiveCards } from "adaptivecards-tools";
import rawWelcomeCard from "./adaptiveCards/welcome.json"

const card = AdaptiveCards.declareWithoutData(rawWelcomeCard).render();
await context.sendActivity({ attachments: [CardFactory.adaptiveCard(card)] });
```

### Create a card with data
```ts
import { AdaptiveCards } from "adaptivecards-tools";
import rawWelcomeCard from "./adaptiveCards/welcome.json"

export interface DataInterface {
  likeCount: number
}

const card = AdaptiveCards.declare<DataInterface>(rawLearnCard).render(this.likeCountObj);
await context.sendActivity({ attachments: [CardFactory.adaptiveCard(card)] });
```