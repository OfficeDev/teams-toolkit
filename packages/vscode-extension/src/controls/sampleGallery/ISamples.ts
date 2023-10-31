// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export type SampleGalleryState = {
  loading: boolean;
  filteredSamples?: Array<SampleInfo>;
  error?: Error;
  selectedSampleId?: string;

  // keep filtering state here to recover after navigating back from detail page
  layout: "grid" | "list";
  query: string;
  filterTags: string[];
};

export interface SampleInfo {
  id: string;
  title: string;
  shortDescription: string;
  fullDescription: string;
  types: string[];
  tags: string[];
  time: string;
  configuration: string;
  suggested: boolean;
  downloadUrl: string;
  thumbnailUrl: string;
  gifUrl?: string;
  // -1 means TTK is lower than required.
  versionComparisonResult: -1 | 0 | 1;
  minimumToolkitVersion?: string;
  maximumToolkitVersion?: string;
}

export type SampleProps = {
  sample: SampleInfo;
  selectSample: (id: string) => void;
};

export type SampleFilterOptionType = {
  types: string[];
  languages: string[];
  techniques: string[];
};

export type SampleFilterProps = {
  samples: Array<SampleInfo>;
  filterOptions: SampleFilterOptionType;
  layout: "grid" | "list";
  query: string;
  filterTags: string[];

  onLayoutChanged: (layout: "grid" | "list") => void;
  onFilterConditionChanged: (query: string, filterTags: string[]) => void;
};
