import React, { Component, CSSProperties } from "react";

import { mergeStyles, mergeStyleSets } from "@fluentui/react";
import { tokens } from "@fluentui/react-components";

export const widgetStyle = mergeStyleSets({
  root: {
    display: "grid",
    padding: "0.75rem 1.25rem 1rem 1.25rem",
    backgroundColor: tokens.colorNeutralBackground1,
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: tokens.colorTransparentStroke,
    boxShadow: tokens.shadow4,
    borderRadius: tokens.borderRadiusMedium,
    gap: "1rem",
    gridTemplateRows: "max-content 1fr max-content",
  },
  header: {
    display: "grid",
    alignItems: "center",
    height: "max-content",
  },
  headerWithoutIcon: {
    display: "grid",
    gap: "8px",
    gridTemplateColumns: "1fr min-content",
    alignItems: "center",
  },
  headerContent: {
    display: "grid",
    gap: "8px",
    gridTemplateColumns: "min-content 1fr min-content",
    alignItems: "center",
  },
  headerText: {
    fontWeight: "600 !important",
    lineHeight: "1rem !important",
    fontSize: "0.75rem !important",
  },
  footerBtn: {
    width: "fit-content",
    color: "var(--colorBrandForeground1) !important",
    paddingLeft: "0.25rem !important",
    paddingRight: "0 !important",
  },
});

interface WidgetState {
  loading?: boolean;
}

/**
 * Defined a widget, it's also a react component.
 * For more information about react component, please refer to https://reactjs.org/docs/react-component.html
 * T is the model type of the widget.
 */
export class BaseWidget<T> extends Component<any, T & WidgetState> {
  constructor(props: any) {
    super(props);
    type L = T & WidgetState;
    this.state = { loading: undefined } as L;
  }

  /**
   * This method is invoked immediately after a component is mounted.
   * It's a good place to fetch data from server.
   * For more information about react lifecycle, please refer to https://reactjs.org/docs/react-component.html#componentdidmount
   */
  async componentDidMount() {
    this.setState({ ...(await this.getData()), loading: false });
  }

  /**
   * Define your widget layout, you can edit the code here to customize your widget.
   */
  render() {
    return (
      <div className={mergeStyles(widgetStyle.root, this.genClassName())} style={this.genStyle()}>
        {this.headerContent() && <div className={widgetStyle.header}>{this.headerContent()}</div>}
        {this.state.loading !== false && this.loadingContent() !== undefined ? (
          this.loadingContent()
        ) : (
          <>
            {this.bodyContent() !== undefined && this.bodyContent()}
            {this.footerContent() !== undefined && this.footerContent()}
          </>
        )}
      </div>
    );
  }

  /**
   * Get data required by the widget, you can get data from a api call or static data stored in a file. Override this method according to your needs.
   * @returns data for the widget
   */
  protected async getData(): Promise<T> {
    return undefined;
  }

  /**
   * Override this method to customize the widget header.
   * @returns JSX component for the widget body
   */
  protected headerContent(): JSX.Element | undefined {
    return undefined;
  }

  /**
   * Override this method to customize the widget body.
   * @returns JSX component for the widget body
   */
  protected bodyContent(): JSX.Element | undefined {
    return undefined;
  }

  /**
   * Override this method to customize the widget footer.
   * @returns react node for the widget footer
   */
  protected footerContent(): JSX.Element | undefined {
    return undefined;
  }

  /**
   * Override this method to customize what the widget will look like when it is loading.
   */
  protected loadingContent(): JSX.Element | undefined {
    return undefined;
  }

  /**
   * Override this method to customize the widget style.
   * @returns custom style for the widget
   */
  protected stylingWidget(): CSSProperties | string {
    return "";
  }

  /**
   * Construct CSSProperties object for styling the widget.
   * @returns CSSProperties object
   */
  private genStyle(): CSSProperties {
    return typeof this.stylingWidget() === "string"
      ? undefined
      : (this.stylingWidget() as CSSProperties);
  }

  /**
   * Construct className string for styling the widget.
   * @returns className for styling the widget
   */
  private genClassName(): string {
    return typeof this.stylingWidget() === "string" ? (this.stylingWidget() as string) : "";
  }
}
