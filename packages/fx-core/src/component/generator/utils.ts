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
import { SampleInfo, sampleProvider } from "../../common/samples";

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
  return `${baseUrl}/${selectTag}/${name}.zip`;
}

export function renderTemplateFileData(
  fileName: string,
  fileData: Buffer,
  variables?: { [key: string]: string }
): string | Buffer {
  //only mustache files with name ending with .tpl
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
  return Mustache.render(fileName, variables).replace(templateFileExt, "");
}

export function genFileDataRenderReplaceFn(variables: { [key: string]: string }) {
  return (fileName: string, fileData: Buffer) =>
    renderTemplateFileData(fileName, fileData, variables);
}

export function genFileNameRenderReplaceFn(variables: { [key: string]: string }) {
  return (fileName: string, fileData: Buffer) =>
    renderTemplateFileName(fileName, fileData, variables);
}

export async function getValidSampleDestination(
  sampleName: string,
  destinationPath: string
): Promise<string> {
  let sampleDestination = path.join(destinationPath, sampleName);
  let suffix = 1;
  while (
    (await fs.pathExists(sampleDestination)) &&
    (await fs.readdir(sampleDestination)).length > 0
  ) {
    sampleDestination = path.join(destinationPath, `${sampleName}_${suffix++}`);
  }
  return sampleDestination;
}

export function getSampleInfoFromName(sampleName: string): SampleInfo {
  const samples = sampleProvider.SampleCollection.samples.filter(
    (sample) => sample.id.toLowerCase() === sampleName.toLowerCase()
  );
  if (!samples.length) {
    throw Error(`invalid sample name: '${sampleName}'`);
  }
  return samples[0];
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
      throw new FetchZipFromUrlError(context.zipUrl!);
    case GenerateActionName.Unzip:
      throw new UnzipError();
    default:
      throw new Error(error.message);
  }
}
