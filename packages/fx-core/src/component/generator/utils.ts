// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import Mustache from "mustache";
import path from "path";
import * as fs from "fs-extra";
import { selectTag } from "../../common/template-utils/templates";
import { fetchTemplateTagList } from "../../common/template-utils/templatesUtils";
import {
  sampleDownloadBaseUrl,
  sampleTagListUrl,
  templateDownloadBaseUrl,
  templateFileExt,
  templateTagListUrl,
} from "./constant";
import {
  FetchSampleUrlWithTagError,
  FetchZipFromUrlError,
  TemplateZipFallbackError,
  UnzipError,
} from "./error";
import { ScaffoldAction, ScaffoldActionName } from "./scaffoldAction";
import { ScaffoldContext } from "./scaffoldContext";

export async function fetchTemplateUrl(
  templateName: string,
  tryLimits: number,
  timeoutInMs: number
): Promise<string> {
  const tags = await fetchTemplateTagList(templateTagListUrl, tryLimits, timeoutInMs);
  const selectedTag = selectTag(tags.replace(/\r/g, "").split("\n"));
  if (!selectedTag) {
    throw new Error(`Failed to find valid template for ${templateName}`);
  }
  return `${templateDownloadBaseUrl}/${selectTag}/${templateZipName(templateName)}`;
}

export async function fetchSampleUrl(
  sampleName: string,
  tryLimits: number,
  timeoutInMs: number
): Promise<string> {
  const tags = await fetchTemplateTagList(sampleTagListUrl, tryLimits, timeoutInMs);
  const selectedTag = selectTag(tags.replace(/\r/g, "").split("\n"));
  if (!selectedTag) {
    throw new Error(`Failed to find valid template for ${sampleName}`);
  }
  return `${sampleDownloadBaseUrl}/${selectTag}/${templateZipName(sampleName)}`;
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

export async function templateDefaultOnActionError(
  action: ScaffoldAction,
  context: ScaffoldContext,
  error: Error
) {
  switch (action.name) {
    case ScaffoldActionName.FetchTemplateUrlWithTag:
    case ScaffoldActionName.FetchZipFromUrl:
      break;
    case ScaffoldActionName.FetchTemplateZipFromLocal:
      throw new TemplateZipFallbackError();
    case ScaffoldActionName.Unzip:
      throw new UnzipError();
    default:
      throw new Error(error.message);
  }
}

export async function sampleDefaultOnActionError(
  action: ScaffoldAction,
  context: ScaffoldContext,
  error: Error
) {
  switch (action.name) {
    case ScaffoldActionName.FetchSampleUrlWithTag:
      throw new FetchSampleUrlWithTagError();
    case ScaffoldActionName.FetchZipFromUrl:
      throw new FetchZipFromUrlError();
    case ScaffoldActionName.Unzip:
      throw new UnzipError();
    default:
      throw new Error(error.message);
  }
}
