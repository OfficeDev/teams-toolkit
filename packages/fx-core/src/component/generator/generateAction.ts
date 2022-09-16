// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import AdmZip from "adm-zip";
import path from "path";
import { GenerateContext } from "./generateContext";
import { fetchZipUrl, templateZipName, unzip } from "./utils";
import fs from "fs-extra";
import { fetchZipFromUrl } from "../../common/template-utils/templatesUtils";
import {
  defaultTimeoutInMs,
  defaultTryLimits,
  sampleDownloadBaseUrl,
  templateDownloadBaseUrl,
} from "./constant";
import { getTemplatesFolder } from "../../folder";
import { MissKeyError } from "./error";

export interface GenerateAction {
  name: string;
  run: (context: GenerateContext) => Promise<void>;
}

export enum GenerateActionName {
  FetchTemplateUrlWithTag = "FetchTemplatesUrlWithTag",
  FetchSampleUrlWithTag = "FetchSamplesUrlWithTag",
  FetchZipFromUrl = "FetchZipFromUrl",
  FetchTemplateZipFromLocal = "FetchTemplateZipFromLocal",
  Unzip = "Unzip",
}

export const fetchTemplateUrlWithTagAction: GenerateAction = {
  name: GenerateActionName.FetchTemplateUrlWithTag,
  run: async (context: GenerateContext) => {
    context.zipUrl = await fetchZipUrl(context.name, templateDownloadBaseUrl);
  },
};

export const fetchSampleUrlWithTagAction: GenerateAction = {
  name: GenerateActionName.FetchSampleUrlWithTag,
  run: async (context: GenerateContext) => {
    //Outside samples don't need fetching zip url with tag
    if (!context.zipUrl) {
      context.zipUrl = await fetchZipUrl(context.name, sampleDownloadBaseUrl);
    }
  },
};

export const fetchZipFromUrlAction: GenerateAction = {
  name: GenerateActionName.FetchZipFromUrl,
  run: async (context: GenerateContext) => {
    if (!context.zipUrl) {
      throw new MissKeyError();
    }
    context.zip = await fetchZipFromUrl(context.zipUrl, defaultTryLimits, defaultTimeoutInMs);
  },
};

export const fetchTemplateZipFromLocalAction: GenerateAction = {
  name: GenerateActionName.FetchTemplateZipFromLocal,
  run: async (context: GenerateContext) => {
    if (context.zip) {
      return;
    }

    if (!context.fallbackZipPath) {
      context.fallbackZipPath = path.join(getTemplatesFolder(), "fallback");
    }

    const fileName: string = templateZipName(context.name);
    const zipPath: string = path.join(context.fallbackZipPath, fileName);

    const data: Buffer = await fs.readFile(zipPath);
    context.zip = new AdmZip(data);
  },
};

export const unzipAction: GenerateAction = {
  name: GenerateActionName.Unzip,
  run: async (context: GenerateContext) => {
    if (!context.zip) {
      throw new MissKeyError();
    }
    await unzip(
      context.zip,
      context.destination,
      context.relativePath,
      context.fileNameReplaceFn,
      context.fileDataReplaceFn
    );
  },
};

export const TemplateActionSeq: GenerateAction[] = [
  fetchTemplateUrlWithTagAction,
  fetchZipFromUrlAction,
  fetchTemplateZipFromLocalAction,
  unzipAction,
];

export const SampleActionSeq: GenerateAction[] = [
  fetchSampleUrlWithTagAction,
  fetchZipFromUrlAction,
  unzipAction,
];
