// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import AdmZip from "adm-zip";
import path from "path";
import { GeneratorContext } from "./generatorContext";
import { fetchZipFromUrl, fetchZipUrl, unzip } from "./utils";
import fs from "fs-extra";
import {
  defaultTimeoutInMs,
  defaultTryLimits,
  sampleDownloadBaseUrl,
  templateDownloadBaseUrl,
} from "./constant";
import { getTemplatesFolder } from "../../folder";
import { MissKeyError } from "./error";

export interface GeneratorAction {
  name: string;
  run: (context: GeneratorContext) => Promise<void>;
}

export enum GeneratorActionName {
  FetchTemplateUrlWithTag = "FetchTemplatesUrlWithTag",
  FetchSampleUrlWithTag = "FetchSamplesUrlWithTag",
  FetchZipFromUrl = "FetchZipFromUrl",
  FetchTemplateZipFromLocal = "FetchTemplateZipFromLocal",
  Unzip = "Unzip",
}

export const fetchTemplateUrlWithTagAction: GeneratorAction = {
  name: GeneratorActionName.FetchTemplateUrlWithTag,
  run: async (context: GeneratorContext) => {
    context.zipUrl = await fetchZipUrl(context.name, templateDownloadBaseUrl);
  },
};

export const fetchSampleUrlWithTagAction: GeneratorAction = {
  name: GeneratorActionName.FetchSampleUrlWithTag,
  run: async (context: GeneratorContext) => {
    //For 3rd party sample, the zip url is already provided in context, no need to fetch url again;
    //for 1st party sample, need to call fetchZipUrl function
    if (!context.zipUrl) {
      context.zipUrl = await fetchZipUrl(context.name, sampleDownloadBaseUrl);
    }
  },
};

export const fetchZipFromUrlAction: GeneratorAction = {
  name: GeneratorActionName.FetchZipFromUrl,
  run: async (context: GeneratorContext) => {
    if (!context.zipUrl) {
      throw new MissKeyError("zipUrl");
    }
    context.zip = await fetchZipFromUrl(context.zipUrl, defaultTryLimits, defaultTimeoutInMs);
  },
};

export const fetchTemplateZipFromLocalAction: GeneratorAction = {
  name: GeneratorActionName.FetchTemplateZipFromLocal,
  run: async (context: GeneratorContext) => {
    if (context.zip) {
      return;
    }

    if (!context.fallbackZipPath) {
      context.fallbackZipPath = path.join(getTemplatesFolder(), "fallback");
    }

    const fileName = `${context.name}.zip`;
    const zipPath: string = path.join(context.fallbackZipPath, fileName);

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
    await unzip(
      context.zip,
      context.destination,
      context.fileNameReplaceFn,
      context.fileDataReplaceFn,
      context.relativePath
    );
  },
};

export const TemplateActionSeq: GeneratorAction[] = [
  fetchTemplateUrlWithTagAction,
  fetchZipFromUrlAction,
  fetchTemplateZipFromLocalAction,
  unzipAction,
];

export const SampleActionSeq: GeneratorAction[] = [
  fetchSampleUrlWithTagAction,
  fetchZipFromUrlAction,
  unzipAction,
];
