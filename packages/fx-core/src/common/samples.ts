// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import axios from "axios";
import { sendRequestWithTimeout } from "../component/generator/utils";
import sampleConfigV3 from "./samples-config-v3.json";
import { isVideoFilterEnabled } from "./featureFlags";
const packageJson = require("../../package.json");

class configInfo {
  static readonly owner = "OfficeDev";
  static readonly repo = "TeamsFx-Samples";
  static readonly tree = "v2.3.0";
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
  suggested: boolean;
  url?: string;
}

interface SampleCollection {
  samples: SampleInfo[];
}

class SampleProvider {
  private sampleCollection: SampleCollection | undefined;
  private samplesConfig: SampleCollection | undefined;

  public async fetchSampleConfig() {
    try {
      const fileResponse = await sendRequestWithTimeout(
        async () => {
          return await axios.get(
            `https://raw.githubusercontent.com/${configInfo.owner}/${configInfo.repo}/${configInfo.tree}/${configInfo.file}`,
            { responseType: "json" }
          );
        },
        1000,
        3
      );

      if (fileResponse && fileResponse.data) {
        this.samplesConfig = fileResponse.data as SampleCollection;
      }
    } catch (e) {
      this.samplesConfig = undefined;
    }
  }
  public get SampleCollection(): SampleCollection {
    const samples = (this.samplesConfig ?? sampleConfigV3).samples.map((sample: SampleInfo) => {
      return {
        ...sample,
        url: sample.url ? sample.url : `${this.getBaseSampleUrl()}${sample.id}`,
      } as SampleInfo;
    });

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
    return this.samplesConfig
      ? `https://github.com/${configInfo.owner}/${configInfo.repo}/tree/${configInfo.tree}/`
      : sampleConfigV3.baseUrl;
  }
}

export const sampleProvider = new SampleProvider();
