// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "./sampleFilter.scss";

import { debounce } from "lodash";
import * as React from "react";

import { VSCodeTextField } from "@vscode/webview-ui-toolkit/react";

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
      </div>
    );
  }
}
