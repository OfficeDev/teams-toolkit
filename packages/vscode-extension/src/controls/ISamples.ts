export interface SampleInfo {
  id: string;
  title: string;
  shortDescription: string;
  fullDescription: string;
  tags: string[];
  time: string;
  configuration: string;
  link: string;
  suggested: boolean;
  url: string;
  relativePath?: string;
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
  sampleAppUrl: string;
  relativePath?: string;
  highlightSample: (id: string) => void;
};
