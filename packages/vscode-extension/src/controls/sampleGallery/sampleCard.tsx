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
import { SampleProps } from "./ISamples";

export default class SampleCard extends React.Component<SampleProps, unknown> {
  constructor(props: SampleProps) {
    super(props);
  }

  render() {
    const sample = this.props.sample;
    return (
      <div
        className={`sample-card`}
        tabIndex={0}
        onClick={this.onSampleCardClicked}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            this.onSampleCardClicked();
          }
        }}
      >
        {sample.suggested && (
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
        <Image src={sample.gifUrl} />
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
          {sample.tags &&
            sample.tags.map((value: string) => {
              return (
                <VSCodeTag className="tag" key={value}>
                  {value}
                </VSCodeTag>
              );
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
        <h3>{sample.title}</h3>
        <div className="estimation-time">
          <div className="watch">
            <Watch></Watch>
          </div>
          <label style={{ paddingLeft: 4 }}>{sample.time}</label>
        </div>
        <div className="configuration">
          <div className="setting">
            <Setting></Setting>
          </div>
          <label style={{ paddingLeft: 4 }}>{sample.configuration}</label>
        </div>
      </div>
    );
  }

  onSampleCardClicked = () => {
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
}
