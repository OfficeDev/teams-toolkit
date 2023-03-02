import React, { Component } from "react";

import { mergeStyles } from "@fluentui/react";

function dashboardStyle(isMobile?: boolean) {
  return mergeStyles({
    display: "grid",
    gap: "20px",
    padding: "20px",
    gridTemplateRows: "1fr",
    gridTemplateColumns: "4fr 6fr",
    ...(isMobile === true ? { gridTemplateColumns: "1fr", gridTemplateRows: "1fr" } : {}),
  });
}

interface BaseDashboardState {
  isMobile?: boolean;
  showLogin?: boolean;
  observer?: ResizeObserver;
}

/**
 * The base class for dashboard implementation.
 * It's also a react component, for more information about react component, please refer to https://reactjs.org/docs/react-component.html
 * @param P The type of props.
 * @param S The type of state.
 */
export class BaseDashboard<P, S> extends Component<P, S & BaseDashboardState> {
  protected ref: React.RefObject<HTMLDivElement>;

  /**
   * Constructor for the dashboard class.
   * @param props The properties for the dashboard.
   */
  constructor(props: Readonly<P>) {
    super(props);
    this.state = {
      isMobile: undefined,
      showLogin: undefined,
      observer: undefined,
    } as S & BaseDashboardState;
    this.ref = React.createRef<HTMLDivElement>();
  }

  /**
   * This method is invoked immediately after a component is mounted.
   * For more information about react lifecycle, please refer to https://reactjs.org/docs/react-component.html#componentdidmount
   */
  async componentDidMount() {
    // Observe the dashboard div for resize events
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === this.ref.current) {
          const { width } = entry.contentRect;
          this.setState({ isMobile: width < 600 } as S & BaseDashboardState);
        }
      }
    });
    observer.observe(this.ref.current!);
  }

  /**
   * This method is invoked immediately when a component will be unmounted. It's a good place to clean up the resources.
   */
  componentWillUnmount(): void {
    // Unobserve the dashboard div for resize events
    if (this.state.observer && this.ref.current) {
      this.state.observer.unobserve(this.ref.current);
    }
  }

  /**
   * Define thie dashboard default layout.
   */
  render() {
    return (
      <div
        ref={this.ref}
        className={mergeStyles(dashboardStyle(this.state.isMobile), this.styling())}
      >
        {this.layout()}
      </div>
    );
  }

  /**
   * Override this method to define the layout of the widget in the dashboard.
   */
  protected layout(): JSX.Element | undefined {
    return undefined;
  }

  /**
   * Override this method to customize the dashboard style.
   * @returns The className for the dashboard
   */
  protected styling(): string {
    return null;
  }
}
