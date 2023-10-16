// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "./SampleGallery.scss";

import Fuse from "fuse.js";
import * as React from "react";

import { Icon } from "@fluentui/react";

import { GlobalKey } from "../../constants";
import {
  TelemetryEvent,
  TelemetryProperty,
  TelemetryTriggerFrom,
} from "../../telemetry/extTelemetryEvents";
import { Commands } from "../Commands";
import { SampleGalleryState, SampleInfo } from "./ISamples";
import OfflinePage from "./offlinePage";
import SampleCard from "./sampleCard";
import SampleDetailPage from "./sampleDetailPage";
import SampleFilter from "./sampleFilter";
import SampleListItem from "./sampleListItem";

export default class SampleGallery extends React.Component<unknown, SampleGalleryState> {
  private samples: SampleInfo[] = [];

  constructor(props: unknown) {
    super(props);
    this.state = {
      loading: true,
      layout: "grid",
      query: "",
      filterTags: [],
    };
  }

  public componentDidMount() {
    window.addEventListener("message", this.receiveMessage, false);
    vscode.postMessage({
      command: Commands.LoadSampleCollection,
    });
    vscode.postMessage({
      command: Commands.GetData,
      data: {
        key: GlobalKey.SampleGalleryLayout,
      },
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
      const selectedSample = this.samples.filter(
        (sample: SampleInfo) => sample.id == this.state.selectedSampleId
      )[0];
      return <SampleDetailPage sample={selectedSample} selectSample={this.selectSample} />;
    } else {
      return (
        <div className="sample-gallery">
          {titleSection}
          {this.state.error !== undefined ? (
            <OfflinePage />
          ) : (
            <>
              <SampleFilter
                samples={this.samples}
                layout={this.state.layout}
                query={this.state.query}
                filterTags={this.state.filterTags}
                onLayoutChanged={this.onLayoutChanged}
                onFilterConditionChanged={this.onFilterConditionChanged}
              ></SampleFilter>
              {this.state.layout === "grid" ? (
                <div className="sample-stack">
                  {(this.state.filteredSamples ?? this.samples).map((sample: SampleInfo) => {
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
                  {(this.state.filteredSamples ?? this.samples).map((sample: SampleInfo) => {
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
        this.samples = event.data.data as SampleInfo[];
        this.setState({
          loading: false,
          error,
        });
        break;
      case Commands.GetData:
        const key = event.data.data.key;
        const value = event.data.data.value;
        if (key === GlobalKey.SampleGalleryLayout) {
          this.setState({
            layout: value,
          });
        }
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

  private onLayoutChanged = (newLayout: "grid" | "list") => {
    vscode.postMessage({
      command: Commands.SendTelemetryEvent,
      data: {
        eventName: TelemetryEvent.SearchSample,
        properties: {
          [TelemetryProperty.TriggerFrom]: TelemetryTriggerFrom.Webview,
          [TelemetryProperty.Layout]: newLayout,
        },
      },
    });
    vscode.postMessage({
      command: Commands.StoreData,
      data: {
        key: GlobalKey.SampleGalleryLayout,
        value: newLayout,
      },
    });
    this.setState({ layout: newLayout });
  };

  private onFilterConditionChanged = (query: string, filterTags: string[]) => {
    let filteredSamples = this.samples.filter((sample: SampleInfo) => {
      for (const tag of filterTags) {
        if (sample.tags.indexOf(tag) < 0) {
          return false;
        }
      }
      return true;
    });
    if (this.state.query !== "") {
      const fuse = new Fuse(filteredSamples, {
        keys: ["title", "shortDescription", "fullDescription", "tags"],
      });
      filteredSamples = fuse
        .search(this.state.query)
        .map((result: { item: SampleInfo }) => result.item);
    }
    this.setState({ query, filterTags, filteredSamples });
  };
}
