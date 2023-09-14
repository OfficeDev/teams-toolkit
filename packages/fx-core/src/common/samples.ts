// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import axios from "axios";

import { parseSampleUrl, sendRequestWithTimeout } from "../component/generator/utils";
import { FeatureFlagName } from "./constants";
import { isVideoFilterEnabled } from "./featureFlags";

const packageJson = require("../../package.json");

const SampleConfigOwner = "OfficeDev";
const SampleConfigRepo = "TeamsFx-Samples";
const SampleConfigFile = ".config/samples-config-v3.json";
export const SampleConfigTag = "v2.3.0";
// rc and prerelease tag is only different with stable tag when there will a breaking change.
export const SampleConfigTagForRc = "v2.3.0";
export const SampleConfigBranchForPrerelease = "v3";

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
  downloadUrl?: string;
}

interface SampleCollection {
  samples: SampleConfig[];
}

class SampleProvider {
  private sampleCollection: SampleCollection | undefined;
  private samplesConfig: { samples: Array<Record<string, unknown>> } | undefined;
  private branchOrTag = SampleConfigTag;

  public async fetchSampleConfig() {
    const version: string = packageJson.version;
    if (version.includes("alpha")) {
      // daily build version always use 'dev' branch
      this.branchOrTag = "dev";
    } else if (version.includes("beta")) {
      // prerelease build version always use branch head for prerelease.
      this.branchOrTag = SampleConfigBranchForPrerelease;
    } else if (version.includes("rc")) {
      // rc version(before next stable TTK) always use prerelease tag
      this.branchOrTag = SampleConfigTagForRc;
    } else {
      // stable version uses the head of branch defined by feature flag when available
      this.branchOrTag = SampleConfigTag;
      const branch = process.env[FeatureFlagName.SampleConfigBranch];
      if (branch) {
        const data = await this.fetchRawFileContent(branch);
        if (data !== undefined) {
          this.branchOrTag = branch;
          this.samplesConfig = data as { samples: Array<Record<string, unknown>> };
        }
      }
    }
    if (this.samplesConfig === undefined) {
      this.samplesConfig = (await this.fetchRawFileContent(this.branchOrTag)) as {
        samples: Array<Record<string, unknown>>;
      };
    }
  }

  public get SampleCollection(): SampleCollection {
    const samples =
      this.samplesConfig?.samples.map((sample) => {
        const isExternal = sample["downloadUrl"] ? true : false;
        let gifUrl =
          sample["gifPath"] !== undefined
            ? `https://raw.githubusercontent.com/${SampleConfigOwner}/${SampleConfigRepo}/${
                this.branchOrTag
              }/${sample["id"] as string}/${sample["gifPath"] as string}`
            : undefined;
        let thumbnailUrl = `https://raw.githubusercontent.com/${SampleConfigOwner}/${SampleConfigRepo}/${
          this.branchOrTag
        }/${sample["id"] as string}/${sample["thumbnailPath"] as string}`;
        if (isExternal) {
          const info = parseSampleUrl(sample["downloadUrl"] as string);
          gifUrl =
            sample["gifPath"] !== undefined
              ? `https://raw.githubusercontent.com/${info.owner}/${info.repository}/${info.ref}/${
                  info.dir
                }/${sample["gifPath"] as string}`
              : undefined;
          thumbnailUrl = `https://raw.githubusercontent.com/${info.owner}/${info.repository}/${
            info.ref
          }/${info.dir}/${sample["thumbnailPath"] as string}`;
        }
        return {
          ...sample,
          onboardDate: new Date(sample["onboardDate"] as string),
          downloadUrl: isExternal
            ? sample["downloadUrl"]
            : `https://github.com/${SampleConfigOwner}/${SampleConfigRepo}/tree/${
                this.branchOrTag
              }/${sample["id"] as string}`,
          gifUrl: gifUrl,
          thumbnailUrl: thumbnailUrl,
        } as SampleConfig;
      }) || [];

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

  private async fetchRawFileContent(branchOrTag: string): Promise<unknown> {
    try {
      const fileResponse = await sendRequestWithTimeout(
        async () => {
          return await axios.get(
            `https://raw.githubusercontent.com/${SampleConfigOwner}/${SampleConfigRepo}/${branchOrTag}/${SampleConfigFile}`,
            { responseType: "json" }
          );
        },
        1000,
        3
      );

      if (fileResponse && fileResponse.data) {
        return fileResponse.data;
      }
    } catch (e) {
      return undefined;
    }
  }
}

export const sampleProvider = new SampleProvider();
