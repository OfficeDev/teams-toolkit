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
const TeamsSampleConfigRepo = "TeamsFx-Samples";
const TeamsSampleConfigFile = ".config/samples-config-v3.json";
const OfficeSampleConfigRepo = "Office-Samples";
const OfficeSampleConfigFile = ".config/samples-config-v1.json";
export const TeamsSampleConfigTag = "v2.4.0";
export const OfficeSampleConfigTag = "v0.0.1";
// prerelease tag is always using a branch.
export const SampleConfigBranchForPrerelease = "main";

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
  thumbnailPath: string;
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
  private sampleCollection: SampleCollection | undefined;

  public get SampleCollection(): Promise<SampleCollection> {
    if (!this.sampleCollection) {
      return this.refreshSampleConfig();
    }
    return Promise.resolve(this.sampleCollection);
  }

  public async refreshSampleConfig(): Promise<SampleCollection> {
    const teamsRet = await this.fetchOnlineSampleConfig(
      TeamsSampleConfigRepo,
      TeamsSampleConfigFile
    );
    const teamsSampleCollection = await this.parseOnlineSampleConfig(
      SampleConfigOwner,
      TeamsSampleConfigRepo,
      teamsRet.samplesConfig,
      teamsRet.ref
    );
    const officeRet = await this.fetchOnlineSampleConfig(
      OfficeSampleConfigRepo,
      OfficeSampleConfigFile
    );
    const officeSampleCollection = await this.parseOnlineSampleConfig(
      SampleConfigOwner,
      OfficeSampleConfigRepo,
      officeRet.samplesConfig,
      officeRet.ref
    );
    // merge samples from TeamsFx-Samples and Office-Samples
    // use Set to remove duplicates
    this.sampleCollection = {
      samples: [...teamsSampleCollection.samples, ...officeSampleCollection.samples],
      filterOptions: {
        capabilities: Array.from(
          new Set([
            ...teamsSampleCollection.filterOptions.capabilities,
            ...officeSampleCollection.filterOptions.capabilities,
          ])
        ),
        languages: Array.from(
          new Set([
            ...teamsSampleCollection.filterOptions.languages,
            ...officeSampleCollection.filterOptions.languages,
          ])
        ),
        technologies: Array.from(
          new Set([
            ...teamsSampleCollection.filterOptions.technologies,
            ...officeSampleCollection.filterOptions.technologies,
          ])
        ),
      },
    };
    return this.sampleCollection;
  }

  private async fetchOnlineSampleConfig(configRepo: string, configFile: string) {
    const getRef = (configRepo: string, version: string) => {
      if (configRepo === TeamsSampleConfigRepo) {
        // Set default value for branchOrTag
        if (version.includes("alpha")) {
          // daily build version always use 'dev' branch
          return "dev";
        } else if (version.includes("beta")) {
          // prerelease build version always use branch head for prerelease.
          return SampleConfigBranchForPrerelease;
        } else if (version.includes("rc")) {
          // if there is a breaking change, the tag is not used by any stable version.
          return TeamsSampleConfigTag;
        } else {
          // stable version uses the head of branch defined by feature flag when available
          return TeamsSampleConfigTag;
        }
      } else {
        // Office Samples
        if (version.includes("alpha")) {
          return "dev";
        } else if (version.includes("beta")) {
          return SampleConfigBranchForPrerelease;
        } else if (version.includes("rc")) {
          return OfficeSampleConfigTag;
        } else {
          return OfficeSampleConfigTag;
        }
        // return "dev";
      }
    };
    const version: string = packageJson.version;
    const configBranchInEnv =
      process.env[
        configRepo === TeamsSampleConfigRepo
          ? FeatureFlagName.TeamsSampleConfigBranch
          : FeatureFlagName.OfficeSampleConfigBranch
      ];
    let samplesConfig: SampleConfigType | undefined;
    let ref = getRef(configRepo, version);
    // Set branchOrTag value if branch in env is valid
    if (configBranchInEnv) {
      try {
        const data = await this.fetchRawFileContent(
          SampleConfigOwner,
          configRepo,
          configBranchInEnv,
          configFile
        );
        ref = configBranchInEnv;
        samplesConfig = data as SampleConfigType;
      } catch (e: unknown) {}
    }

    if (samplesConfig === undefined) {
      samplesConfig = (await this.fetchRawFileContent(
        SampleConfigOwner,
        configRepo,
        ref,
        configFile
      )) as SampleConfigType;
    }

    return { samplesConfig, ref };
  }

  @hooks([ErrorContextMW({ component: "SampleProvider" })])
  private parseOnlineSampleConfig(
    samplesOnwer: string,
    samplesRepo: string,
    samplesConfig: SampleConfigType,
    ref: string
  ): Promise<SampleCollection> {
    const samples =
      samplesConfig?.samples.map((sample) => {
        const isExternal = sample["downloadUrlInfo"] ? true : false;
        let gifUrl =
          sample["gifPath"] !== undefined
            ? `https://raw.githubusercontent.com/${samplesOnwer}/${samplesRepo}/${ref}/${
                sample["id"] as string
              }/${sample["gifPath"] as string}`
            : undefined;
        if (isExternal) {
          const info = sample["downloadUrlInfo"] as SampleUrlInfo;
          gifUrl =
            sample["gifPath"] !== undefined
              ? `https://raw.githubusercontent.com/${info.owner}/${info.repository}/${info.ref}/${
                  info.dir
                }/${sample["gifPath"] as string}`
              : undefined;
        }
        return {
          ...sample,
          onboardDate: new Date(sample["onboardDate"] as string),
          downloadUrlInfo: isExternal
            ? sample["downloadUrlInfo"]
            : {
                owner: SampleConfigOwner,
                repository: samplesRepo,
                ref: ref,
                dir: sample["id"] as string,
              },
          gifUrl: gifUrl,
        } as SampleConfig;
      }) || [];

    return Promise.resolve({
      samples,
      filterOptions: {
        capabilities: samplesConfig?.filterOptions["capabilities"] || [],
        languages: samplesConfig?.filterOptions["languages"] || [],
        technologies: samplesConfig?.filterOptions["technologies"] || [],
      },
    });
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

  private async fetchRawFileContent(
    configOwner: string,
    configRepo: string,
    branchOrTag: string,
    configFile: string
  ): Promise<unknown> {
    const url = `https://raw.githubusercontent.com/${configOwner}/${configRepo}/${branchOrTag}/${configFile}`;
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
