import sampleConfig from "./samples-config.json";

export interface SampleInfo {
  id: string;
  title: string;
  description: string;
  tags: string[];
  link: string;
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
          description: sample.description,
          tags: sample.tags,
          link: sampleConfig.defaultPackageLink,
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
