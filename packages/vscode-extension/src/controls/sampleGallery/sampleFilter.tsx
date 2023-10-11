// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "./sampleFilter.scss";

import { debounce } from "lodash";
import * as React from "react";

import { VSCodeButton, VSCodeTextField } from "@vscode/webview-ui-toolkit/react";

import { Grid } from "../resources";
import { SampleFilterProps } from "./ISamples";

export default class SampleFilter extends React.Component<SampleFilterProps, unknown> {
  constructor(props: SampleFilterProps) {
    super(props);
  }

  render() {
    return (
      <div className="sample-filter">
        <VSCodeTextField
          className="search-box"
          placeholder="Search samples"
          value={this.props.query}
          onInput={(e: { target: { value: string } }) => {
            debounce(() => this.props.onQueryChange(e.target.value), 500)();
          }}
        >
          <span slot="start" className="codicon codicon-search"></span>
        </VSCodeTextField>
        <div className="filter-bar"></div>
        <VSCodeButton
          onClick={() => this.props.onLayoutChange("grid")}
          appearance="icon"
          aria-label="gallary view"
          className={`view-button ${this.props.layout === "grid" ? "selected" : ""}`}
        >
          <Grid />
        </VSCodeButton>
        <VSCodeButton
          onClick={() => this.props.onLayoutChange("list")}
          appearance="icon"
          aria-label="list view"
          className={`view-button ${this.props.layout === "list" ? "selected" : ""}`}
        >
          <span className="codicon codicon-list-unordered"></span>
        </VSCodeButton>
      </div>
    );
  }
}
