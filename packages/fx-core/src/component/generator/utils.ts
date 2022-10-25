// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import Mustache from "mustache";
import path from "path";
import * as fs from "fs-extra";
import {
  defaultTimeoutInMs,
  defaultTryLimits,
  templateAlphaVersion,
  templateBetaVersion,
  templateFileExt,
} from "./constant";
import {
  FetchSampleUrlWithTagError,
  FetchZipFromUrlError,
  TemplateZipFallbackError,
  UnzipError,
} from "./error";
import { GeneratorAction, GeneratorActionName } from "./generatorAction";
import { GeneratorContext } from "./generatorAction";
import { SampleInfo, sampleProvider } from "../../common/samples";
import AdmZip from "adm-zip";
import axios, { AxiosResponse, CancelToken } from "axios";
import { EOL } from "os";
import templateConfig from "../../common/templates-config.json";
import sampleConfig from "../../common/samples-config.json";
import semver from "semver";

const preRelease = process.env.TEAMSFX_TEMPLATE_PRERELEASE || "";
const templateVersion = templateConfig.version;
const templateTagPrefix = templateConfig.tagPrefix;
const templateTagListURL = templateConfig.tagListURL;
const sampleVersion = sampleConfig.version;
const sampleTagPrefix = sampleConfig.tagPrefix;
const sampleTagListURL = sampleConfig.tagListURL;

function selectTemplateTag(tags: string[]): string | undefined {
  return templateAlphaVersion;
  // if (preRelease === "alpha") {
  //   return templateAlphaVersion;
  // }
  // if (preRelease === "beta") {
  //   return templateBetaVersion;
  // }
  // const versionPattern = preRelease ? `0.0.0-${preRelease}` : templateVersion;
  // const versionList = tags.map((tag: string) => tag.replace(templateTagPrefix, ""));
  // const selectedVersion = semver.maxSatisfying(versionList, versionPattern);
  // return selectedVersion ? templateTagPrefix + selectedVersion : undefined;
}

function selectSampleTag(tags: string[]): string | undefined {
  const versionPattern = preRelease ? `0.0.0-${preRelease}` : sampleVersion;
  const versionList = tags.map((tag: string) => tag.replace(sampleTagPrefix, ""));
  const selectedVersion = semver.maxSatisfying(versionList, versionPattern);
  return selectedVersion ? sampleTagPrefix + selectedVersion : undefined;
}

async function sendRequestWithRetry<T>(
  requestFn: () => Promise<AxiosResponse<T>>,
  tryLimits: number
): Promise<AxiosResponse<T>> {
  // !status means network error, see https://github.com/axios/axios/issues/383
  const canTry = (status: number | undefined) => !status || (status >= 500 && status < 600);

  let status: number | undefined;
  let error: Error;

  for (let i = 0; i < tryLimits && canTry(status); i++) {
    try {
      const res = await requestFn();
      if (res.status === 200 || res.status === 201) {
        return res;
      }

      error = new Error(`HTTP Request failed: ${JSON.stringify(res)}`);
      status = res.status;
    } catch (e: any) {
      error = e;
      status = e?.response?.status;
    }
  }

  error ??= new Error(`RequestWithRetry got bad tryLimits: ${tryLimits}`);
  throw error;
}

async function sendRequestWithTimeout<T>(
  requestFn: (cancelToken: CancelToken) => Promise<AxiosResponse<T>>,
  timeoutInMs: number,
  tryLimits = 1
): Promise<AxiosResponse<T>> {
  const source = axios.CancelToken.source();
  const timeout = setTimeout(() => {
    source.cancel();
  }, timeoutInMs);
  try {
    const res = await sendRequestWithRetry(() => requestFn(source.token), tryLimits);
    clearTimeout(timeout);
    return res;
  } catch (err: unknown) {
    if (axios.isCancel(err)) {
      throw new Error("Request timeout");
    }
    throw err;
  }
}

