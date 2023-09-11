// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import Fuse from "fuse.js";

export type SampleGalleryState = {
  loading: boolean;
  samples: Array<SampleInfo>;
  selectedSampleId?: string;
  query: string;
  fuse: Fuse<SampleInfo>;
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
  gifUrl: string;
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
  onQueryChange: (query: string) => void;
};
