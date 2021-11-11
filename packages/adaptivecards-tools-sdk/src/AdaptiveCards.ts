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

  export function renderToHtmlElement<D extends object = any>(
    template: Schema,
    data?: D
  ) {
    return declare<D>(template).renderToHtmlElement(data);
  }

  export function declare<D extends object>(
    template: any,
    defaults?: (d: D) => D
  ) {
    return {
      template,
      render(data?: D): Schema {
        return typeof defaults == "function"
          ? renderWithData<D>(template, defaults(data as any))
          : data
            ? renderWithData<D>(template, data)
            : template;
      },
      renderToHtmlElement(data?: D): HTMLElement | undefined {
        const ac = new AC();
        ac.parse(
          this.render(typeof defaults == "function" ? defaults(data as any) : data)
        );
        return ac.render();
      },
    };
  }

  export function declareWithoutData<D extends object>(
    template: any,
    constantData?: D | (() => D)
  ) {
    const withData = declare<D>(template);
    return {
      template,
      render(): Schema {
        return withData.render(
          typeof constantData == "function"
            ? (constantData as Function)()
            : constantData
        );
      },
      renderToHtmlElement(): HTMLElement | undefined {
        return withData.renderToHtmlElement(
          typeof constantData == "function"
            ? (constantData as Function)()
            : constantData
        );
      },
    };
  }
}
