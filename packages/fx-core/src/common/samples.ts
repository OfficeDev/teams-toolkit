import sampleConfig from "./samples-config.json";
import sampleConfigV3 from "./samples-config-v3.json";
import { isV3Enabled, isVideoFilterEnabled } from "./tools";
import { sendRequestWithTimeout } from "../component/generator/utils";
import axios from "axios";

class configInfo {
  static readonly owner = "OfficeDev";
  static readonly repo = "TeamsFx-Samples";
  static readonly tree = "v3";
  static readonly file = ".config/samples-config-v3.json";
}

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
  private sampleConfigs: any;

  public async fetchSampleConfig() {
    try {
      const fileInfoUrl = `https://api.github.com/repos/${configInfo.owner}/${configInfo.repo}/git/trees/${configInfo.tree}?recursive=1`;
      const fileInfo = (
        await sendRequestWithTimeout(
          async () => {
            return await axios.get(fileInfoUrl);
          },
          1000,
          2
        )
      ).data as any;

      const file = await sendRequestWithTimeout(
        async () => {
          return await axios.get(
            `https://raw.githubusercontent.com/${configInfo.owner}/${configInfo.repo}/${fileInfo.sha}/${configInfo.file}`,
            { responseType: "json" }
          );
        },
        1000,
        2
      );
      this.sampleConfigs = file.data;
    } catch (e) {
      this.sampleConfigs = undefined;
    }
  }
  public get SampleCollection(): SampleCollection {
    let samples;
    if (isV3Enabled()) {
      samples = (this.sampleConfigs ?? sampleConfigV3).samples.map((sample: any) => {
        return {
          id: sample.id,
          title: sample.title,
          shortDescription: sample.shortDescription,
          fullDescription: sample.fullDescription,
          tags: sample.tags,
          time: sample.time,
          configuration: sample.configuration,
          link:
            (sample as any).packageLink ??
            (this.sampleConfigs ?? sampleConfigV3).defaultPackageLink,
          suggested: sample.suggested,
          url:
            (sample as any).relativePath && (sample as any).url
              ? (sample as any).url
              : `${(this.sampleConfigs ?? sampleConfigV3).baseUrl}${sample.id}`,
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
      const index = samples.findIndex((sample: any) => sample.id === videoFilterSampleId);
      if (index !== -1) {
        samples.splice(index, 1);
      }
    }

    this.sampleCollection = {
      samples,
    };

    return this.sampleCollection;
  }
}

export const sampleProvider = new SampleProvider();
