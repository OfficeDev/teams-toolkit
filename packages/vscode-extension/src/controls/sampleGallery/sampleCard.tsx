// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "./sampleCard.scss";

import * as React from "react";

import { FontIcon, Image } from "@fluentui/react";
import { VSCodeTag } from "@vscode/webview-ui-toolkit/react";

import Turtle from "../../../img/webview/sample/turtle.svg";
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
    const unavailable = sample.versionComparisonResult != 0;
    const previewImage = (
      <>
        {sample.suggested && (
          <div className="triangle">
            <FontIcon iconName="FavoriteStar" className="star"></FontIcon>
          </div>
        )}
        <Image src={sample.gifUrl} />
      </>
    );
    const legacySampleImage = (
      <div className="unavailableSampleImage">
        <Turtle className="turtle" />
        <h3>Available in newer version</h3>
      </div>
    );
    const upgradingSampleImage = (
      <div className="unavailableSampleImage">
        <Turtle className="turtle" />
        <h3>Upgrading...</h3>
      </div>
    );
    const cardInformation = (
      <div className="infoBox">
        <label className="hidden-label" id="tagLabel">
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
        <label className="hidden-label" id="titleLabel">
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
    let sampleImage = previewImage;
    let tooltipText = "";
    let upgrade = false;
    if (sample.versionComparisonResult < 0) {
      sampleImage = legacySampleImage;
      tooltipText = `This sample is upgraded to only work with newer version of Teams Toolkit, please install v${sample.minimumToolkitVersion} to run it.`;
      upgrade = true;
    } else if (sample.versionComparisonResult > 0) {
      sampleImage = upgradingSampleImage;
      tooltipText = "Coming soon";
    }
    return (
      <div
        className={`sample-card ${unavailable ? "unavailable" : ""}`}
        tabIndex={0}
        onClick={this.onSampleCardClicked}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            this.onSampleCardClicked();
          }
        }}
      >
        <label className="hidden-label">sample app card</label>
        {unavailable && (
          <span className={`tooltip ${upgrade ? "upgrade" : ""}`}>{tooltipText}</span>
        )}
        {sampleImage}
        {cardInformation}
      </div>
    );
  }

  onSampleCardClicked = () => {
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
}
