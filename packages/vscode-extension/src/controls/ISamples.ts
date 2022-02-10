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
}

interface SampleCollection {
  baseUrl: string;
  samples: SampleInfo[];
}

type SampleCardProps = SampleDetailProps & {
  suggested: boolean;
  order: number;
};

type SampleListProps = {
  samples: Array<SampleInfo>;
  baseUrl: string;
  highlightSample: (id: string) => void;
};

type SampleDetailProps = {
  baseUrl: string;
  image: any;
  tags: string[];
  time: string;
  configuration: string;
  title: string;
  description: string;
  sampleAppFolder: string;
  sampleAppUrl: string;
  highlightSample: (id: string) => void;
};
