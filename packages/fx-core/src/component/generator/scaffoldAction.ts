// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import AdmZip from "adm-zip";
import path from "path";
import { ScaffoldContext } from "./scaffoldContext";
import { fetchUrl, templateZipName, unzip } from "./utils";
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

export interface ScaffoldAction {
  name: string;
  run: (context: ScaffoldContext) => Promise<void>;
}

export enum ScaffoldActionName {
  FetchTemplateUrlWithTag = "FetchTemplatesUrlWithTag",
  FetchSampleUrlWithTag = "FetchSamplesUrlWithTag",
  FetchZipFromUrl = "FetchZipFromUrl",
  FetchTemplateZipFromLocal = "FetchTemplateZipFromLocal",
  Unzip = "Unzip",
}

export const fetchTemplateUrlWithTagAction: ScaffoldAction = {
  name: ScaffoldActionName.FetchTemplateUrlWithTag,
  run: async (context: ScaffoldContext) => {
    context.zipUrl = await fetchUrl(context.name, templateDownloadBaseUrl);
  },
};

export const fetchSampleUrlWithTagAction: ScaffoldAction = {
  name: ScaffoldActionName.FetchSampleUrlWithTag,
  run: async (context: ScaffoldContext) => {
    context.zipUrl = await fetchUrl(context.name, sampleDownloadBaseUrl);
  },
};

export const fetchZipFromUrlAction: ScaffoldAction = {
  name: ScaffoldActionName.FetchZipFromUrl,
  run: async (context: ScaffoldContext) => {
    if (!context.zipUrl) {
      throw new MissKeyError();
    }
    context.zip = await fetchZipFromUrl(context.zipUrl, defaultTryLimits, defaultTimeoutInMs);
  },
};

export const fetchTemplateZipFromLocalAction: ScaffoldAction = {
  name: ScaffoldActionName.FetchTemplateZipFromLocal,
  run: async (context: ScaffoldContext) => {
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

export const unzipAction: ScaffoldAction = {
  name: ScaffoldActionName.Unzip,
  run: async (context: ScaffoldContext) => {
    if (!context.zip) {
      throw new MissKeyError();
    }
    await unzip(
      context.zip,
      context.destination,
      context.appFolder,
      context.fileNameReplaceFn,
      context.fileDataReplaceFn
    );
  },
};

export const TemplateActionSeq: ScaffoldAction[] = [
  fetchTemplateUrlWithTagAction,
  fetchZipFromUrlAction,
  fetchTemplateZipFromLocalAction,
  unzipAction,
];

export const SampleActionSeq: ScaffoldAction[] = [
  fetchSampleUrlWithTagAction,
  fetchZipFromUrlAction,
  unzipAction,
];
