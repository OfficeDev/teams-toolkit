// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "./sampleFilter.scss";

import { debounce } from "lodash";
import * as React from "react";

import { ActionButton, Dropdown, IDropdownOption, IDropdownStyles, IStyle } from "@fluentui/react";
import { VSCodeButton, VSCodeTag, VSCodeTextField } from "@vscode/webview-ui-toolkit/react";

import {
  TelemetryEvent,
  TelemetryProperty,
  TelemetryTriggerFrom,
} from "../../telemetry/extTelemetryEvents";
import { Commands } from "../Commands";
import { Grid } from "../resources";
import { SampleFilterProps } from "./ISamples";

export default class SampleFilter extends React.Component<SampleFilterProps, unknown> {
  private sampleTypes = ["Tab", "Bot", "Message extension"];
  private sampleLanguages = ["TS", "JS"];
  private sampleTechniques = ["Azure", "Adaptive Cards", "SSO", "SPFx", "Outlook", "Graph"];

  constructor(props: SampleFilterProps) {
    super(props);
  }

  render() {
    const typeOptions: IDropdownOption[] = this.sampleTypes.map((type) => {
      const selected = this.props.filterTags.indexOf(type) >= 0;
      return { key: type, text: type, selected };
    });
    const languageOptions: IDropdownOption[] = this.sampleLanguages.map((type) => {
      const selected = this.props.filterTags.indexOf(type) >= 0;
      return { key: type, text: type, selected };
    });
    const techniqueOptions: IDropdownOption[] = this.sampleTechniques.map((type) => {
      const selected = this.props.filterTags.indexOf(type) >= 0;
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
            placeholder="type"
            multiSelect
            options={typeOptions}
            styles={dropdownStyles}
            onChange={this.onFilterTagChanged}
            selectedKeys={this.sampleTypes.filter((type) => {
              return this.props.filterTags.indexOf(type) >= 0;
            })}
          />
          <Dropdown
            placeholder="language"
            multiSelect
            options={languageOptions}
            styles={dropdownStyles}
            onChange={this.onFilterTagChanged}
            selectedKeys={this.sampleLanguages.filter((type) => {
              return this.props.filterTags.indexOf(type) >= 0;
            })}
          />
          <Dropdown
            placeholder="technique"
            multiSelect
            options={techniqueOptions}
            styles={dropdownStyles}
            onChange={this.onFilterTagChanged}
            selectedKeys={this.sampleTechniques.filter((type) => {
              return this.props.filterTags.indexOf(type) >= 0;
            })}
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

  private onFilterTagChanged = (
    _event: React.FormEvent<HTMLDivElement>,
    option?: IDropdownOption
  ) => {
    const choice = option?.key as string;
    const newTags = option?.selected
      ? [...this.props.filterTags, choice]
      : this.props.filterTags.filter((tag) => tag !== choice);
    this.props.onFilterConditionChanged(this.props.query, newTags);
  };

  private onTagRemoved = (removedTag: string) => {
    const newTags = this.props.filterTags.filter((tag) => tag !== removedTag);
    this.props.onFilterConditionChanged(this.props.query, newTags);
  };

  private onAllTagsRemoved = () => {
    this.props.onFilterConditionChanged(this.props.query, []);
  };

  private getDropdownStyles = (): Partial<IDropdownStyles> => {
    const dropDownStyle: IStyle = {
      "span:first-child": {
        // borderRadius: 0,
        height: 24,
        lineHeight: 24,
        backgroundColor: "var(--vscode-dropdown-border, #3C3C3C)",
        color: "var(--vscode-dropdown-foreground, #CCCCCC)",
        fontSize: 13,
        border: 0,
      },
    };
    const caretStyle: IStyle = {
      backgroundColor: "var(--vscode-dropdown-border, #3C3C3C)",
      color: "var(--vscode-dropdown-foreground, #CCCCCC)",
      fontSize: 11,
      lineHeight: 16,
    };
    const checkboxStyle: IStyle = {
      ".ms-Checkbox-checkbox": {
        backgroundColor: "var(--vscode-dropdown-border, #3C3C3C)",
        border: "1px solid var(--vscode-inputValidation-infoBorder, #007ACC)",
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
        width: 146,
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
          // borderRadius: 5,
          border: "1px solid var(--vscode-inputValidation-infoBorder, #007ACC)",
        },
      },
      dropdownItemsWrapper: {
        padding: "4px 0",
        backgroundColor: "var(--vscode-editorGroupHeader-tabsBackground, #252526)",
      },
      dropdownItem: {
        backgroundColor: "var(--vscode-editorGroupHeader-tabsBackground, #252526)",
        color: "var(--vscode-dropdown-foreground, #CCCCCC)",
        minHeight: 22,
        height: 22,
        ".ms-Checkbox-checkbox": {
          backgroundColor: "var(--vscode-dropdown-border, #3C3C3C)",
          border: 0,
        },
        ":active": {
          backgroundColor: "var(--vscode-editorGroupHeader-tabsBackground, #252526) !important",
          ".ms-Checkbox-checkmark": {
            color: "var(--vscode-button-foreground, #FFFFFF)",
          },
        },
        "input:focus + .ms-Checkbox-label": {
          ...checkboxStyle,
        },
        ":hover": {
          ".ms-Checkbox-checkmark": {
            color: "var(--vscode-button-foreground, #FFFFFF)",
          },
        },
      },
      dropdownItemSelected: {
        minHeight: 22,
        height: 22,
        backgroundColor: "var(--vscode-editorGroupHeader-tabsBackground, #252526)",
        ".ms-Checkbox-checkbox": {
          backgroundColor: "var(--vscode-dropdown-border, #3C3C3C)",
          border: 0,
        },
        ":active": {
          backgroundColor: "var(--vscode-editorGroupHeader-tabsBackground, #252526) !important",
        },
        "input:focus + .ms-Checkbox-label": {
          ...checkboxStyle,
        },
        ":focus": {
          ...checkboxStyle,
        },
        ":hover": {
          backgroundColor: "var(--vscode-editorGroupHeader-tabsBackground, #252526) !important",
          ...checkboxStyle,
        },
      },
      dropdownOptionText: {
        fontSize: "13px",
        color: "var(--vscode-dropdown-foreground, #CCCCCC)",
      },
    };
    return dropdownStyles;
  };
}