export async function fetchTagList(
  url: string,
  tryLimits: number,
  timeoutInMs: number
): Promise<string> {
  const res: AxiosResponse<string> = await sendRequestWithTimeout(
    async (cancelToken) => {
      return await axios.get(url, {
        cancelToken: cancelToken,
      });
    },
    timeoutInMs,
    tryLimits
  );
  return res.data;
}

export async function fetchTemplateZipUrl(
  name: string,
  tryLimits = defaultTryLimits,
  timeoutInMs = defaultTimeoutInMs
): Promise<string> {
  const tags = await fetchTagList(templateTagListURL, tryLimits, timeoutInMs);
  const selectedTag = selectTemplateTag(tags.replace(/\r/g, "").split("\n"));
  if (!selectedTag) {
    throw new Error(`Failed to find valid template for ${name}`);
  }
  return `${templateConfig.templateDownloadBaseURL}/${selectTemplateTag}/${name}.zip`;
}

export async function fetchSampleZipUrl(
  name: string,
  tryLimits = defaultTryLimits,
  timeoutInMs = defaultTimeoutInMs
): Promise<string> {
  const tags = await fetchTagList(sampleTagListURL, tryLimits, timeoutInMs);
  const selectedTag = selectSampleTag(tags.replace(/\r/g, "").split("\n"));
  if (!selectedTag) {
    throw new Error(`Failed to find valid sample for ${name}`);
  }
  return `${sampleConfig.sampleDownloadBaseUrl}/${selectTemplateTag}/${name}.zip`;
}

export async function fetchZipFromUrl(
  url: string,
  tryLimits: number,
  timeoutInMs: number
): Promise<AdmZip> {
  const res: AxiosResponse<any> = await sendRequestWithTimeout(
    async (cancelToken) => {
      return await axios.get(url, {
        responseType: "arraybuffer",
        cancelToken: cancelToken,
      });
    },
    timeoutInMs,
    tryLimits
  );

  const zip = new AdmZip(res.data);
  return zip;
}

/* The unzip used for scaffold which would drop the attr of the files and dirs. */
export async function unzip(
  zip: AdmZip,
  dstPath: string,
  nameReplaceFn?: (filePath: string, data: Buffer) => string,
  dataReplaceFn?: (filePath: string, data: Buffer) => Buffer | string,
  relativePath?: string,
  filesInAppendMode = [".gitignore"]
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
    if (filesInAppendMode.includes(entryName) && (await fs.pathExists(filePath))) {
      await fs.appendFile(filePath, EOL);
      await fs.appendFile(filePath, entryData);
    } else {
      await fs.writeFile(filePath, entryData);
    }
  }
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

export function getSampleInfoFromName(sampleName: string): SampleInfo {
  const sample = sampleProvider.SampleCollection.samples.find(
    (sample) => sample.id.toLowerCase() === sampleName.toLowerCase()
  );
  if (!sample) {
    throw Error(`invalid sample name: '${sampleName}'`);
  }
  return sample;
}

export function zipFolder(folderPath: string): AdmZip {
  const zip = new AdmZip();
  zip.addLocalFolder(folderPath);
  return zip;
}

export async function templateDefaultOnActionError(
  action: GeneratorAction,
  context: GeneratorContext,
  error: Error
) {
  switch (action.name) {
    case GeneratorActionName.FetchTemplateUrlWithTag:
    case GeneratorActionName.FetchZipFromUrl:
      break;
    case GeneratorActionName.FetchTemplateZipFromLocal:
      throw new TemplateZipFallbackError();
    case GeneratorActionName.Unzip:
      throw new UnzipError();
    default:
      throw new Error(error.message);
  }
}

export async function sampleDefaultOnActionError(
  action: GeneratorAction,
  context: GeneratorContext,
  error: Error
) {
  switch (action.name) {
    case GeneratorActionName.FetchSampleUrlWithTag:
      throw new FetchSampleUrlWithTagError(error);
    case GeneratorActionName.FetchZipFromUrl:
      throw new FetchZipFromUrlError(context.zipUrl!, error);
    case GeneratorActionName.Unzip:
      throw new UnzipError();
    default:
      throw new Error(error.message);
  }
}
