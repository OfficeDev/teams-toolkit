// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import Mustache from "mustache";
import path from "path";
import * as fs from "fs-extra";
import { selectTag } from "../../common/template-utils/templates";
import { fetchTemplateTagList } from "../../common/template-utils/templatesUtils";
import {
  defaultTimeoutInMs,
  defaultTryLimits,
  templateFileExt,
  templateTagListUrl,
} from "./constant";
import {
  FetchSampleUrlWithTagError,
  FetchZipFromUrlError,
  TemplateZipFallbackError,
  UnzipError,
} from "./error";
import { GenerateAction, GenerateActionName } from "./generateAction";
import { GenerateContext } from "./generateContext";
import AdmZip from "adm-zip";
import { EOL } from "os";
import { SampleInfo, sampleProvider } from "./sample";

export async function fetchZipUrl(
  name: string,
  baseUrl: string,
  tryLimits = defaultTryLimits,
  timeoutInMs = defaultTimeoutInMs
): Promise<string> {
  const tags = await fetchTemplateTagList(templateTagListUrl, tryLimits, timeoutInMs);
  const selectedTag = selectTag(tags.replace(/\r/g, "").split("\n"));
  if (!selectedTag) {
    throw new Error(`Failed to find valid template for ${name}`);
  }
  return `${baseUrl}/${selectTag}/${templateZipName(name)}`;
}

export const templateZipName = (templateName: string): string => `${templateName}.zip`;

export function renderTemplateFileData(
  fileName: string,
  fileData: Buffer,
  variables?: { [key: string]: string }
): string | Buffer {
  //only mustache files with name ending with .tql
  if (path.extname(fileName) === templateFileExt) {
    return Mustache.render(fileData.toString(), variables);
  }
  // Return Buffer instead of string if the file is not a template. Because `toString()` may break binary resources, like png files.
  return fileData;
}

export function renderTemplateFileName(
  fileName: string,
  fileData: Buffer,
  variables?: { [key: string]: string }
): string {
  return Mustache.render(fileName, variables);
}

export function genFileDataRenderReplaceFn(variables: { [key: string]: string }) {
  return (fileName: string, fileData: Buffer) =>
    renderTemplateFileData(fileName, fileData, variables);
}

export function genFileNameRenderReplaceFn(variables: { [key: string]: string }) {
  return (fileName: string, fileData: Buffer) =>
    renderTemplateFileName(fileName, fileData, variables).replace(templateFileExt, "");
}

//the unzip function does the following things:
//1. unzip the package into dstPath,
//2. replace the file name and file content with the given replace functions
//3. if appFolder is provided, only the files within appFolder will be kept. This is used for samples from other repos.
export async function unzip(
  zip: AdmZip,
  dstPath: string,
  relativePath?: string,
  nameReplaceFn?: (filePath: string, data: Buffer) => string,
  dataReplaceFn?: (filePath: string, data: Buffer) => Buffer | string
): Promise<void> {
  let entries: AdmZip.IZipEntry[] = zip.getEntries().filter((entry) => !entry.isDirectory);
  if (relativePath) {
    entries = entries.filter((entry) => entry.entryName.startsWith(relativePath));
  }

  for (const entry of entries) {
    const rawEntryData: Buffer = entry.getData();
    let entryName: string = nameReplaceFn
      ? nameReplaceFn(entry.entryName, rawEntryData)
      : entry.entryName;
    if (relativePath) {
      entryName = entryName.replace(relativePath, "");
    }
    const entryData: string | Buffer = dataReplaceFn
      ? dataReplaceFn(entry.name, rawEntryData)
      : rawEntryData;

    const filePath: string = path.join(dstPath, entryName);
    const dirPath: string = path.dirname(filePath);
    await fs.ensureDir(dirPath);
    await fs.writeFile(filePath, entryData);
  }
}

export async function getValidSampleDestination(
  sampleName: string,
  destinationPath: string
): Promise<string> {
  let sampleDestination = path.join(destinationPath, sampleName);
  if (
    (await fs.pathExists(sampleDestination)) &&
    (await fs.readdir(sampleDestination)).length > 0
  ) {
    let suffix = 1;
    while (await fs.pathExists(sampleDestination)) {
      sampleDestination = path.join(destinationPath, `${sampleName}_${suffix++}`);
    }
  }
  return sampleDestination;
}

export function getSampleInfoFromName(sampleName: string): SampleInfo {
  const samples = sampleProvider.SampleCollection.samples.filter(
    (sample) => sample.id.toLowerCase() === sampleName.toLowerCase()
  );
  if (samples.length == 0) {
    throw Error(`invalid sample id: '${sampleName}'`);
  }
  return samples[0];
}

export function mergeReplaceMap(
  obj: { [key: string]: string },
  obj2?: { [key: string]: string }
): { [key: string]: string } {
  const result = { ...obj };
  if (obj2) {
    for (const key in obj2) {
      result[key] = obj2[key];
    }
  }
  return result;
}

export async function templateDefaultOnActionError(
  action: GenerateAction,
  context: GenerateContext,
  error: Error
) {
  switch (action.name) {
    case GenerateActionName.FetchTemplateUrlWithTag:
    case GenerateActionName.FetchZipFromUrl:
      break;
    case GenerateActionName.FetchTemplateZipFromLocal:
      throw new TemplateZipFallbackError();
    case GenerateActionName.Unzip:
      throw new UnzipError();
    default:
      throw new Error(error.message);
  }
}

export async function sampleDefaultOnActionError(
  action: GenerateAction,
  context: GenerateContext,
  error: Error
) {
  switch (action.name) {
    case GenerateActionName.FetchSampleUrlWithTag:
      throw new FetchSampleUrlWithTagError();
    case GenerateActionName.FetchZipFromUrl:
      throw new FetchZipFromUrlError();
    case GenerateActionName.Unzip:
      throw new UnzipError();
    default:
      throw new Error(error.message);
  }
}
