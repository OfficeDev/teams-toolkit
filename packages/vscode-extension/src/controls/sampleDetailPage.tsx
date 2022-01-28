import { ActionButton, Image } from "@fluentui/react";
import * as React from "react";
import "./sampleDetailPage.scss";
import { VSCodeButton, VSCodeTag } from "./webviewUiToolkit";
import Watch from "../../media/watch.svg";
import Settings from "../../media/settings.svg";
import { Commands } from "./Commands";

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
          <h2>{this.props.title}</h2>
          <div className="buttons">
            <VSCodeButton onClick={this.onCreate}>Create</VSCodeButton>
            <VSCodeButton appearance="secondary" onClick={this.onViewGithub}>
              View on GitHub
            </VSCodeButton>
          </div>
        </div>
        <div className="tags">
          {this.props.tags.map((value: string) => {
            return <VSCodeTag className="tag">{value}</VSCodeTag>;
          })}
        </div>
        <div className="estimation-time info">
          <Image
            src={Watch}
            width={16}
            height={16}
            style={{ marginTop: "auto", marginBottom: "auto" }}
          ></Image>

          <label style={{ paddingLeft: 4 }}>{this.props.time}</label>
        </div>
        <div className="configuration info">
          <Image
            src={Settings}
            width={16}
            height={16}
            style={{ marginTop: "auto", marginBottom: "auto" }}
          ></Image>
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
      command: Commands.OpenExternalLink,
      data: this.props.baseUrl + this.props.sampleAppFolder,
    });
  };
}
