// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import AdmZip from "adm-zip";
import path from "path";
import { fetchZipFromUrl, fetchTemplateZipUrl, unzip, fetchSampleZipUrl, zipFolder } from "./utils";
import fs from "fs-extra";
import { defaultTimeoutInMs, defaultTryLimits } from "./constant";
import { getTemplatesFolder } from "../../folder";
import { MissKeyError } from "./error";
import { FeatureFlagName } from "../../common/constants";
import { LogProvider } from "@microsoft/teamsfx-api";

export interface GeneratorContext {
  name: string;
  destination: string;
  logProvider: LogProvider;
  relativePath?: string;
  zipUrl?: string;
  zip?: AdmZip;
  fallbackZipPath?: string;

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
  FetchSampleUrlWithTag = "FetchSamplesUrlWithTag",
  FetchZipFromUrl = "FetchZipFromUrl",
  FetchTemplateZipFromLocal = "FetchTemplateZipFromLocal",
  Unzip = "Unzip",
}

// * This action is only for debug purpose
export const fetchTemplateZipFromSourceCodeAction: GeneratorAction = {
  name: GeneratorActionName.FetchTemplateZipFromSourceCode,
  run: async (context: GeneratorContext) => {
    const isDebugMode = () => {
      const DebugTemplateFlag = process.env[FeatureFlagName.DebugTemplate];
      return DebugTemplateFlag?.toLowerCase() === "true" && process.env.NODE_ENV === "development";
    };

    if (!isDebugMode()) {
      return;
    }

    if (context.zip) {
      return;
    }

    //! This path only works in debug mode
    const templateSourceCodePath = path.resolve(
      __dirname,
      "../../../../../",
      "templates",
      "scenarios",
      context.name
    );

    context.zip = zipFolder(templateSourceCodePath);
  },
};

export const fetchTemplateUrlWithTagAction: GeneratorAction = {
  name: GeneratorActionName.FetchTemplateUrlWithTag,
  run: async (context: GeneratorContext) => {
    if (context.zip || context.zipUrl) {
      return;
    }

    context.zipUrl = await fetchTemplateZipUrl(context.name);
  },
};

export const fetchSampleUrlWithTagAction: GeneratorAction = {
  name: GeneratorActionName.FetchSampleUrlWithTag,
  run: async (context: GeneratorContext) => {
    //For 3rd party sample, the zip url is already provided in context, no need to fetch url again;
    //for 1st party sample, need to call fetchZipUrl function
    if (!context.zipUrl) {
      context.zipUrl = await fetchSampleZipUrl(context.name);
    }
  },
};

export const fetchZipFromUrlAction: GeneratorAction = {
  name: GeneratorActionName.FetchZipFromUrl,
  run: async (context: GeneratorContext) => {
    if (context.zip) {
      return;
    }

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
  fetchTemplateZipFromSourceCodeAction,
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
