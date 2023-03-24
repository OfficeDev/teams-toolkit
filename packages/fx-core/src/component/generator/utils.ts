// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import Mustache, { Context, Writer } from "mustache";
import path from "path";
import * as fs from "fs-extra";
import {
  defaultTimeoutInMs,
  defaultTryLimits,
  oldPlaceholderDelimiters,
  placeholderDelimiters,
  templateAlphaVersion,
  templateFileExt,
  templatePrereleaseVersion,
} from "./constant";
import { SampleInfo, sampleProvider } from "../../common/samples";
import AdmZip from "adm-zip";
import axios, { AxiosResponse, CancelToken } from "axios";
import templateConfig from "../../common/templates-config.json";
import sampleConfig from "../../common/samples-config-v3.json";
import semver from "semver";
import { CancelDownloading } from "./error";
import { deepCopy } from "../../common/tools";

async function selectTemplateTag(getTags: () => Promise<string[]>): Promise<string | undefined> {
  const preRelease = process.env.TEAMSFX_TEMPLATE_PRERELEASE
    ? `0.0.0-${process.env.TEAMSFX_TEMPLATE_PRERELEASE}`
    : "";
  const templateVersion = templateConfig.version;
  const templateTagPrefix = templateConfig.tagPrefix;
  const versionPattern = preRelease || templateVersion;

  // To avoid incompatible, alpha release does not download latest template.
  if ([templateAlphaVersion, templatePrereleaseVersion].includes(versionPattern)) {
    throw new CancelDownloading();
  }

  const versionList = (await getTags()).map((tag: string) => tag.replace(templateTagPrefix, ""));
  const selectedVersion = semver.maxSatisfying(versionList, versionPattern);
  return selectedVersion ? templateTagPrefix + selectedVersion : undefined;
}

export async function sendRequestWithRetry<T>(
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

export async function sendRequestWithTimeout<T>(
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

async function fetchTagList(url: string, tryLimits: number, timeoutInMs: number): Promise<string> {
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
  const templateTagListURL = templateConfig.tagListURL;
  const selectedTag = await selectTemplateTag(async () =>
    (await fetchTagList(templateTagListURL, tryLimits, timeoutInMs)).replace(/\r/g, "").split("\n")
  );
  if (!selectedTag) {
    throw new Error(`Failed to find valid template for ${name}`);
  }
  return `${templateConfig.templateDownloadBaseURL}/${selectedTag}/${name}.zip`;
}

export async function fetchZipFromUrl(
  url: string,
  tryLimits = defaultTryLimits,
  timeoutInMs = defaultTimeoutInMs
): Promise<AdmZip> {
  const res: AxiosResponse<any> = await sendRequestWithRetry(async () => {
    return await axios.get(url, {
      responseType: "arraybuffer",
      timeout: timeoutInMs,
    });
  }, tryLimits);

  const zip = new AdmZip(res.data);
  return zip;
}

/* The unzip used for scaffold which would drop the attr of the files and dirs. */
export async function unzip(
  zip: AdmZip,
  dstPath: string,
  nameReplaceFn?: (filePath: string, data: Buffer) => string,
  dataReplaceFn?: (filePath: string, data: Buffer) => Buffer | string,
  relativePath?: string
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

export function renderTemplateFileData(
  fileName: string,
  fileData: Buffer,
  variables?: { [key: string]: string }
): string | Buffer {
  //only mustache files with name ending with .tpl
  if (path.extname(fileName) === templateFileExt) {
    const token = escapeEmptyVariable(fileData.toString(), variables ?? {});
    const writer = new Writer();
    const result = writer.renderTokens(token, new Context(variables));
    // Be compatible with current stable templates, can be removed after new template released.
    return Mustache.render(result, variables, {}, oldPlaceholderDelimiters);
  }
  // Return Buffer instead of string if the file is not a template. Because `toString()` may break binary resources, like png files.
  return fileData;
}

export function escapeEmptyVariable(
  template: string,
  view: Record<string, string | undefined>,
  tags: [string, string] = placeholderDelimiters
): string[][] {
  const parsed = Mustache.parse(template, tags) as string[][];
  const tokens = deepCopy(parsed); // Mustache cache the parsed result. Modify the result in place may cause unexpected issue.
  let accShift = 0;
  const shift = tags[0].length + tags[1].length;
  // token: [Type, Value, Start, End]
  for (const token of tokens) {
    token[2] += accShift;
    const value = token[1];
    if (token[0] === "name" && (view[value] === undefined || view[value] === null)) {
      token[0] = "text";
      token[1] = tags[0] + value + tags[1];
      accShift += shift;
    }
    token[3] += accShift;
  }
  return tokens;
}

export function renderTemplateFileName(
  fileName: string,
  fileData: Buffer,
  variables?: { [key: string]: string }
): string {
  return Mustache.render(fileName, variables, {}, placeholderDelimiters).replace(
    templateFileExt,
    ""
  );
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

export function getSampleRelativePath(sampleName: string): string {
  return `${sampleConfig.baseFolderName}/${sampleName}/`;
}

export function zipFolder(folderPath: string): AdmZip {
  const zip = new AdmZip();
  zip.addLocalFolder(folderPath);
  return zip;
}
