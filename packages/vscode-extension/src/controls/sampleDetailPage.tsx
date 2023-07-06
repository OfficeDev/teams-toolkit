import { ActionButton, Image } from "@fluentui/react";
import * as React from "react";
import "./sampleDetailPage.scss";
import { VSCodeButton, VSCodeTag } from "@vscode/webview-ui-toolkit/react";
import { Watch, Setting } from "./resources";
import { Commands } from "./Commands";
import { SampleDetailProps } from "./ISamples";
import {
  TelemetryEvent,
  TelemetryProperty,
  TelemetryTriggerFrom,
} from "../telemetry/extTelemetryEvents";

export default class SampleDetailPage extends React.Component<SampleDetailProps, any> {
  constructor(props: SampleDetailProps) {
    super(props);
  }

  render() {
    return (
      <div className="sampleDetail">
        <ActionButton iconProps={{ iconName: "ChevronLeft" }} onClick={this.onBack}>
          Back
        </ActionButton>
        <div className="header">
          <div className="contents">
            <h2>{this.props.title}</h2>
            <div className="tags">
              {this.props.tags.map((value: string) => {
                return <VSCodeTag className="tag">{value}</VSCodeTag>;
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
          <label style={{ paddingLeft: 4 }}>{this.props.time}</label>
        </div>
        <div className="configuration info">
          <div className="setting">
            <Setting></Setting>
          </div>
          <label style={{ paddingLeft: 4 }}>{this.props.configuration}</label>
        </div>
        <Image src={this.props.image} />
        <div className="description">{this.props.description}</div>
      </div>
    );
  }

  onBack = () => {
    this.props.highlightSample("");
  };

  onCreate = () => {
    vscode.postMessage({
      command: Commands.CloneSampleApp,
      data: {
        appName: this.props.title,
        appUrl: this.props.sampleAppUrl,
        appFolder: this.props.sampleAppFolder,
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
          [TelemetryProperty.SampleAppName]: this.props.sampleAppFolder,
        },
      },
    });
    vscode.postMessage({
      command: Commands.OpenExternalLink,
      data: this.props.url,
    });
  };
}
