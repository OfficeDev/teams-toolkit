// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import AdmZip from "adm-zip";
import fs from "fs-extra";
import path from "path";

import { LogProvider } from "@microsoft/teamsfx-api";

import { FeatureFlagName } from "../../common/constants";
import { getTemplatesFolder } from "../../folder";
import { MissKeyError, SampleNotFoundError, TemplateNotFoundError } from "./error";
import {
  downloadDirectory,
  fetchZipFromUrl,
  getSampleInfoFromName,
  SampleUrlInfo,
  unzip,
  zipFolder,
  getTemplateLatestTag,
  getTemplateZipUrlByTag,
  getTemplateLocalVersion,
} from "./utils";
import semver from "semver";

export interface GeneratorContext {
  name: string;
  language?: string;
  destination: string;
  logProvider: LogProvider;
  tryLimits?: number;
  timeoutInMs?: number;
  url?: string;
  sampleInfo?: SampleUrlInfo;
  zip?: AdmZip;
  fallback?: boolean;
  cancelDownloading?: boolean;
  outputs?: string[];

  filterFn?: (name: string) => boolean;
  fileNameReplaceFn?: (name: string, data: Buffer) => string;
  fileDataReplaceFn?: (name: string, data: Buffer) => Buffer | string;

  onActionStart?: (action: GeneratorAction, context: GeneratorContext) => Promise<void>;
  onActionEnd?: (action: GeneratorAction, context: GeneratorContext) => Promise<void>;
  onActionError: (
    action: GeneratorAction,
    context: GeneratorContext,
    error: Error
  ) => Promise<void>;
}

export interface GeneratorAction {
  name: string;
  run: (context: GeneratorContext) => Promise<void>;
}

export enum GeneratorActionName {
  FetchTemplateZipFromSourceCode = "FetchTemplateZipFromSourceCodeAction",
  FetchUrlForHotfixOnly = "FetchUrlForHotfixOnly",
  FetchZipFromUrl = "FetchZipFromUrl",
  FetchTemplateZipFromLocal = "FetchTemplateZipFromLocal",
  FetchSampleInfo = "FetchSampleInfo",
  DownloadDirectory = "DownloadDirectory",
  Unzip = "Unzip",
}

// * This action is only for debug purpose
export const fetchTemplateZipFromSourceCodeAction: GeneratorAction = {
  name: GeneratorActionName.FetchTemplateZipFromSourceCode,
  run: (context: GeneratorContext) => {
    const isDebugMode = () => {
      const DebugTemplateFlag = process.env[FeatureFlagName.DebugTemplate];
      return DebugTemplateFlag?.toLowerCase() === "true" && process.env.NODE_ENV === "development";
    };

    if (!isDebugMode()) {
      return Promise.resolve();
    }

    if (context.zip) {
      return Promise.resolve();
    }

    context.logProvider.debug(`Fetching template zip from source code: ${JSON.stringify(context)}`);
    //! This path only works in debug mode
    const templateSourceCodePath = path.resolve(
      __dirname,
      "../../../../../",
      "templates",
      context.language!
    );

    context.zip = zipFolder(templateSourceCodePath);
    return Promise.resolve();
  },
};

export const fetchSampleInfoAction: GeneratorAction = {
  name: GeneratorActionName.FetchSampleInfo,
  run: async (context: GeneratorContext) => {
    const sample = await getSampleInfoFromName(context.name);
    context.sampleInfo = sample.downloadUrlInfo;
  },
};

export const downloadDirectoryAction: GeneratorAction = {
  name: GeneratorActionName.DownloadDirectory,
  run: async (context: GeneratorContext) => {
    context.logProvider.debug(`Downloading sample by directory: ${JSON.stringify(context)}`);
    if (!context.sampleInfo) {
      throw new MissKeyError("sampleInfo");
    }

    context.outputs = await downloadDirectory(context.sampleInfo, context.destination);
    if (!context.outputs?.length) {
      throw new SampleNotFoundError(context.name);
    }
  },
};

export const fetchUrlForHotfixOnlyAction: GeneratorAction = {
  name: GeneratorActionName.FetchUrlForHotfixOnly,
  run: async (context: GeneratorContext) => {
    if (context.zip || context.cancelDownloading) {
      return;
    }

    context.logProvider.debug(`Fetching template url with tag: ${JSON.stringify(context)}`);
    const latestTag = await getTemplateLatestTag(
      context.language!,
      context.tryLimits,
      context.timeoutInMs
    );
    const localVer = getTemplateLocalVersion();
    const latestVer = latestTag.split("@")[1];
    // git tag version is higher than the local version, download template from github
    if (semver.gt(latestVer, localVer)) {
      context.url = getTemplateZipUrlByTag(context.language!, latestTag);
    } else {
      // download template from fallback
      context.cancelDownloading = true;
    }
  },
};

export const fetchZipFromUrlAction: GeneratorAction = {
  name: GeneratorActionName.FetchZipFromUrl,
  run: async (context: GeneratorContext) => {
    if (context.zip || context.cancelDownloading) {
      return;
    }

    context.logProvider.debug(`Fetching zip from url: ${JSON.stringify(context)}`);
    if (!context.url) {
      throw new MissKeyError("url");
    }

    context.zip = await fetchZipFromUrl(context.url, context.tryLimits, context.timeoutInMs);
  },
};

export const unzipAction: GeneratorAction = {
  name: GeneratorActionName.Unzip,
  run: async (context: GeneratorContext) => {
    if (!context.zip) {
      return;
    }
    context.logProvider.debug(`Unzipping: ${JSON.stringify(context)}`);
    context.outputs = await unzip(
      context.zip,
      context.destination,
      context.fileNameReplaceFn,
      context.fileDataReplaceFn,
      context.filterFn
    );
  },
};

export const fetchTemplateFromLocalAction: GeneratorAction = {
  name: GeneratorActionName.FetchTemplateZipFromLocal,
  run: async (context: GeneratorContext) => {
    if (context.outputs?.length) {
      return;
    }
    context.logProvider.debug(`Fetching zip from local: ${JSON.stringify(context)}`);
    context.fallback = true;
    const fallbackPath = path.join(getTemplatesFolder(), "fallback");
    const fileName = `${context.language!}.zip`;
    const zipPath: string = path.join(fallbackPath, fileName);

    const data: Buffer = await fs.readFile(zipPath);
    context.zip = new AdmZip(data);
    context.outputs = await unzip(
      context.zip,
      context.destination,
      context.fileNameReplaceFn,
      context.fileDataReplaceFn,
      context.filterFn
    );
    if (!context.outputs?.length) {
      throw new TemplateNotFoundError(context.name);
    }
  },
};

export const TemplateActionSeq: GeneratorAction[] = [
  fetchTemplateZipFromSourceCodeAction,
  fetchUrlForHotfixOnlyAction,
  fetchZipFromUrlAction,
  unzipAction,
  fetchTemplateFromLocalAction,
];

export const SampleActionSeq: GeneratorAction[] = [fetchSampleInfoAction, downloadDirectoryAction];
