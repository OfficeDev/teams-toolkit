// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "./SampleGallery.scss";

import Fuse from "fuse.js";
import * as React from "react";

import { Icon } from "@fluentui/react";

import { Commands } from "../Commands";
import { SampleGalleryState, SampleInfo } from "./ISamples";
import OfflinePage from "./offlinePage";
import SampleCard from "./sampleCard";
import SampleDetailPage from "./sampleDetailPage";
import SampleFilter from "./sampleFilter";
import SampleListItem from "./sampleListItem";

export default class SampleGallery extends React.Component<unknown, SampleGalleryState> {
  constructor(props: unknown) {
    super(props);
    this.state = {
      samples: [],
      loading: true,
      query: "",
      fuse: new Fuse([]),
      layout: "grid",
    };
  }

  public componentDidMount() {
    window.addEventListener("message", this.receiveMessage, false);
    vscode.postMessage({
      command: Commands.LoadSampleCollection,
    });
  }

  public render() {
    const titleSection = (
      <div className="section" id="title">
        <div className="logo">
          <Icon iconName="Library" className="logo" />
        </div>
        <div className="title">
          <h1>Samples</h1>
          <h3>
            Explore our sample gallery filled with solutions that work seamlessly with Teams
            Toolkit.
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
          : this.state.fuse.search(query).map((result: { item: SampleInfo }) => result.item);
      return (
        <div className="sample-gallery">
          {titleSection}
          {this.state.error !== undefined ? (
            <OfflinePage />
          ) : (
            <>
              <SampleFilter
                query={this.state.query}
                layout={this.state.layout}
                onQueryChange={(newQuery: string) => {
                  this.setState({ query: newQuery });
                }}
                onLayoutChange={(newLayout: "grid" | "list") => {
                  console.log(newLayout);
                  this.setState({ layout: newLayout });
                }}
              ></SampleFilter>
              {this.state.layout === "grid" ? (
                <div className="sample-stack">
                  {filteredSamples.map((sample: SampleInfo) => {
                    return (
                      <SampleCard
                        key={sample.id}
                        sample={sample}
                        selectSample={this.selectSample}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="sample-list">
                  {filteredSamples.map((sample: SampleInfo) => {
                    return (
                      <SampleListItem
                        key={sample.id}
                        sample={sample}
                        selectSample={this.selectSample}
                      />
                    );
                  })}
                </div>
              )}
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
        const error = event.data.error;
        const samples = event.data.data as SampleInfo[];
        this.setState({
          loading: false,
          samples,
          error,
          fuse: new Fuse(samples, {
            keys: ["title", "shortDescription", "fullDescription", "tags"],
          }),
        });
        break;
      default:
        break;
    }
  };

  private selectSample = (id: string) => {
    this.setState({
      selectedSampleId: id,
    });
  };
}
