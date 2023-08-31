// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "./sampleDetailPage.scss";

import * as React from "react";

import { ActionButton, Image } from "@fluentui/react";
import { VSCodeButton, VSCodeTag } from "@vscode/webview-ui-toolkit/react";

import {
  TelemetryEvent,
  TelemetryProperty,
  TelemetryTriggerFrom,
} from "../../telemetry/extTelemetryEvents";
import { Commands } from "../Commands";
import { Setting, Watch } from "../resources";
import { SampleProps } from "./ISamples";

export default class SampleDetailPage extends React.Component<SampleProps, any> {
  constructor(props: SampleProps) {
    super(props);
  }

  render() {
    const sample = this.props.sample;
    return (
      <div className="sampleDetail">
        <ActionButton iconProps={{ iconName: "ChevronLeft" }} onClick={this.onBack}>
          Back
        </ActionButton>
        <div className="header">
          <div className="contents">
            <h2>{sample.title}</h2>
            <div className="tags">
              {sample.tags.map((value: string) => {
                return (
                  <VSCodeTag className="tag" key={value}>
                    {value}
                  </VSCodeTag>
                );
              })}
            </div>
          </div>
          <div className="buttons">
            <VSCodeButton onClick={this.onCreate}>Create</VSCodeButton>
            <VSCodeButton appearance="secondary" onClick={this.onViewGithub}>
              View on GitHub
            </VSCodeButton>
          </div>
        </div>
        <div className="estimation-time info">
          <div className="watch">
            <Watch></Watch>
          </div>
          <label style={{ paddingLeft: 4 }}>{sample.time}</label>
        </div>
        <div className="configuration info">
          <div className="setting">
            <Setting></Setting>
          </div>
          <label style={{ paddingLeft: 4 }}>{sample.configuration}</label>
        </div>
        <Image src={sample.gifUrl} />
        <div className="description">{sample.fullDescription}</div>
      </div>
    );
  }

  onBack = () => {
    this.props.selectSample("");
  };

  onCreate = () => {
    vscode.postMessage({
      command: Commands.CloneSampleApp,
      data: {
        appName: this.props.sample.title,
        appFolder: this.props.sample.id,
      },
    });
  };

  onViewGithub = () => {
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
