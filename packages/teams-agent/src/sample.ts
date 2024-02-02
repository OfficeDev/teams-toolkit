import axios from "axios";
import { sendRequestWithTimeout } from "./util";

type SampleConfigType = {
  samples: Array<Record<string, unknown>>;
  filterOptions: Record<string, Array<string>>;
};

export type SampleUrlInfo = {
  owner: string;
  repository: string;
  ref: string;
  dir: string;
};

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
