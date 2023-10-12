// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export type SampleGalleryState = {
  loading: boolean;
  layout: "grid" | "list";
  filteredSamples?: Array<SampleInfo>;
  error?: Error;
  selectedSampleId?: string;
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

export type SampleFilterProps = {
  samples: Array<SampleInfo>;
  layout: "grid" | "list";

  onFilteredSamplesChange: (samples: SampleInfo[]) => void;
  onLayoutChange: (layout: "grid" | "list") => void;
};

export type SampleFilterState = {
  // Filter states
  selectedTypes: string[];
  selectedLanguages: string[];
  selectedTechniques: string[];

  // Search state
  query: string;
};
