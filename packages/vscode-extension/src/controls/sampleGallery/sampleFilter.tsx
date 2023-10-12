// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "./sampleFilter.scss";

import Fuse from "fuse.js";
import { debounce } from "lodash";
import * as React from "react";

import {
  VSCodeButton,
  VSCodeDropdown,
  VSCodeOption,
  VSCodeTag,
  VSCodeTextField,
} from "@vscode/webview-ui-toolkit/react";

import { Grid } from "../resources";
import { SampleFilterProps, SampleFilterState, SampleInfo } from "./ISamples";

export default class SampleFilter extends React.Component<SampleFilterProps, SampleFilterState> {
  private sampleTypes = ["Tab", "Bot", "Messaging extension"];
  private sampleLanguages = ["TS", "JS"];
  private sampleTechniques = ["Azure", "Adaptive Cards", "SSO", "SPFx", "Outlook", "Graph"];

  constructor(props: SampleFilterProps) {
    super(props);
    this.state = {
      selectedTypes: [],
      selectedLanguages: [],
      selectedTechniques: [],
      query: "",
    };
  }

  render() {
    return (
      <div className="sample-filter">
        <div className="sample-filter-bar">
          <VSCodeTextField
            className="search-box"
            placeholder="Search samples"
            value={this.state.query}
            onInput={this.onSearchTextChanged}
          >
            <span slot="start" className="codicon codicon-search"></span>
          </VSCodeTextField>
          <VSCodeDropdown className="filter-dropdown" onChange={this.onTypeFilterChanged}>
            <VSCodeOption selected>type</VSCodeOption>
            {this.sampleTypes
              .filter((type) => this.state.selectedTypes.indexOf(type) < 0)
              .map((type) => (
                <VSCodeOption>{type}</VSCodeOption>
              ))}
          </VSCodeDropdown>
          <VSCodeDropdown className="filter-dropdown" onChange={this.onLanguageFilterChanged}>
            <VSCodeOption selected>languages</VSCodeOption>
            {this.sampleLanguages
              .filter((type) => this.state.selectedLanguages.indexOf(type) < 0)
              .map((type) => (
                <VSCodeOption>{type}</VSCodeOption>
              ))}
          </VSCodeDropdown>
          <VSCodeDropdown className="filter-dropdown" onChange={this.onTechniqueFilterChanged}>
            <VSCodeOption selected>techniques</VSCodeOption>
            {this.sampleTechniques
              .filter((type) => this.state.selectedTechniques.indexOf(type) < 0)
              .map((type) => (
                <VSCodeOption>{type}</VSCodeOption>
              ))}
          </VSCodeDropdown>
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
        <div className="filter-tag-bar">
          <VSCodeTag className="filter-tag">
            <span>Test</span>
            <span className="codicon codicon-close"></span>
          </VSCodeTag>
        </div>
      </div>
    );
  }

  private onSearchTextChanged = (e: { target: { value: string } }) => {
    debounce(() => {
      this.setState({ query: e.target.value });
      this.filterSamples();
    }, 500)();
  };

  private onTypeFilterChanged = (e: { target: { value: string } }) => {
    const choice = e.target.value;
    if (choice !== "type") {
      this.setState({ selectedTypes: [...this.state.selectedTypes, choice] });
      this.filterSamples();
    }
  };

  private onLanguageFilterChanged = (e: { target: { value: string } }) => {
    const choice = e.target.value;
    if (choice !== "language") {
      this.setState({ selectedLanguages: [...this.state.selectedLanguages, choice] });
      this.filterSamples();
    }
  };

  private onTechniqueFilterChanged = (e: { target: { value: string } }) => {
    console.log(e.target.value);
    const choice = e.target.value;
    if (choice !== "technique") {
      this.setState({ selectedTechniques: [...this.state.selectedTechniques, choice] });
      this.filterSamples();
    }
  };

  private filterSamples(): void {
    let filteredSamples = this.props.samples.filter((sample: SampleInfo) => {
      for (const selectedType of this.state.selectedTypes) {
        if (sample.types.indexOf(selectedType) < 0) {
          return false;
        }
      }
      for (const selectedLanguage of this.state.selectedLanguages) {
        if (sample.tags.indexOf(selectedLanguage) < 0) {
          return false;
        }
      }
      for (const selectedTechnique of this.state.selectedTechniques) {
        if (sample.tags.indexOf(selectedTechnique) < 0) {
          return false;
        }
      }
      return true;
    });
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
