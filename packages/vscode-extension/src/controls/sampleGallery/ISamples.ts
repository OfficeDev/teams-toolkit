// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

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
}

export interface SampleCollection {
  samples: SampleInfo[];
}

export type SampleProps = {
  sample: SampleInfo;
  selectSample: (id: string) => void;
};

export type SampleFilterProps = {
  query: string;
  onQueryChange: (query: string) => void;
};
