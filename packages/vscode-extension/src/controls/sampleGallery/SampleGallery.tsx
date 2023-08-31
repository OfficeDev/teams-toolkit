// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "./SampleGallery.scss";

import * as React from "react";

import { Icon } from "@fluentui/react";

import { Commands } from "../Commands";
import { SampleCollection, SampleInfo } from "./ISamples";
import OfflinePage from "./offlinePage";
import SampleCard from "./sampleCard";
import SampleDetailPage from "./sampleDetailPage";

export default class SampleGallery extends React.Component<
  unknown,
  { samples: Array<SampleInfo>; loading: boolean; selectedSampleId?: string }
> {
  constructor(props: unknown) {
    super(props);
    this.state = {
      samples: [],
      loading: true,
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
    const selectedSample = samples.filter(
      (sample: SampleInfo) => sample.id == this.state.selectedSampleId
    )[0];
    const titleSection = (
      <div className="section" id="title">
        <div className="logo">
          <Icon iconName="Library" className="logo" />
        </div>
        <div className="title">
          <h1>Samples</h1>
          <h3>
            Explore our samples to help you quickly get started with the basic Teams app concepts
            and code structures.
          </h3>
        </div>
      </div>
    );
    if (this.state.loading) {
      return <div className="sample-gallery">{titleSection}</div>;
    } else if (this.state.selectedSampleId) {
      return (
        <SampleDetailPage
          url={selectedSample.downloadUrl}
          image={selectedSample.gifUrl}
          tags={selectedSample.tags}
          time={selectedSample.time}
          configuration={selectedSample.configuration}
          title={selectedSample.title}
          description={selectedSample.fullDescription}
          sampleAppFolder={selectedSample.id}
          selectSample={this.selectSample}
        />
      );
    } else {
      return (
        <div className="sample-gallery">
          {titleSection}
          {this.state.samples.length === 0 ? (
            <OfflinePage />
          ) : (
            // <SampleAppCardList samples={this.state.samples} selectSample={this.selectSample} />
            <div className="sample-stack">
              {this.state.samples.map((sample, index) => {
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
                    selectSample={this.selectSample}
                  />
                );
              })}
            </div>
          )}
        </div>
      );
    }
  }

  titleSection() {
    return (
      <div className="section" id="title">
        <div className="logo">
          <Icon iconName="Library" className="logo" />
        </div>
        <div className="title">
          <h1>Samples</h1>
          <h3>
            Explore our samples to help you quickly get started with the basic Teams app concepts
            and code structures.
          </h3>
        </div>
      </div>
    );
  }

  private receiveMessage = (event: any) => {
    const message = event.data.message;
    switch (message) {
      case Commands.LoadSampleCollection:
        const sampleCollection = event.data.data as SampleCollection;
        this.setState({
          samples: sampleCollection.samples,
          loading: false,
        });
        break;
      default:
        break;
    }
  };

  selectSample = (id: string) => {
    this.setState({
      selectedSampleId: id,
    });
  };
}
