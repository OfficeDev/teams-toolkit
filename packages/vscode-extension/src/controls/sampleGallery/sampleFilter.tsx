// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "./sampleFilter.scss";

import Fuse from "fuse.js";
import { debounce } from "lodash";
import * as React from "react";

import { VSCodeButton, VSCodeTextField } from "@vscode/webview-ui-toolkit/react";

import {
  TelemetryEvent,
  TelemetryProperty,
  TelemetryTriggerFrom,
} from "../../telemetry/extTelemetryEvents";
import { Commands } from "../Commands";
import { Grid } from "../resources";
import { SampleFilterProps, SampleFilterState, SampleInfo } from "./ISamples";

export default class SampleFilter extends React.Component<SampleFilterProps, SampleFilterState> {
  constructor(props: SampleFilterProps) {
    super(props);
    this.state = {
      query: "",
    };
  }

  render() {
    return (
      <div className="sample-filter">
        <VSCodeTextField
          className="search-box"
          placeholder="Search samples"
          value={this.state.query}
          onInput={this.onSearchTextChanged}
        >
          <span slot="start" className="codicon codicon-search"></span>
          <span
            slot="end"
            className={`codicon codicon-close ${this.state.query === "" ? "hide" : ""}`}
            onClick={() => this.setState({ query: "" })}
          ></span>
        </VSCodeTextField>
        <div className="filter-bar"></div>
        <VSCodeButton
          onClick={() => this.props.onLayoutChange("grid")}
          appearance="icon"
          aria-label="gallary view"
          className={`view-button ${this.props.layout === "grid" ? "view-selected" : ""}`}
        >
          <Grid />
        </VSCodeButton>
        <VSCodeButton
          onClick={() => this.props.onLayoutChange("list")}
          appearance="icon"
          aria-label="list view"
          className={`view-button ${this.props.layout === "list" ? "view-selected" : ""}`}
        >
          <span className="codicon codicon-list-unordered"></span>
        </VSCodeButton>
      </div>
    );
  }

  private onSearchTextChanged = (e: { target: { value: string } }) => {
    debounce(() => {
      vscode.postMessage({
        command: Commands.SendTelemetryEvent,
        data: {
          eventName: TelemetryEvent.SearchSample,
          properties: {
            [TelemetryProperty.TriggerFrom]: TelemetryTriggerFrom.Webview,
            [TelemetryProperty.SearchText]: e.target.value,
          },
        },
      });
      this.setState({ query: e.target.value });
      this.filterSamples();
    }, 500)();
  };

  private filterSamples(): void {
    let filteredSamples = this.props.samples;
    if (this.state.query !== "") {
      const fuse = new Fuse(filteredSamples, {
        keys: ["title", "shortDescription", "fullDescription", "tags"],
      });
      filteredSamples = fuse
        .search(this.state.query)
        .map((result: { item: SampleInfo }) => result.item);
    }
    this.props.onFilteredSamplesChange(filteredSamples);
  }
}
