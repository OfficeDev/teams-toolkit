import React, { Component } from "react";

import { mergeStyles } from "@fluentui/react";

interface IDashboardState {
  isMobile?: boolean;
  observer?: ResizeObserver;
}

/**
 * The dashboard class which is the base class for all dashboard components.
 */
export class Dashboard extends Component<{}, IDashboardState> {
  private ref: React.RefObject<HTMLDivElement>;

  /**
   * Constructor for the dashboard class.
   * Initializes the dashboard state.
   * @param props The properties for the dashboard.
   */
  constructor(props: any) {
    super(props);
    this.state = {
      isMobile: undefined,
      observer: undefined,
    };
    this.ref = React.createRef<HTMLDivElement>();
  }

  /**
   * This method is invoked immediately after a component is mounted.
   * It's a good place to fetch data from server.
   * For more information about react lifecycle, please refer to https://reactjs.org/docs/react-component.html#componentdidmount
   */
  componentDidMount(): void {
    // Observe the dashboard div for resize events
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        if (entry.target === this.ref.current) {
          const { width } = entry.contentRect;
          this.setState({ isMobile: width < 600 });
        }
      }
    });
    observer.observe(this.ref.current!);
  }

  /**
   * This method is invoked immediately when a component will be unmounted.
   * It's a good place to clean up the resources.
   */
  componentWillUnmount(): void {
    // Unobserve the dashboard div for resize events
    if (this.state.observer && this.ref.current) {
      this.state.observer.unobserve(this.ref.current);
    }
  }

  /**
   * Define thie dashboard default layout, you can edit the code here to customize your dashboard layout.
   */
  render() {
    const styling = mergeStyles({
      display: "grid",
      gap: "20px",
      padding: "1rem",
      gridTemplateColumns: "4fr 6fr",
      gridTemplateRows: "1fr",
      ...(this.state.isMobile && { gridTemplateColumns: "1fr" }),
      ...(this.columnWidths() && { gridTemplateColumns: this.columnWidths() }),
      ...(this.rowHeights() && { gridTemplateRows: this.rowHeights() }),
    });

    return (
      <>
        <div ref={this.ref} className={styling}>
          {this.dashboardLayout()}
        </div>
      </>
    );
  }

  /**
   * Implement this method to define the row heights of the dashboard.
   * For example, if you want to have 3 rows, and the height of the first row is 100px, the height of the second row is 200px, and the height of the third row is 300px, you can return "100px 200px 300px".
   * @returns The row heights of the dashboard.
   */
  protected rowHeights(): string | undefined {
    return undefined;
  }

  /**
   * Implement this method to define the column widths of the dashboard.
   * For example, if you want to have 3 columns, and each column occupies 1/3 of the full width, you can return "1fr 1fr 1fr".
   * @returns The column widths of the dashboard.
   */
  protected columnWidths(): string | undefined {
    return undefined;
  }

  /**
   * Implement this method to define the dashboard layout.
   */
  protected dashboardLayout(): JSX.Element | undefined {
    return undefined;
  }
}
