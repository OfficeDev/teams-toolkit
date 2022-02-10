import sampleConfig from "./samples-config.json";

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
}

export interface SampleCollection {
  baseUrl: string;
  samples: SampleInfo[];
}

class SampleProvider {
  private sampleCollection: SampleCollection | undefined;

  public get SampleCollection(): SampleCollection {
    if (!this.sampleCollection) {
      const samples = sampleConfig.samples.map((sample) => {
        return {
          id: sample.id,
          title: sample.title,
          shortDescription: sample.shortDescription,
          fullDescription: sample.fullDescription,
          tags: sample.tags,
          time: sample.time,
          configuration: sample.configuration,
          link: sampleConfig.defaultPackageLink,
          suggested: sample.suggested,
        } as SampleInfo;
      });

      this.sampleCollection = {
        baseUrl: sampleConfig.baseUrl,
        samples,
      };
    }

    return this.sampleCollection;
  }
}

export const sampleProvider = new SampleProvider();
