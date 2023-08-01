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

export type SampleCardProps = SampleDetailProps & {
  suggested: boolean;
  order: number;
};

export type SampleListProps = {
  samples: Array<SampleInfo>;
  highlightSample: (id: string) => void;
};

export type SampleDetailProps = {
  url: string;
  image: any;
  tags: string[];
  time: string;
  configuration: string;
  title: string;
  description: string;
  sampleAppFolder: string;
  highlightSample: (id: string) => void;
};
