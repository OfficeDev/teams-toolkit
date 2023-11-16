// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "./sampleFilter.scss";

import { debounce } from "lodash";
import * as React from "react";

import { ActionButton, Dropdown, IDropdownOption, IDropdownStyles, IStyle } from "@fluentui/react";
import { VSCodeButton, VSCodeTextField } from "@vscode/webview-ui-toolkit/react";

import {
  TelemetryEvent,
  TelemetryProperty,
  TelemetryTriggerFrom,
} from "../../telemetry/extTelemetryEvents";
import { Commands } from "../Commands";
import { Grid } from "../resources";
import { SampleFilterOptionType, SampleFilterProps } from "./ISamples";

export default class SampleFilter extends React.Component<SampleFilterProps, unknown> {
  constructor(props: SampleFilterProps) {
    super(props);
  }

  render() {
    const sampleTypes = this.props.filterOptions.capabilities;
    const sampleLanguages = this.props.filterOptions.languages;
    const sampleTechniques = this.props.filterOptions.technologies;
    const typeOptions: IDropdownOption[] = sampleTypes.map((type) => {
      const selected = this.props.filterTags.capabilities.indexOf(type) >= 0;
      return { key: type, text: type, selected };
    });
    const languageOptions: IDropdownOption[] = sampleLanguages.map((type) => {
      const selected = this.props.filterTags.languages.indexOf(type) >= 0;
      return { key: type, text: type, selected };
    });
    const techniqueOptions: IDropdownOption[] = sampleTechniques.map((type) => {
      const selected = this.props.filterTags.technologies.indexOf(type) >= 0;
      return { key: type, text: type, selected };
    });
    const dropdownStyles = this.getDropdownStyles();
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
          <Dropdown
            placeholder="Platform capability"
            multiSelect
            options={typeOptions}
            styles={dropdownStyles}
            onChange={this.onFilterCapabilityChanged}
            selectedKeys={sampleTypes.filter((type) => {
              return this.props.filterTags.capabilities.indexOf(type) >= 0;
            })}
            dropdownWidth="auto"
          />
          <Dropdown
            placeholder="Language"
            multiSelect
            options={languageOptions}
            styles={dropdownStyles}
            onChange={this.onFilterLanguageChanged}
            selectedKeys={sampleLanguages.filter((type) => {
              return this.props.filterTags.languages.indexOf(type) >= 0;
            })}
            dropdownWidth="auto"
          />
          <Dropdown
            placeholder="Technology"
            multiSelect
            options={techniqueOptions}
            styles={dropdownStyles}
            onChange={this.onFilterTechnologyChanged}
            selectedKeys={sampleTechniques.filter((type) => {
              return this.props.filterTags.technologies.indexOf(type) >= 0;
            })}
            dropdownWidth="auto"
          />
          <div className="filter-bar"></div>
          <VSCodeButton
            onClick={() => this.props.onLayoutChanged("grid")}
            appearance="icon"
            aria-label="gallary view"
            className={`layout-button ${this.props.layout === "grid" ? "layout-selected" : ""}`}
          >
            <Grid />
          </VSCodeButton>
          <VSCodeButton
            onClick={() => this.props.onLayoutChanged("list")}
            appearance="icon"
            aria-label="list view"
            className={`layout-button ${this.props.layout === "list" ? "layout-selected" : ""}`}
          >
            <span className="codicon codicon-list-unordered"></span>
          </VSCodeButton>
        </div>
        <div className="filter-tag-bar">
          {this.getAllFilterTags().map((tag) => (
            <div className="filter-tag">
              <span>{tag}</span>
              <span className="codicon codicon-close" onClick={() => this.onTagRemoved(tag)}></span>
            </div>
          ))}
          {this.getAllFilterTags().length > 0 && (
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
            [TelemetryProperty.TriggerFrom]: TelemetryTriggerFrom.SampleGallery,
            [TelemetryProperty.SearchText]: e.target.value,
            [TelemetryProperty.SampleFilters]: this.getAllFilterTags().join(","),
          },
        },
      });
      this.props.onFilterConditionChanged(e.target.value, this.props.filterTags);
    }, 500)();
  };

  private onFilterTagChanged = (
    telemetryEvent: TelemetryEvent,
    changedFilter: string,
    newFilterTags: SampleFilterOptionType
  ) => {
    vscode.postMessage({
      command: Commands.SendTelemetryEvent,
      data: {
        eventName: telemetryEvent,
        properties: {
          [TelemetryProperty.TriggerFrom]: TelemetryTriggerFrom.SampleGallery,
          [TelemetryProperty.ChangedFilter]: changedFilter,
          [TelemetryProperty.SampleFilters]: this.getAllFilterTags().join(","),
        },
      },
    });
    this.props.onFilterConditionChanged(this.props.query, newFilterTags);
  };

  private onFilterCapabilityChanged = (
    _event: React.FormEvent<HTMLDivElement>,
    option?: IDropdownOption
  ) => {
    const choice = option?.key as string;
    let telemetryEvent = TelemetryEvent.FilterSampleAdd;
    let newData: string[] = [];
    if (option?.selected) {
      newData = [...this.props.filterTags.capabilities, choice];
    } else {
      telemetryEvent = TelemetryEvent.FilterSampleRemove;
      newData = this.props.filterTags.capabilities.filter((tag) => tag !== choice);
    }
    this.onFilterTagChanged(telemetryEvent, choice, {
      ...this.props.filterTags,
      capabilities: newData,
    });
  };

  private onFilterLanguageChanged = (
    _event: React.FormEvent<HTMLDivElement>,
    option?: IDropdownOption
  ) => {
    const choice = option?.key as string;
    let telemetryEvent = TelemetryEvent.FilterSampleAdd;
    let newData: string[] = [];
    if (option?.selected) {
      newData = [...this.props.filterTags.languages, choice];
    } else {
      telemetryEvent = TelemetryEvent.FilterSampleRemove;
      newData = this.props.filterTags.languages.filter((tag) => tag !== choice);
    }
    this.onFilterTagChanged(telemetryEvent, choice, {
      ...this.props.filterTags,
      languages: newData,
    });
  };

  private onFilterTechnologyChanged = (
    _event: React.FormEvent<HTMLDivElement>,
    option?: IDropdownOption
  ) => {
    const choice = option?.key as string;
    let telemetryEvent = TelemetryEvent.FilterSampleAdd;
    let newData: string[] = [];
    if (option?.selected) {
      newData = [...this.props.filterTags.technologies, choice];
    } else {
      telemetryEvent = TelemetryEvent.FilterSampleRemove;
      newData = this.props.filterTags.technologies.filter((tag) => tag !== choice);
    }
    this.onFilterTagChanged(telemetryEvent, choice, {
      ...this.props.filterTags,
      technologies: newData,
    });
  };

  private onTagRemoved = (removedTag: string) => {
    vscode.postMessage({
      command: Commands.SendTelemetryEvent,
      data: {
        eventName: TelemetryEvent.FilterSampleRemove,
        properties: {
          [TelemetryProperty.TriggerFrom]: TelemetryTriggerFrom.SampleGallery,
          [TelemetryProperty.ChangedFilter]: removedTag,
          [TelemetryProperty.SampleFilters]: this.getAllFilterTags().join(","),
        },
      },
    });
    const newFilterTags = { ...this.props.filterTags };
    newFilterTags.capabilities = newFilterTags.capabilities.filter((tag) => tag !== removedTag);
    newFilterTags.languages = newFilterTags.languages.filter((tag) => tag !== removedTag);
    newFilterTags.technologies = newFilterTags.technologies.filter((tag) => tag !== removedTag);
    this.props.onFilterConditionChanged(this.props.query, newFilterTags);
  };

  private onAllTagsRemoved = () => {
    vscode.postMessage({
      command: Commands.SendTelemetryEvent,
      data: {
        eventName: TelemetryEvent.FilterSampleRemove,
        properties: {
          [TelemetryProperty.TriggerFrom]: TelemetryTriggerFrom.SampleGallery,
          [TelemetryProperty.ChangedFilter]: this.getAllFilterTags().join(","),
          [TelemetryProperty.SampleFilters]: this.getAllFilterTags().join(","),
        },
      },
    });
    const newFilterTags = {
      capabilities: [],
      languages: [],
      technologies: [],
    };
    this.props.onFilterConditionChanged(this.props.query, newFilterTags);
  };

  private getDropdownStyles = (): Partial<IDropdownStyles> => {
    const dropDownStyle: IStyle = {
      "span:first-child": {
        height: 24,
        lineHeight: 21,
        backgroundColor: "var(--vscode-diffEditor-unchangedRegionBackground)",
        color: "var(--vscode-peekViewTitleDescription-foreground, #CCCCCC)",
        fontSize: 13,
        border: "1px solid var(--vscode-menu-separatorBackground, #3C3C3C)",
        fontFamily: "var(--font-family)",
        width: 152,
      },
    };
    const caretStyle: IStyle = {
      backgroundColor: "var(--vscode-diffEditor-unchangedRegionBackground)",
      color: "var(--vscode-dropdown-foreground, #CCCCCC)",
      fontSize: 11,
      lineHeight: 16,
    };
    const checkboxStyle: IStyle = {
      ".ms-Checkbox-checkbox": {
        backgroundColor: "var(--vscode-dropdown-background, #3C3C3C)",
        border: "1px solid var(--vscode-button-secondaryHoverBackground, #3C3C3C)",
        i: {
          color: "var(--vscode-dropdown-background, #3C3C3C)",
        },
      },
    };
    const checkboxStyleSelected: IStyle = {
      ".ms-Checkbox-checkbox": {
        backgroundColor: "var(--vscode-dropdown-background, #3C3C3C)",
        border: "1px solid var(--vscode-button-secondaryHoverBackground, #3C3C3C)",
        i: {
          color: "var(--vscode-peekViewTitleDescription-foreground, #cccccc)",
        },
      },
    };
    const dropdownStyles: Partial<IDropdownStyles> = {
      dropdown: {
        ...dropDownStyle,
        ":hover": {
          ...dropDownStyle,
          ".ms-Dropdown-caretDown": {
            color: "var(--vscode-dropdown-foreground, #CCCCCC)",
          },
        },
        ":focus": {
          ...dropDownStyle,
          ".ms-Dropdown-caretDown": {
            color: "var(--vscode-dropdown-foreground, #CCCCCC)",
          },
        },
        ":active": {
          ".ms-Dropdown-caretDown": {
            color: "var(--vscode-dropdown-foreground, #CCCCCC)",
          },
        },
        marginLeft: 16,
      },
      caretDown: {
        ...caretStyle,
      },
      caretDownWrapper: {
        height: 24,
        lineHeight: 24,
        color: "var(--vscode-dropdown-foreground, #CCCCCC)",
      },
      callout: {
        ".ms-Callout-main": {
          border: "1px solid var(--vscode-inputValidation-infoBorder, #007ACC)",
        },
      },
      dropdownItemsWrapper: {
        padding: "4px 0",
        backgroundColor: "var(--vscode-editorGroupHeader-tabsBackground, #252526)",
      },
      dropdownItem: {
        backgroundColor: "var(--vscode-editorGroupHeader-tabsBackground, #252526)",
        minHeight: 22,
        height: 22,
        ...checkboxStyle,
        ":active": {
          backgroundColor: "var(--vscode-editorGroupHeader-tabsBackground, #252526) !important",
        },
        "input:focus + .ms-Checkbox-label": {
          ...checkboxStyle,
        },
        "input:focus + .ms-Checkbox-label .ms-Checkbox-checkbox": {
          borderColor: "var(--vscode-inputValidation-infoBorder, #007ACC)",
        },
        "input:focus + .ms-Checkbox-label .ms-Checkbox-checkmark": {
          color: "var(--vscode-dropdown-background, #3C3C3C)",
        },
        ":hover": {
          backgroundColor: "var(--vscode-editorStickyScrollHover-background, #303031) !important",
          ".ms-Checkbox-checkmark": {
            color: "var(--vscode-dropdown-background, #3C3C3C)",
          },
          ".ms-Checkbox-checkbox": {
            borderColor: "var(--vscode-button-secondaryHoverBackground, #3C3C3C)",
          },
        },
      },
      dropdownItemSelected: {
        minHeight: 22,
        height: 22,
        backgroundColor: "var(--vscode-editorGroupHeader-tabsBackground, #252526)",
        ...checkboxStyleSelected,
        ":active": {
          backgroundColor: "var(--vscode-editorGroupHeader-tabsBackground, #252526) !important",
        },
        "input:focus + .ms-Checkbox-label": {
          ...checkboxStyleSelected,
        },
        "input:focus + .ms-Checkbox-label .ms-Checkbox-checkbox": {
          borderColor: "var(--vscode-inputValidation-infoBorder, #007ACC)",
        },
        ":focus": {
          ...checkboxStyleSelected,
        },
        ":hover": {
          backgroundColor: "var(--vscode-editorStickyScrollHover-background, #303031) !important",
          ...checkboxStyleSelected,
        },
      },
      dropdownOptionText: {
        fontSize: "13px",
        color: "var(--vscode-dropdown-foreground, #CCCCCC)",
      },
    };
    return dropdownStyles;
  };

  private getAllFilterTags = (): string[] => {
    return this.props.filterTags.capabilities
      .concat(this.props.filterTags.languages)
      .concat(this.props.filterTags.technologies);
  };
}
