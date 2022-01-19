import { ActionButton, Image } from "@fluentui/react";
import * as React from "react";
import "./sampleDetailPage.scss";
import { VSCodeButton, VSCodeTag } from "./webviewUiToolkit";
import Watch from "../../media/watch.svg";
import Settings from "../../media/settings.svg";

export default class SampleDetailPage extends React.Component<SampleDetailProps, any> {
  constructor(props: SampleDetailProps) {
    super(props);
  }

  render() {
    return (
      <div className="sampleDetail">
        <ActionButton iconProps={{ iconName: "ChevronLeft" }}>Back</ActionButton>
        <div className="header">
          <h2>{this.props.title}</h2>
          <div className="buttons">
            <VSCodeButton>Create</VSCodeButton>
            <VSCodeButton appearance="secondary">View on GitHub</VSCodeButton>
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
}
