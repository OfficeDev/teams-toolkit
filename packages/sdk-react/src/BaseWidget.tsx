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
  headerLayout: {
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
  plentyHeader: {
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

interface BaseWidgetState {
  loading?: boolean;
}

/**
 * The base class for widget implementation. I
 * It's also a react component, for more information about react component, please refer to https://reactjs.org/docs/react-component.html
 * @param P the type of props.
 * @param S the type of state.
 */
export class BaseWidget<P, S> extends Component<P, S & BaseWidgetState> {
  constructor(props: Readonly<P>) {
    super(props);
    this.state = { loading: undefined } as S & BaseWidgetState;
  }

  /**
   * This method is invoked immediately after a component is mounted.
   * For more information about react lifecycle, please refer to https://reactjs.org/docs/react-component.html#componentdidmount
   */
  async componentDidMount() {
    this.setState({ ...(await this.getData()), loading: false });
  }

  /**
   * Define the basic layout of a widget
   */
  render() {
    const { root, headerLayout } = widgetStyle;
    return (
      <div className={mergeStyles(root, this.genClassName())} style={this.genStyle()}>
        {this.header() && <div className={headerLayout}>{this.header()}</div>}
        {this.state.loading !== false && this.loading() !== undefined ? (
          this.loading()
        ) : (
          <>
            {this.body() !== undefined && this.body()}
            {this.footer() !== undefined && this.footer()}
          </>
        )}
      </div>
    );
  }

  /**
   * Get data required by the widget
   * @returns data for the widget
   */
  protected async getData(): Promise<S> {
    return undefined;
  }

  /**
   * Override this method to customize the widget header.
   * @returns JSX component for the widget body
   */
  protected header(): JSX.Element | undefined {
    return undefined;
  }

  /**
   * Override this method to customize the widget body.
   * @returns JSX component for the widget body
   */
  protected body(): JSX.Element | undefined {
    return undefined;
  }

  /**
   * Override this method to customize the widget footer.
   * @returns react node for the widget footer
   */
  protected footer(): JSX.Element | undefined {
    return undefined;
  }

  /**
   * Override this method to customize what the widget will look like when it is loading.
   */
  protected loading(): JSX.Element | undefined {
    return undefined;
  }

  /**
   * Override this method to customize the widget style.
   * @returns custom style for the widget
   */
  protected styling(): CSSProperties | string {
    return "";
  }

  /**
   * Construct CSSProperties object for styling the widget.
   * @returns CSSProperties object
   */
  private genStyle(): CSSProperties {
    return typeof this.styling() === "string" ? undefined : (this.styling() as CSSProperties);
  }

  /**
   * Construct className string for styling the widget.
   * @returns className for styling the widget
   */
  private genClassName(): string {
    return typeof this.styling() === "string" ? (this.styling() as string) : "";
  }
}
