import React, { Component, CSSProperties } from "react";

import { mergeStyles, mergeStyleSets } from "@fluentui/react";
import { tokens } from "@fluentui/react-components";

const widgetStyle = mergeStyleSets({
  root: {
    display: "grid",
    padding: "1.25rem 2rem 1.25rem 2rem",
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
    height: "max-content",
    "& div": {
      display: "grid",
      gap: "8px",
      alignItems: "center",
      gridTemplateColumns: "min-content 1fr min-content",
    },
    "& svg": {
      height: "1.5rem",
      width: "1.5rem",
    },
    "& span": {
      fontWeight: tokens.fontWeightSemibold,
      lineHeight: tokens.lineHeightBase200,
      fontSize: tokens.fontSizeBase200,
    },
  },
  footer: {
    "& button": {
      width: "fit-content",
    },
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
    const { root, header, footer } = widgetStyle;
    return (
      <div className={mergeStyles(root, this.genClassName())} style={this.genStyle()}>
        {this.header() && <div className={header}>{this.header()}</div>}
        {this.state.loading !== false && this.loading() !== undefined ? (
          this.loading()
        ) : (
          <>
            {this.body() !== undefined && this.body()}
            {this.footer() !== undefined && <div className={footer}>this.footer()</div>}
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
