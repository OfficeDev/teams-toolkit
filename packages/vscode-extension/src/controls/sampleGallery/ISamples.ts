// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import Fuse from "fuse.js";

export type SampleGalleryState = {
  loading: boolean;
  samples: Array<SampleInfo>;
  error?: Error;
  selectedSampleId?: string;
  query: string;
  fuse: Fuse<SampleInfo>;
  layout: "grid" | "list";
};

export interface SampleInfo {
  id: string;
  title: string;
  shortDescription: string;
  fullDescription: string;
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
  query: string;
  layout: "grid" | "list";
  onQueryChange: (query: string) => void;
  onLayoutChange: (layout: "grid" | "list") => void;
};
