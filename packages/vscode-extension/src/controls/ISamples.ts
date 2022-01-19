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
  onSampleCard: (id: string) => void;
};

type SampleListProps = {
  samples: Array<SampleInfo>;
  baseUrl: string;
  onSampleCard: (id: string) => void;
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
};
