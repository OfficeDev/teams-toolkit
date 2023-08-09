// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as React from "react";
import { Icon, Image, FontIcon } from "@fluentui/react";
import { VSCodeTag } from "@vscode/webview-ui-toolkit/react";
import "./SampleGallery.scss";
import { Commands } from "./Commands";
import { SampleCardProps, SampleCollection, SampleInfo, SampleListProps } from "./ISamples";
import { Watch, Setting } from "./resources";
import SampleDetailPage from "./sampleDetailPage";
import {
  TelemetryEvent,
  TelemetryProperty,
  TelemetryTriggerFrom,
} from "../telemetry/extTelemetryEvents";

export default class SampleGallery extends React.Component<
  unknown,
  { samples: Array<SampleInfo>; highlightSampleId?: string }
> {
  constructor(props: unknown) {
    super(props);
    this.state = {
      samples: [],
    };
  }

  componentWillMount() {
    window.addEventListener("message", this.receiveMessage, false);
    this.loadSampleCollection();
  }

  loadSampleCollection() {
    vscode.postMessage({
      command: Commands.LoadSampleCollection,
    });
  }

  render() {
    const samples = this.state.samples as Array<SampleInfo>;
    const highlightedSample = samples.filter(
      (sample: SampleInfo) => sample.id == this.state.highlightSampleId
    )[0];
    return (
      <div>
        {!this.state.highlightSampleId && (
          <div className="sample-gallery">
            <div className="section" id="title">
              <div className="logo">
                <Icon iconName="Library" className="logo" />
              </div>
              <div className="title">
                <h1>Samples</h1>
                <h3>
                  Explore our sample apps to quickly get started with concepts and code examples.
                </h3>
              </div>
            </div>
            <div className="sample-stack">
              <SampleAppCardList
                samples={this.state.samples}
                highlightSample={this.highlightSample}
              />
            </div>
          </div>
        )}
        {this.state.highlightSampleId && (
          <SampleDetailPage
            url={highlightedSample.downloadUrl}
            image={highlightedSample.gifUrl}
            tags={highlightedSample.tags}
            time={highlightedSample.time}
            configuration={highlightedSample.configuration}
            title={highlightedSample.title}
            description={highlightedSample.fullDescription}
            sampleAppFolder={highlightedSample.id}
            highlightSample={this.highlightSample}
          ></SampleDetailPage>
        )}
      </div>
    );
  }

  receiveMessage = (event: any) => {
    const message = event.data.message;
    switch (message) {
      case Commands.LoadSampleCollection:
        const sampleCollection = event.data.data as SampleCollection;
        this.setState({
          samples: sampleCollection.samples,
        });
        break;
      default:
        break;
    }
  };

  highlightSample = (id: string) => {
    this.setState({
      highlightSampleId: id,
    });
  };
}

class SampleAppCardList extends React.Component<SampleListProps, any> {
  constructor(props: SampleListProps) {
    super(props);
  }

  render() {
    const samples = this.props.samples;
    if (samples) {
      return samples.map((sample, index) => {
        return (
          <SampleCard
            url={sample.downloadUrl}
            image={sample.gifUrl}
            tags={sample.tags}
            time={sample.time}
            configuration={sample.configuration}
            title={sample.title}
            description={sample.fullDescription}
            sampleAppFolder={sample.id}
            suggested={sample.suggested}
            order={index + 1}
            highlightSample={this.props.highlightSample}
          />
        );
      });
    }
  }
}

class SampleCard extends React.Component<SampleCardProps, any> {
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
    this.props.highlightSample(this.props.sampleAppFolder);
  };
}
