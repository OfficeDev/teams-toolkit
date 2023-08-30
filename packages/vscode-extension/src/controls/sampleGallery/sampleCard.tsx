// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "./sampleCard.scss";

import * as React from "react";

import { FontIcon, Image } from "@fluentui/react";
import { VSCodeTag } from "@vscode/webview-ui-toolkit/react";

import {
  TelemetryEvent,
  TelemetryProperty,
  TelemetryTriggerFrom,
} from "../../telemetry/extTelemetryEvents";
import { Commands } from "../Commands";
import { Setting, Watch } from "../resources";
import { SampleCardProps } from "./ISamples";

export default class SampleCard extends React.Component<SampleCardProps, any> {
  constructor(props: SampleCardProps) {
    super(props);
  }

  render() {
    return (
      <div
        className={`sample-card box${this.props.order}`}
        tabIndex={0}
        onClick={this.onSampleCard}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            this.onSampleCard();
          }
        }}
      >
        {this.props.suggested && (
          <div className="triangle">
            <FontIcon iconName="FavoriteStar" className="star"></FontIcon>
          </div>
        )}
        <label
          style={{
            position: "absolute",
            top: "auto",
            left: -9999,
            width: 1,
            height: 1,
            overflow: "hidden",
          }}
        >
          sample app card
        </label>
        <Image src={this.props.image} />
        <label
          style={{
            position: "absolute",
            top: "auto",
            left: -9999,
            width: 1,
            height: 1,
            overflow: "hidden",
          }}
          id="tagLabel"
        >
          sample app tags:
        </label>
        <div className="section" aria-labelledby="tagLabel">
          {this.props.tags &&
            this.props.tags.map((value: string) => {
              return <VSCodeTag className="tag">{value}</VSCodeTag>;
            })}
        </div>
        <label
          style={{
            position: "absolute",
            top: "auto",
            left: -9999,
            width: 1,
            height: 1,
            overflow: "hidden",
          }}
          id="titleLabel"
        >
          sample app title:
        </label>
        <h3>{this.props.title}</h3>
        <div className="estimation-time">
          <div className="watch">
            <Watch></Watch>
          </div>
          <label style={{ paddingLeft: 4 }}>{this.props.time}</label>
        </div>
        <div className="configuration">
          <div className="setting">
            <Setting></Setting>
          </div>
          <label style={{ paddingLeft: 4 }}>{this.props.configuration}</label>
        </div>
      </div>
    );
  }

  onSampleCard = () => {
    vscode.postMessage({
      command: Commands.SendTelemetryEvent,
      data: {
        eventName: TelemetryEvent.ClickSampleCard,
        properties: {
          [TelemetryProperty.TriggerFrom]: TelemetryTriggerFrom.Webview,
          [TelemetryProperty.SampleAppName]: this.props.sampleAppFolder,
        },
      },
    });
    this.props.selectSample(this.props.sampleAppFolder);
  };
}
