import sampleConfig from "./samples-config.json";
import sampleConfigV3 from "./samples-config-v3.json";
import { isV3Enabled, isVideoFilterEnabled } from "./tools";

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

class SampleProvider {
  private sampleCollection: SampleCollection | undefined;

  public get SampleCollection(): SampleCollection {
    if (!this.sampleCollection) {
      let samples;
      if (isV3Enabled()) {
        samples = sampleConfigV3.samples.map((sample) => {
          return {
            id: sample.id,
            title: sample.title,
            shortDescription: sample.shortDescription,
            fullDescription: sample.fullDescription,
            tags: sample.tags,
            time: sample.time,
            configuration: sample.configuration,
            link: (sample as any).packageLink ?? sampleConfigV3.defaultPackageLink,
            suggested: sample.suggested,
            url:
              (sample as any).relativePath && (sample as any).url
                ? (sample as any).url
                : sampleConfigV3.baseUrl,
            relativePath: (sample as any).relativePath,
          } as SampleInfo;
        });
      } else {
        samples = sampleConfig.samples.map((sample) => {
          return {
            id: sample.id,
            title: sample.title,
            shortDescription: sample.shortDescription,
            fullDescription: sample.fullDescription,
            tags: sample.tags,
            time: sample.time,
            configuration: sample.configuration,
            link: sample.packageLink ?? sampleConfig.defaultPackageLink,
            suggested: sample.suggested,
            url: sample.relativePath ? sample.url : sample.url ?? sampleConfig.baseUrl,
            relativePath: sample.relativePath,
          } as SampleInfo;
        });
      }

      // remove video filter sample app if feature flag is disabled.
      if (!isVideoFilterEnabled()) {
        const videoFilterSampleId = "teams-videoapp-sample";
        const index = samples.findIndex((sample) => sample.id === videoFilterSampleId);
        if (index !== -1) {
          samples.splice(index, 1);
        }
      }

      this.sampleCollection = {
        samples,
      };
    }

    return this.sampleCollection;
  }
}

export const sampleProvider = new SampleProvider();
