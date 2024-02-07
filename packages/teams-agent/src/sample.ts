import axios from "axios";
import { sendRequestWithTimeout } from "./util";

type SampleConfigType = {
  samples: SampleConfig[];
  filterOptions: Record<string, Array<string>>;
};

export type SampleUrlInfo = {
  owner: string;
  repository: string;
  ref: string;
  dir: string;
};

export interface SampleConfig {
  id: string;
  onboardDate: Date;
  title: string;
  shortDescription: string;
  fullDescription: string;
  // matches the Teams app type when creating a new project
  types: string[];
  tags: string[];
  time: string;
  configuration: string;
  suggested: boolean;
  thumbnailUrl: string;
  gifUrl?: string;
  // maximum TTK & CLI version to run sample
  maximumToolkitVersion?: string;
  maximumCliVersion?: string;
  // these 2 fields are used when external sample is upgraded and breaks in old TTK version.
  minimumToolkitVersion?: string;
  minimumCliVersion?: string;
  downloadUrlInfo: SampleUrlInfo;
}

let cachedSamplesConfig: SampleConfigType | undefined;

export async function fetchOnlineSampleConfig() {
  if (!cachedSamplesConfig) {
    const ref = "dev";
    cachedSamplesConfig = (await fetchRawFileContent(ref)) as SampleConfigType;
  }

  return cachedSamplesConfig;
}

async function fetchRawFileContent(ref: string): Promise<unknown> {
  const url = `https://raw.githubusercontent.com/OfficeDev/TeamsFx-Samples/${ref}/.config/samples-config-v3.json`;
  try {
    const fileResponse = await sendRequestWithTimeout(
      async () => {
        return await axios.get(url, { responseType: "json" });
      },
      1000,
      3
    );

    if (fileResponse && fileResponse.data) {
      return fileResponse.data;
    }

    return undefined;
  } catch (e) {
    throw new Error(`Cannot fetch sample config file. Cause: ${e.message}`);
  }
}
