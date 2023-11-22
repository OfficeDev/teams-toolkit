// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import axios from "axios";

import { hooks } from "@feathersjs/hooks";

import { SampleUrlInfo, sendRequestWithTimeout } from "../component/generator/utils";
import { ErrorContextMW } from "../core/globalVars";
import { AccessGithubError } from "../error/common";
import { FeatureFlagName } from "./constants";

const packageJson = require("../../package.json");

const SampleConfigOwner = "OfficeDev";
const SampleConfigRepo = "TeamsFx-Samples";
const SampleConfigFile = ".config/samples-config-v3.json";
export const SampleConfigTag = "v2.4.0";
// prerelease tag is always using a branch.
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
  downloadUrlInfo: SampleUrlInfo;
}

interface SampleCollection {
  samples: SampleConfig[];
  filterOptions: {
    capabilities: string[];
    languages: string[];
    technologies: string[];
  };
}

type SampleConfigType = {
  samples: Array<Record<string, unknown>>;
  filterOptions: Record<string, Array<string>>;
};

class SampleProvider {
  private samplesConfig: SampleConfigType | undefined;
  private branchOrTag = SampleConfigTag;

  @hooks([ErrorContextMW({ component: "SampleProvider" })])
  public async fetchSampleConfig() {
    const version: string = packageJson.version;
    if (version.includes("alpha")) {
      // daily build version always use 'dev' branch
      this.branchOrTag = "dev";
    } else if (version.includes("beta")) {
      // prerelease build version always use branch head for prerelease.
      this.branchOrTag = SampleConfigBranchForPrerelease;
    } else if (version.includes("rc")) {
      // if there is a breaking change, the tag is not used by any stable version.
      this.branchOrTag = SampleConfigTag;
    } else {
      // stable version uses the head of branch defined by feature flag when available
      this.branchOrTag = SampleConfigTag;
      const branch = process.env[FeatureFlagName.SampleConfigBranch];
      if (branch) {
        try {
          const data = await this.fetchRawFileContent(branch);
          this.branchOrTag = branch;
          this.samplesConfig = data as SampleConfigType;
        } catch (e: unknown) {}
      }
    }
    if (this.samplesConfig === undefined) {
      this.samplesConfig = (await this.fetchRawFileContent(this.branchOrTag)) as SampleConfigType;
    }
  }

  public get SampleCollection(): SampleCollection {
    const samples =
      this.samplesConfig?.samples.map((sample) => {
        const isExternal = sample["downloadUrlInfo"] ? true : false;
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
          const info = sample["downloadUrlInfo"] as SampleUrlInfo;
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
          downloadUrlInfo: isExternal
            ? sample["downloadUrlInfo"]
            : {
                owner: SampleConfigOwner,
                repository: SampleConfigRepo,
                ref: this.branchOrTag,
                dir: sample["id"] as string,
              },
          gifUrl: gifUrl,
          thumbnailUrl: thumbnailUrl,
        } as SampleConfig;
      }) || [];

    return {
      samples,
      filterOptions: {
        capabilities: this.samplesConfig?.filterOptions["capabilities"] || [],
        languages: this.samplesConfig?.filterOptions["languages"] || [],
        technologies: this.samplesConfig?.filterOptions["technologies"] || [],
      },
    };
  }

  public async getSampleReadmeHtml(sample: SampleConfig): Promise<string> {
    const urlInfo = sample.downloadUrlInfo;
    const url = `https://api.github.com/repos/${urlInfo.owner}/${urlInfo.repository}/readme/${urlInfo.dir}/?ref=${urlInfo.ref}`;
    try {
      const readmeResponse = await sendRequestWithTimeout(
        async () => {
          return await axios.get(url, {
            headers: {
              Accept: "application/vnd.github.html",
              "X-GitHub-Api-Version": "2022-11-28",
            },
          });
        },
        1000,
        3
      );

      if (readmeResponse && readmeResponse.data) {
        return readmeResponse.data as string;
      } else {
        return "";
      }
    } catch (e) {
      throw new AccessGithubError(url, "SampleProvider", e);
    }
  }

  private async fetchRawFileContent(branchOrTag: string): Promise<unknown> {
    const url = `https://raw.githubusercontent.com/${SampleConfigOwner}/${SampleConfigRepo}/${branchOrTag}/${SampleConfigFile}`;
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
    } catch (e) {
      throw new AccessGithubError(url, "SampleProvider", e);
    }
  }
}

export const sampleProvider = new SampleProvider();
