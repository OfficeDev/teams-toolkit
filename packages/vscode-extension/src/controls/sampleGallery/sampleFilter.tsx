// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "./sampleFilter.scss";

import { debounce } from "lodash";
import * as React from "react";

import { ActionButton } from "@fluentui/react";
import {
  VSCodeButton,
  VSCodeDropdown,
  VSCodeOption,
  VSCodeTag,
  VSCodeTextField,
} from "@vscode/webview-ui-toolkit/react";

import {
  TelemetryEvent,
  TelemetryProperty,
  TelemetryTriggerFrom,
} from "../../telemetry/extTelemetryEvents";
import { Commands } from "../Commands";
import { Grid } from "../resources";
import { SampleFilterProps } from "./ISamples";

export default class SampleFilter extends React.Component<SampleFilterProps, unknown> {
  private sampleTypes = ["Tab", "Bot", "Messaging extension"];
  private sampleLanguages = ["TS", "JS"];
  private sampleTechniques = ["Azure", "Adaptive Cards", "SSO", "SPFx", "Outlook", "Graph"];

  constructor(props: SampleFilterProps) {
    super(props);
  }

  render() {
    return (
      <div className="sample-filter">
        <div className="sample-filter-bar">
          <VSCodeTextField
            className="search-box"
            placeholder="Search samples"
            value={this.props.query}
            onInput={this.onSearchTextChanged}
          >
            <span slot="start" className="codicon codicon-search"></span>
          </VSCodeTextField>
          <VSCodeDropdown className="filter-dropdown" onChange={this.onFilterTagChanged}>
            <VSCodeOption selected>type</VSCodeOption>
            {this.sampleTypes
              .filter((type) => this.props.filterTags.indexOf(type) < 0)
              .map((type) => (
                <VSCodeOption>{type}</VSCodeOption>
              ))}
          </VSCodeDropdown>
          <VSCodeDropdown className="filter-dropdown" onChange={this.onFilterTagChanged}>
            <VSCodeOption selected>languages</VSCodeOption>
            {this.sampleLanguages
              .filter((type) => this.props.filterTags.indexOf(type) < 0)
              .map((type) => (
                <VSCodeOption>{type}</VSCodeOption>
              ))}
          </VSCodeDropdown>
          <VSCodeDropdown className="filter-dropdown" onChange={this.onFilterTagChanged}>
            <VSCodeOption selected>techniques</VSCodeOption>
            {this.sampleTechniques
              .filter((type) => this.props.filterTags.indexOf(type) < 0)
              .map((type) => (
                <VSCodeOption>{type}</VSCodeOption>
              ))}
          </VSCodeDropdown>
          <div className="filter-bar"></div>
          <VSCodeButton
            onClick={() => this.props.onLayoutChanged("grid")}
            appearance="icon"
            aria-label="gallary view"
            className={`view-button ${this.props.layout === "grid" ? "view-selected" : ""}`}
          >
            <Grid />
          </VSCodeButton>
          <VSCodeButton
            onClick={() => this.props.onLayoutChanged("list")}
            appearance="icon"
            aria-label="list view"
            className={`view-button ${this.props.layout === "list" ? "view-selected" : ""}`}
          >
            <span className="codicon codicon-list-unordered"></span>
          </VSCodeButton>
        </div>
        <div className="filter-tag-bar">
          {this.props.filterTags.map((tag) => (
            <VSCodeTag className="filter-tag">
              <span>{tag}</span>
              <span className="codicon codicon-close" onClick={() => this.onTagRemoved(tag)}></span>
            </VSCodeTag>
          ))}
          {this.props.filterTags.length > 0 && (
            <ActionButton onClick={this.onAllTagsRemoved}>Clear all</ActionButton>
          )}
        </div>
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
      this.props.onFilterConditionChanged(e.target.value, this.props.filterTags);
    }, 500)();
  };

  private onFilterTagChanged = (e: { target: { value: string } }) => {
    const choice = e.target.value;
    if (choice !== "type" && choice !== "language" && choice !== "technique") {
      this.props.onFilterConditionChanged(this.props.query, [...this.props.filterTags, choice]);
    }
  };

  private onTagRemoved = (removedTag: string) => {
    const newTags = this.props.filterTags.filter((tag) => tag !== removedTag);
    this.props.onFilterConditionChanged(this.props.query, newTags);
  };

  private onAllTagsRemoved = () => {
    this.props.onFilterConditionChanged(this.props.query, []);
  };
}
