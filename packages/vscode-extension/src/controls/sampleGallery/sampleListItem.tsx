// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "./sampleListItem.scss";

import * as React from "react";

import { VSCodeButton, VSCodeTag } from "@vscode/webview-ui-toolkit/react";

import {
  TelemetryEvent,
  TelemetryProperty,
  TelemetryTriggerFrom,
} from "../../telemetry/extTelemetryEvents";
import { Commands } from "../Commands";
import { SampleProps } from "./ISamples";
import { Setting } from "../resources";

export default class SampleListItem extends React.Component<SampleProps, unknown> {
  constructor(props: SampleProps) {
    super(props);
  }

  public render() {
    const sample = this.props.sample;
    let tooltipText = "";
    let needUpgrade = false;
    if (sample.versionComparisonResult < 0) {
      tooltipText = `Available after upgrading`;
      needUpgrade = true;
    } else if (sample.versionComparisonResult > 0) {
      tooltipText = "Coming soon";
    }

    return (
      <div
        className={`sample-list-item`}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            this.onSampleTitleClicked();
          }
        }}
      >
        <label className="hidden-label" id="titleLabel">
          sample app title:
        </label>
        <h3 onClick={this.onSampleTitleClicked}>{sample.title}</h3>
        <label className="hidden-label" id="tagLabel">
          sample app tags:
        </label>
        <div className="tagSection" aria-labelledby="tagLabel">
          {sample.tags &&
            sample.tags.map((value: string) => {
              return (
                <VSCodeTag className="tag" key={value}>
                  {value}
                </VSCodeTag>
              );
            })}
        </div>
        {sample.configuration != "Ready for debug" && (
          <div className="setting">
            <Setting></Setting>
            <span className="tooltip">{sample.configuration}</span>
          </div>
        )}
        <div className="padding" />
        {sample.versionComparisonResult != 0 && (
          <div className="info">
            <span className="codicon codicon-info"></span>
            <div className="tooltip">{tooltipText}</div>
          </div>
        )}
        {sample.versionComparisonResult == 0 ? (
          <VSCodeButton onClick={this.onCreate}>Create</VSCodeButton>
        ) : needUpgrade ? (
          <VSCodeButton onClick={this.onUpgradeToolkit}>Upgrade Teams Toolkit</VSCodeButton>
        ) : (
          <VSCodeButton disabled>Create</VSCodeButton>
        )}
        <VSCodeButton appearance="secondary" onClick={this.onViewGithub}>
          View on GitHub
        </VSCodeButton>
      </div>
    );
  }

  private onSampleTitleClicked = () => {
    if (this.props.sample.versionComparisonResult != 0) {
      return;
    }
    vscode.postMessage({
      command: Commands.SendTelemetryEvent,
      data: {
        eventName: TelemetryEvent.ClickSampleCard,
        properties: {
          [TelemetryProperty.TriggerFrom]: TelemetryTriggerFrom.Webview,
          [TelemetryProperty.SampleAppName]: this.props.sample.id,
        },
      },
    });
    this.props.selectSample(this.props.sample.id);
  };

  private onCreate = () => {
    vscode.postMessage({
      command: Commands.CloneSampleApp,
      data: {
        appName: this.props.sample.title,
        appFolder: this.props.sample.id,
      },
    });
  };

  private onUpgradeToolkit = () => {
    vscode.postMessage({
      command: Commands.SendTelemetryEvent,
      data: {
        eventName: TelemetryEvent.UpgradeToolkitForSample,
        properties: {
          [TelemetryProperty.TriggerFrom]: TelemetryTriggerFrom.Webview,
          [TelemetryProperty.SampleAppName]: this.props.sample.id,
        },
      },
    });
    vscode.postMessage({
      command: Commands.UpgradeToolkit,
      data: {
        version: this.props.sample.minimumToolkitVersion,
      },
    });
  };

  private onViewGithub = () => {
    vscode.postMessage({
      command: Commands.SendTelemetryEvent,
      data: {
        eventName: TelemetryEvent.ViewSampleInGitHub,
        properties: {
          [TelemetryProperty.TriggerFrom]: TelemetryTriggerFrom.Webview,
          [TelemetryProperty.SampleAppName]: this.props.sample.id,
        },
      },
    });
    vscode.postMessage({
      command: Commands.OpenExternalLink,
      data: this.props.sample.downloadUrl,
    });
  };
}
