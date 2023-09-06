// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "./SampleGallery.scss";

import * as React from "react";

import { Icon } from "@fluentui/react";
import Fuse from "fuse.js";

import { Commands } from "../Commands";
import { SampleCollection, SampleInfo } from "./ISamples";
import OfflinePage from "./offlinePage";
import SampleCard from "./sampleCard";
import SampleDetailPage from "./sampleDetailPage";
import SampleFilter from "./sampleFilter";

export default class SampleGallery extends React.Component<
  unknown,
  {
    samples: Array<SampleInfo>;
    loading: boolean;
    query: string;
    fuse: Fuse<SampleInfo>;
    selectedSampleId?: string;
  }
> {
  constructor(props: unknown) {
    super(props);
    this.state = {
      samples: [],
      loading: true,
      query: "",
      fuse: new Fuse([]),
    };
  }

  componentDidMount() {
    window.addEventListener("message", this.receiveMessage, false);
    this.loadSampleCollection();
  }

  loadSampleCollection() {
    vscode.postMessage({
      command: Commands.LoadSampleCollection,
    });
  }

  render() {
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
      const selectedSample = this.state.samples.filter(
        (sample: SampleInfo) => sample.id == this.state.selectedSampleId
      )[0];
      return <SampleDetailPage sample={selectedSample} selectSample={this.selectSample} />;
    } else {
      const query = this.state.query.trim();
      const filteredSamples =
        query === ""
          ? this.state.samples
          : this.state.fuse.search(query).map((result) => result.item);
      return (
        <div className="sample-gallery">
          {titleSection}
          {this.state.samples.length === 0 ? (
            <OfflinePage />
          ) : (
            <>
              <SampleFilter
                query={this.state.query}
                onQueryChange={(newQuery: string) => {
                  this.setState({ query: newQuery });
                }}
              ></SampleFilter>
              <div className="sample-stack">
                {filteredSamples.map((sample) => {
                  return (
                    <SampleCard key={sample.id} sample={sample} selectSample={this.selectSample} />
                  );
                })}
              </div>
            </>
          )}
        </div>
      );
    }
  }

  private receiveMessage = (event: any) => {
    const message = event.data.message;
    switch (message) {
      case Commands.LoadSampleCollection:
        const sampleCollection = event.data.data as SampleCollection;
        this.setState({
          samples: sampleCollection.samples,
          fuse: new Fuse(sampleCollection.samples, {
            keys: ["title", "shortDescription", "fullDescription", "tags"],
          }),
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
