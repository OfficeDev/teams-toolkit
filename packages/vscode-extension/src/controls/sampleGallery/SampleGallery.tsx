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
import { SampleFilterOptionType, SampleGalleryState, SampleInfo } from "./ISamples";
import OfflinePage from "./offlinePage";
import SampleCard from "./sampleCard";
import SampleDetailPage from "./sampleDetailPage";
import SampleFilter from "./sampleFilter";
import SampleListItem from "./sampleListItem";

export default class SampleGallery extends React.Component<unknown, SampleGalleryState> {
  private samples: SampleInfo[] = [];
  private filterOptions: SampleFilterOptionType = {
    types: [],
    languages: [],
    techniques: [],
  };

  constructor(props: unknown) {
    super(props);
    this.state = {
      loading: true,
      layout: "grid",
      query: "",
      filterTags: { types: [], languages: [], techniques: [] },
    };
  }

  public componentDidMount() {
    window.addEventListener("message", this.messageHandler, false);
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
      <div id="title">
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
      return (
        <SampleDetailPage
          sample={selectedSample}
          selectSample={this.onSampleSelected}
          createSample={this.onCreateSample}
          viewGitHub={this.onViewGithub}
        />
      );
    } else {
      const featuredSamples = (this.state.filteredSamples ?? this.samples).filter(
        (sample) => sample.suggested
      );
      const normalSamples = (this.state.filteredSamples ?? this.samples).filter(
        (sample) => !sample.suggested
      );
      return (
        <div className="sample-gallery">
          {titleSection}
          {this.state.error !== undefined ? (
            <OfflinePage />
          ) : (
            <>
              <SampleFilter
                samples={this.samples}
                filterOptions={this.filterOptions}
                layout={this.state.layout}
                query={this.state.query}
                filterTags={this.state.filterTags}
                onLayoutChanged={this.onLayoutChanged}
                onFilterConditionChanged={this.onFilterConditionChanged}
              ></SampleFilter>
              {featuredSamples.length > 0 && (
                <div className={`featured-sample-section ${this.state.layout}`}>
                  <div id="featured-sample-title">
                    <span className="codicon codicon-star-full"></span>
                    <h4>Featured samples</h4>
                  </div>
                  {this.state.layout === "grid"
                    ? featuredSamples.map((sample: SampleInfo) => {
                        return (
                          <SampleCard
                            key={sample.id}
                            sample={sample}
                            selectSample={this.onSampleSelected}
                            createSample={this.onCreateSample}
                            viewGitHub={this.onViewGithub}
                          />
                        );
                      })
                    : featuredSamples.map((sample: SampleInfo) => {
                        return (
                          <SampleListItem
                            key={sample.id}
                            sample={sample}
                            selectSample={this.onSampleSelected}
                            createSample={this.onCreateSample}
                            viewGitHub={this.onViewGithub}
                          />
                        );
                      })}
                </div>
              )}
              <div className={`sample-section ${this.state.layout}`}>
                {this.state.layout === "grid"
                  ? normalSamples.map((sample: SampleInfo) => {
                      return (
                        <SampleCard
                          key={sample.id}
                          sample={sample}
                          selectSample={this.onSampleSelected}
                          createSample={this.onCreateSample}
                          viewGitHub={this.onViewGithub}
                        />
                      );
                    })
                  : normalSamples.map((sample: SampleInfo) => {
                      return (
                        <SampleListItem
                          key={sample.id}
                          sample={sample}
                          selectSample={this.onSampleSelected}
                          createSample={this.onCreateSample}
                          viewGitHub={this.onViewGithub}
                        />
                      );
                    })}
              </div>
            </>
          )}
        </div>
      );
    }
  }

  private messageHandler = (event: any) => {
    const message = event.data.message;
    switch (message) {
      case Commands.LoadSampleCollection:
        const error = event.data.error;
        this.samples = event.data.samples as SampleInfo[];
        this.filterOptions = event.data.filterOptions as SampleFilterOptionType;
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

  private onSampleSelected = (id: string, triggerFrom: TelemetryTriggerFrom) => {
    vscode.postMessage({
      command: Commands.SendTelemetryEvent,
      data: {
        eventName: TelemetryEvent.SelectSample,
        properties: {
          [TelemetryProperty.TriggerFrom]: triggerFrom,
          [TelemetryProperty.SampleAppName]: id,
          [TelemetryProperty.SearchText]: this.state.query,
          [TelemetryProperty.SampleFilters]: this.state.filterTags.types
            .concat(this.state.filterTags.languages)
            .concat(this.state.filterTags.techniques)
            .join(","),
          [TelemetryProperty.Layout]: this.state.layout,
        },
      },
    });
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
          [TelemetryProperty.TriggerFrom]: TelemetryTriggerFrom.SampleGallery,
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

  private onFilterConditionChanged = (query: string, filterTags: Record<string, string[]>) => {
    let filteredSamples = this.samples.filter((sample: SampleInfo) => {
      for (const key in filterTags) {
        if (filterTags[key].length === 0) {
          continue;
        }
        let isMatch = false;
        for (const tag of filterTags[key]) {
          if (sample.tags.findIndex((value) => value.includes(tag)) >= 0) {
            isMatch = true;
            break;
          }
        }
        if (!isMatch) {
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

  private onCreateSample = (sample: SampleInfo, triggerFrom: TelemetryTriggerFrom) => {
    vscode.postMessage({
      command: Commands.SendTelemetryEvent,
      data: {
        eventName: TelemetryEvent.CloneSample,
        properties: {
          [TelemetryProperty.TriggerFrom]: triggerFrom,
          [TelemetryProperty.SampleAppName]: sample.id,
          [TelemetryProperty.SearchText]: this.state.query,
          [TelemetryProperty.SampleFilters]: this.state.filterTags.types
            .concat(this.state.filterTags.languages)
            .concat(this.state.filterTags.techniques)
            .join(","),
          [TelemetryProperty.Layout]: this.state.layout,
        },
      },
    });
    vscode.postMessage({
      command: Commands.CloneSampleApp,
      data: {
        appName: sample.title,
        appFolder: sample.id,
      },
    });
  };

  private onViewGithub = (sample: SampleInfo, triggerFrom: TelemetryTriggerFrom) => {
    vscode.postMessage({
      command: Commands.SendTelemetryEvent,
      data: {
        eventName: TelemetryEvent.ViewSampleInGitHub,
        properties: {
          [TelemetryProperty.TriggerFrom]: triggerFrom,
          [TelemetryProperty.SampleAppName]: sample.id,
          [TelemetryProperty.SearchText]: this.state.query,
          [TelemetryProperty.SampleFilters]: this.state.filterTags.types
            .concat(this.state.filterTags.languages)
            .concat(this.state.filterTags.techniques)
            .join(","),
          [TelemetryProperty.Layout]: this.state.layout,
        },
      },
    });
    const sampleInfo = sample.downloadUrlInfo;
    vscode.postMessage({
      command: Commands.OpenExternalLink,
      data: `https://github.com/${sampleInfo.owner}/${sampleInfo.repository}/tree/${sampleInfo.ref}/${sampleInfo.dir}`,
    });
  };
}
