/* eslint-disable @typescript-eslint/no-namespace */
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Template } from "adaptivecards-templating";
import { AdaptiveCard as AC, IAdaptiveCard } from "adaptivecards";
import Markdown from "markdown-it";

const md = new Markdown();

AC.onProcessMarkdown = function (text, result) {
  result.outputHtml = md.render(text);
  result.didProcess = true;
};

export namespace AdaptiveCards {
  export type Schema = IAdaptiveCard;
  export type Payload = IAdaptiveCard;

  export function isAdaptiveCardSchema(object: any): object is Schema {
    return object.type == "AdaptiveCard";
  }

  export function renderWithData<D>(template: Schema, data: D): Schema {
    const payload = new Template(template).expand({ $root: data });
    return payload;
  }

  export function renderToHtmlElement<D extends object = any>(template: Schema, data?: D) {
    return declare<D>(template).renderToHtmlElement(data);
  }

  export function declare<D extends object>(template: any, defaults?: (d: D) => D) {
    return {
      template,
      render(data?: D): Schema {
        return typeof defaults == "function"
          ? renderWithData<D>(template, defaults(data as any))
          : data
          ? renderWithData<D>(template, data)
          : template;
      },
      refresh(verb: string, userIds: string[], data?: D) {
        template.refresh = {
          action: {
            type: "Action.Execute",
            title: verb,
            verb,
            data,
          },
          userIds,
        };
        return this;
      },
      renderToHtmlElement(data?: D): HTMLElement | undefined {
        const ac = new AC();
        ac.parse(this.render(typeof defaults == "function" ? defaults(data as any) : data));
        return ac.render();
      },
    };
  }

  export function declareWithoutData(template: any) {
    const withoutData = declare<object>(template);
    return {
      template,
      render(): Schema {
        return withoutData.render();
      },
      renderToHtmlElement(): HTMLElement | undefined {
        return withoutData.renderToHtmlElement();
      },
    };
  }
}
