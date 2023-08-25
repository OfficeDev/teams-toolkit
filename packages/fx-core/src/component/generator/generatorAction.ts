// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import AdmZip from "adm-zip";
import path from "path";
import { fetchZipFromUrl, fetchTemplateZipUrl, unzip, zipFolder, downloadDirectory } from "./utils";
import fs from "fs-extra";
import { getTemplatesFolder } from "../../folder";
import { MissKeyError } from "./error";
import { FeatureFlagName } from "../../common/constants";
import { LogProvider } from "@microsoft/teamsfx-api";

export interface GeneratorContext {
  name: string;
  destination: string;
  logProvider: LogProvider;
  tryLimits?: number;
  timeoutInMs?: number;
  url?: string;
  zip?: AdmZip;
  zipped?: AdmZip.IZipEntry[];
  fallback?: boolean;
  cancelDownloading?: boolean;

  filterFn?: (name: string) => boolean;
  fileNameReplaceFn?: (name: string, data: Buffer) => string;
  fileDataReplaceFn?: (name: string, data: Buffer) => Buffer | string;

  onActionStart?: (action: GeneratorAction, context: GeneratorContext) => Promise<void>;
  onActionEnd?: (action: GeneratorAction, context: GeneratorContext) => Promise<void>;
  onActionError?: (
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
  FetchTemplateUrlWithTag = "FetchTemplatesUrlWithTag",
  FetchZipFromUrl = "FetchZipFromUrl",
  FetchTemplateZipFromLocal = "FetchTemplateZipFromLocal",
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

    //! This path only works in debug mode
    const templateSourceCodePath = path.resolve(
      __dirname,
      "../../../../../",
      "templates",
      context.name
    );

    context.zip = zipFolder(templateSourceCodePath);
    return Promise.resolve();
  },
};

export const downloadDirectoryAction: GeneratorAction = {
  name: GeneratorActionName.DownloadDirectory,
  run: async (context: GeneratorContext) => {
    if (!context.url) {
      throw new MissKeyError("url");
    }
    await downloadDirectory(context.url, context.destination);
  },
};

export const fetchTemplateUrlWithTagAction: GeneratorAction = {
  name: GeneratorActionName.FetchTemplateUrlWithTag,
  run: async (context: GeneratorContext) => {
    if (context.zip || context.url || context.cancelDownloading) {
      return;
    }

    context.url = await fetchTemplateZipUrl(context.name, context.tryLimits, context.timeoutInMs);
  },
};

export const fetchZipFromUrlAction: GeneratorAction = {
  name: GeneratorActionName.FetchZipFromUrl,
  run: async (context: GeneratorContext) => {
    if (context.zip || context.cancelDownloading) {
      return;
    }

    if (!context.url) {
      throw new MissKeyError("url");
    }
    context.zip = await fetchZipFromUrl(context.url, context.tryLimits, context.timeoutInMs);
  },
};

export const fetchTemplateZipFromLocalAction: GeneratorAction = {
  name: GeneratorActionName.FetchTemplateZipFromLocal,
  run: async (context: GeneratorContext) => {
    if (context.zip) {
      return;
    }
    context.fallback = true;
    const fallbackPath = path.join(getTemplatesFolder(), "fallback");
    const fileName = `${context.name}.zip`;
    const zipPath: string = path.join(fallbackPath, fileName);

    const data: Buffer = await fs.readFile(zipPath);
    context.zip = new AdmZip(data);
  },
};

export const unzipAction: GeneratorAction = {
  name: GeneratorActionName.Unzip,
  run: async (context: GeneratorContext) => {
    if (!context.zip) {
      throw new MissKeyError("zip");
    }
    context.zipped = await unzip(
      context.zip,
      context.destination,
      context.fileNameReplaceFn,
      context.fileDataReplaceFn,
      context.filterFn
    );
  },
};

export const TemplateActionSeq: GeneratorAction[] = [
  fetchTemplateZipFromSourceCodeAction,
  fetchTemplateUrlWithTagAction,
  fetchZipFromUrlAction,
  fetchTemplateZipFromLocalAction,
  unzipAction,
];

export const SampleActionSeq: GeneratorAction[] = [fetchZipFromUrlAction, unzipAction];
export const DownloadDirectoryActionSeq: GeneratorAction[] = [downloadDirectoryAction];
