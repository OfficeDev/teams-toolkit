// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "./sampleCard.scss";

import * as React from "react";

import { Image } from "@fluentui/react";

import Turtle from "../../../img/webview/sample/turtle.svg";
import { TelemetryTriggerFrom } from "../../telemetry/extTelemetryEvents";
import { SampleProps } from "./ISamples";

export default class SampleCard extends React.Component<SampleProps, { imageUrl: string }> {
  constructor(props: SampleProps) {
    super(props);
    const downloadUrlInfo = props.sample.downloadUrlInfo;
    this.state = {
      imageUrl: `https://raw.githubusercontent.com/${downloadUrlInfo.owner}/${downloadUrlInfo.repository}/${downloadUrlInfo.ref}/${downloadUrlInfo.dir}/${props.sample.thumbnailPath}`,
    };
  }

  render() {
    const sample = this.props.sample;
    const unavailable = sample.versionComparisonResult != 0;
    const previewImage = (
      <Image
        className="thumbnail"
        src={this.state.imageUrl}
        onError={() => {
          const downloadUrlInfo = sample.downloadUrlInfo;
          this.setState({
            imageUrl: `https://media.githubusercontent.com/media/${downloadUrlInfo.owner}/${downloadUrlInfo.repository}/${downloadUrlInfo.ref}/${downloadUrlInfo.dir}/${sample.thumbnailPath}`,
          });
        }}
      />
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
        <label className="hidden-label" id="titleLabel">
          sample app title:
        </label>
        <h3>{sample.title}</h3>
        <label className="hidden-label" id="tagLabel">
          sample app tags:
        </label>
        <div className="tagSection" aria-labelledby="tagLabel">
          {sample.tags &&
            sample.tags.map((value: string) => {
              return (
                <div className="tag" key={value}>
                  <span>{value}</span>
                </div>
              );
            })}
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
    this.props.selectSample(this.props.sample.id, TelemetryTriggerFrom.SampleGallery);
  };
}
