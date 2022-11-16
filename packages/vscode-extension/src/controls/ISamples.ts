interface SampleInfo {
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

interface SampleCollection {
  samples: SampleInfo[];
}

type SampleCardProps = SampleDetailProps & {
  suggested: boolean;
  order: number;
};

type SampleListProps = {
  samples: Array<SampleInfo>;
  highlightSample: (id: string) => void;
};

type SampleDetailProps = {
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
