// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "./sampleDetailPage.scss";

import * as React from "react";

import { ActionButton } from "@fluentui/react";
import { VSCodeButton } from "@vscode/webview-ui-toolkit/react";

import { TelemetryTriggerFrom } from "../../telemetry/extTelemetryEvents";
import { Commands } from "../Commands";
import { SampleDetailState, SampleProps } from "./ISamples";
import OfflinePage from "./offlinePage";

export default class SampleDetailPage extends React.Component<SampleProps, SampleDetailState> {
  constructor(props: SampleProps) {
    super(props);
    this.state = {
      loading: true,
      readme: "",
    };
  }

  public componentDidMount() {
    window.addEventListener("message", this.messageHandler, false);
    vscode.postMessage({
      command: Commands.LoadSampleReadme,
      data: this.props.sample,
    });
  }

  public render() {
    const sample = this.props.sample;
    const header = (
      <>
        <div className="header">
          <h2>{sample.title}</h2>
          <div className="buttons">
            <VSCodeButton
              onClick={() =>
                this.props.createSample(this.props.sample, TelemetryTriggerFrom.SampleDetailPage)
              }
              disabled={sample.versionComparisonResult !== 0}
            >
              Create
            </VSCodeButton>
            <VSCodeButton
              appearance="secondary"
              onClick={() =>
                this.props.viewGitHub(this.props.sample, TelemetryTriggerFrom.SampleDetailPage)
              }
            >
              View on GitHub
            </VSCodeButton>
          </div>
        </div>
        <div className="tags">
          {sample.tags.map((value: string) => {
            return (
              <div className="tag" key={value}>
                <span>{value}</span>
              </div>
            );
          })}
        </div>
      </>
    );
    if (this.state.loading) {
      return (
        <div className="sample-detail-page">
          <ActionButton iconProps={{ iconName: "ChevronLeft" }} onClick={this.onBack}>
            Back
          </ActionButton>
          {header}
        </div>
      );
    }
    return (
      <div className="sample-detail-page">
        <ActionButton iconProps={{ iconName: "ChevronLeft" }} onClick={this.onBack}>
          Back
        </ActionButton>
        {sample.versionComparisonResult !== 0 && this.getBanner()}
        {header}
        {this.state.error ? (
          <OfflinePage />
        ) : (
          <div className="readme" dangerouslySetInnerHTML={{ __html: this.state.readme }}></div>
        )}
      </div>
    );
  }

  private messageHandler = (event: any) => {
    const message = event.data.message;
    switch (message) {
      case Commands.LoadSampleReadme:
        const error = event.data.error;
        const readme = event.data.readme;
        this.setState({
          loading: false,
          readme,
          error,
        });
        break;
      default:
        break;
    }
  };

  private onBack = () => {
    this.props.selectSample("", TelemetryTriggerFrom.SampleDetailPage);
  };

  private getBanner = () => {
    let message = "Coming soon";
    if (this.props.sample.versionComparisonResult < 0) {
      message = `This sample is upgraded to only work with newer version of Teams Toolkit, please install v${this.props.sample.minimumToolkitVersion} to run it.`;
    }
    return (
      <div className="upgrade-banner">
        <div className="tooltip">
          <span className="codicon codicon-info"></span>
          <span>{message}</span>
        </div>
        {this.props.sample.versionComparisonResult < 0 && (
          <VSCodeButton
            onClick={() =>
              this.props.upgradeToolkit(this.props.sample, TelemetryTriggerFrom.SampleDetailPage)
            }
          >
            Upgrade Teams Toolkit
          </VSCodeButton>
        )}
      </div>
    );
  };
}
