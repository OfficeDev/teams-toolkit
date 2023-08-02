// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import axios from "axios";
import { parseSampleUrl, sendRequestWithTimeout } from "../component/generator/utils";
import sampleConfigV3 from "./samples-config-v3.json";
import { isVideoFilterEnabled } from "./featureFlags";
const packageJson = require("../../package.json");

const SampleConfigOwner = "OfficeDev";
const SampleConfigRepo = "TeamsFx-Samples";
const SampleConfigFile = ".config/samples-config-v3.json";
export const SampleConfigTag = "v2.3.0";

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
  gifUrl: string;
  // maximum TTK version to run sample
  maximumToolkitVersion?: string;
  downloadUrl?: string;
}

interface SampleCollection {
  samples: SampleConfig[];
}

class SampleProvider {
  private sampleCollection: SampleCollection | undefined;
  private samplesConfig: { samples: Array<Record<string, unknown>> } | undefined;

  public async fetchSampleConfig() {
    try {
      const fileResponse = await sendRequestWithTimeout(
        async () => {
          return await axios.get(
            `https://raw.githubusercontent.com/${SampleConfigOwner}/${SampleConfigRepo}/${SampleConfigTag}/${SampleConfigFile}`,
            { responseType: "json" }
          );
        },
        1000,
        3
      );

      if (fileResponse && fileResponse.data) {
        this.samplesConfig = fileResponse.data as { samples: Array<Record<string, unknown>> };
      }
    } catch (e) {
      this.samplesConfig = undefined;
    }
  }
  public get SampleCollection(): SampleCollection {
    const samples = (this.samplesConfig ? this.samplesConfig.samples : sampleConfigV3.samples).map(
      (sample) => {
        const isExternal = sample["downloadUrl"] ? true : false;
        let gifUrl = `https://raw.githubusercontent.com/${SampleConfigOwner}/${SampleConfigRepo}/${SampleConfigTag}/${sample["id"]}/${sample["gifPath"]}`;
        if (isExternal) {
          const info = parseSampleUrl(sample["downloadUrl"] as string);
          gifUrl = `https://raw.githubusercontent.com/${info.owner}/${info.repository}/${info.ref}/${info.dir}/${sample["gifPath"]}`;
        }
        return {
          ...sample,
          onboardDate: new Date(sample["onboardDate"] as string),
          downloadUrl: isExternal
            ? sample["downloadUrl"]
            : `${this.getBaseSampleUrl()}${sample["id"]}`,
          gifUrl: gifUrl,
        } as SampleConfig;
      }
    );

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

    return this.sampleCollection;
  }

  private getBaseSampleUrl(): string {
    const version: string = packageJson.version;
    if (version.includes("alpha")) {
      return "https://github.com/OfficeDev/TeamsFx-Samples/tree/dev/";
    }
    if (version.includes("rc")) {
      return "https://github.com/OfficeDev/TeamsFx-Samples/tree/v3/";
    }
    return `https://github.com/${SampleConfigOwner}/${SampleConfigRepo}/tree/${SampleConfigTag}/`;
  }
}

export const sampleProvider = new SampleProvider();
