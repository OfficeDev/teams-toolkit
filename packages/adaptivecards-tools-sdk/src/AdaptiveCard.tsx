// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AdaptiveCards } from "./AdaptiveCards";
import React from "react";

export interface AdaptiveCardProps<D> {
  template: AdaptiveCards.Schema;
  data?: D;
}

/**
 * @deprecated This package will be deprecated by 2025-08. Please use [adaptivecards-templating](https://www.npmjs.com/package/adaptivecards-templating) instead.
 */
export function AdaptiveCard<D = any>(props: AdaptiveCardProps<D>): any {
  const { template, data } = props;

  try {
    const payload = data ? AdaptiveCards.renderWithData(template, data) : template;
    return (
      <div
        className="ac-container"
        ref={(v) => {
          v?.firstChild && v?.removeChild(v.firstChild);
          const ac = AdaptiveCards.renderToHtmlElement(payload);
          ac && v?.appendChild(ac);
        }}
      ></div>
    );
  } catch (err) {
    return (
      <div className="ac-container error">
        <div>{(err as unknown as any).toString()}</div>
      </div>
    );
  }
}
