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
  templateFileExt,
  sampleConcurrencyLimits,
  sampleDefaultRetryLimits,
} from "./constant";
import { SampleConfig, sampleProvider } from "../../common/samples";
import AdmZip from "adm-zip";
import axios, { AxiosResponse, CancelToken } from "axios";
import templateConfig from "../../common/templates-config.json";
import semver from "semver";
import { deepCopy } from "../../common/tools";
import { InvalidInputError } from "../../core/error";
import { ProgrammingLanguage } from "../../question";
import { AxiosError } from "axios";

async function selectTemplateTag(getTags: () => Promise<string[]>): Promise<string | undefined> {
  const preRelease = process.env.TEAMSFX_TEMPLATE_PRERELEASE
    ? `0.0.0-${process.env.TEAMSFX_TEMPLATE_PRERELEASE}`
    : "";
  const templateVersion = templateConfig.version;
  const templateTagPrefix = templateConfig.tagPrefix;
  const versionPattern = preRelease || templateVersion;

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
      } else {
        error = new Error(`HTTP Request failed: ${JSON.stringify(res)}`);
      }
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

export async function getTemplateLatestTag(
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
  return selectedTag;
}

export function getTemplateZipUrlByTag(name: string, selectedTag: string): string {
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
  filterFn?: (filePath: string) => boolean
): Promise<string[]> {
  const output = [];
  let entries = zip.getEntries().filter((entry) => !entry.isDirectory);
  if (filterFn) {
    entries = entries.filter((entry) => filterFn(entry.entryName));
  }

  for (const entry of entries) {
    const rawEntryData: Buffer = entry.getData();
    const entryName: string = nameReplaceFn
      ? nameReplaceFn(entry.entryName, rawEntryData)
      : entry.entryName;
    const entryData: string | Buffer = dataReplaceFn
      ? dataReplaceFn(entry.name, rawEntryData)
      : rawEntryData;
    const filePath: string = path.join(dstPath, entryName);
    const dirPath: string = path.dirname(filePath);
    await fs.ensureDir(dirPath);
    await fs.writeFile(filePath, entryData);
    output.push(entryName);
  }
  return output;
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

function escapeEmptyVariable(
  template: string,
  view: Record<string, string | undefined>,
  tags: [string, string] = placeholderDelimiters
): string[][] {
  const parsed = Mustache.parse(template, tags) as string[][];
  const tokens = deepCopy(parsed); // Mustache cache the parsed result. Modify the result in place may cause unexpected issue.
  updateTokens(tokens, view, tags, 0);
  return tokens;
}

function updateTokens(
  tokens: string[][],
  view: Record<string, string | undefined>,
  tags: [string, string],
  accShift: number
): number {
  const shift = tags[0].length + tags[1].length;
  // token: [Type, Value, Start, End]
  for (const token of tokens) {
    token[2] += accShift;
    const value = token[1];
    if (token[0] === "name" && (view[value] === undefined || view[value] === null)) {
      token[0] = "text";
      token[1] = tags[0] + value + tags[1];
      accShift += shift;
    } else if (token[0] === "#") {
      token[2] += accShift;
      token[3] += accShift;
      accShift += updateTokens(token[4] as any, view, tags, accShift);
      token[5] += accShift;
    }
  }
  return accShift;
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

export async function getSampleInfoFromName(sampleName: string): Promise<SampleConfig> {
  const sample = (await sampleProvider.SampleCollection).samples.find(
    (sample) => sample.id.toLowerCase() === sampleName.toLowerCase()
  );
  if (!sample) {
    throw InvalidInputError(`sample '${sampleName}' not found`);
  }
  return sample;
}

export function zipFolder(folderPath: string): AdmZip {
  const zip = new AdmZip();
  zip.addLocalFolder(folderPath);
  return zip;
}

export async function downloadDirectory(
  sampleInfo: SampleUrlInfo,
  dstPath: string,
  concurrencyLimits = sampleConcurrencyLimits,
  retryLimits = sampleDefaultRetryLimits
): Promise<string[]> {
  const { samplePaths, fileUrlPrefix } = await getSampleFileInfo(sampleInfo, retryLimits);
  await downloadSampleFiles(
    sampleInfo,
    fileUrlPrefix,
    samplePaths,
    dstPath,
    sampleInfo.dir,
    retryLimits,
    concurrencyLimits
  );
  return samplePaths;
}

export type SampleUrlInfo = {
  owner: string;
  repository: string;
  ref: string;
  dir: string;
};

type SampleFileInfo = {
  tree: {
    path: string;
    type: string;
  }[];
  sha: string;
};

export async function getSampleFileInfo(urlInfo: SampleUrlInfo, retryLimits: number): Promise<any> {
  const fileInfoUrl = `https://api.github.com/repos/${urlInfo.owner}/${urlInfo.repository}/git/trees/${urlInfo.ref}?recursive=1`;
  const fileInfo = (
    await sendRequestWithRetry(async () => {
      return await axios.get(fileInfoUrl);
    }, retryLimits)
  ).data as SampleFileInfo;

  const samplePaths = fileInfo?.tree
    ?.filter((node) => node.path.startsWith(`${urlInfo.dir}/`) && node.type !== "tree")
    .map((node) => node.path);
  const fileUrlPrefix = `https://raw.githubusercontent.com/${urlInfo.owner}/${urlInfo.repository}/${fileInfo?.sha}/`;
  return { samplePaths, fileUrlPrefix };
}

async function downloadSampleFiles(
  sampleInfo: SampleUrlInfo,
  fileUrlPrefix: string,
  samplePaths: string[],
  dstPath: string,
  relativePath: string,
  retryLimits: number,
  concurrencyLimits: number
): Promise<void> {
  const downloadCallback = async (samplePath: string) => {
    const lfsRegex = /^.*oid sha256:[0-9a-f]+\nsize \d+/gm;
    const file = (await sendRequestWithRetry(async () => {
      const content = await axios.get(fileUrlPrefix + samplePath, { responseType: "arraybuffer" });
      if (lfsRegex.test(content.data.toString())) {
        return await axios.get(
          `https://media.githubusercontent.com/media/${sampleInfo.owner}/${sampleInfo.repository}/${sampleInfo.ref}/${samplePath}`,
          {
            responseType: "arraybuffer",
          }
        );
      } else {
        return content;
      }
    }, retryLimits)) as unknown as any;
    const filePath = path.join(dstPath, path.relative(`${relativePath}/`, samplePath));
    await fs.ensureFile(filePath);
    await fs.writeFile(filePath, Buffer.from(file.data));
  };
  await runWithLimitedConcurrency(samplePaths, downloadCallback, concurrencyLimits);
}

export async function runWithLimitedConcurrency<T>(
  items: T[],
  callback: (arg: T) => any,
  concurrencyLimit: number
): Promise<void> {
  const queue: any[] = [];
  for (const item of items) {
    // fire the async function, add its promise to the queue, and remove
    // it from queue when complete
    const p = callback(item)
      .then((res: any) => {
        queue.splice(queue.indexOf(p), 1);
        return res;
      })
      .catch((err: any) => {
        throw err;
      });
    queue.push(p);
    // if max concurrent, wait for one to finish
    if (queue.length >= concurrencyLimit) {
      await Promise.race(queue);
    }
  }
  // wait for the rest of the calls to finish
  await Promise.all(queue);
}

export function convertToLangKey(programmingLanguage: string): string {
  switch (programmingLanguage) {
    case ProgrammingLanguage.JS: {
      return "js";
    }
    case ProgrammingLanguage.TS: {
      return "ts";
    }
    case ProgrammingLanguage.CSharp: {
      return "csharp";
    }
    case ProgrammingLanguage.PY: {
      return "python";
    }
  }
  return programmingLanguage;
}

export function convertToUrl(sampleInfo: SampleUrlInfo): string {
  return `https://github.com/${sampleInfo.owner}/${sampleInfo.repository}/tree/${sampleInfo.ref}/${sampleInfo.dir}`;
}

export function simplifyAxiosError(error: AxiosError): Error {
  const simplifiedError = {
    message: error.message,
    name: error.name,
    config: error.config,
    code: error.code,
    stack: error.stack,
    status: error.response?.status,
    statusText: error.response?.statusText,
    headers: error.response?.headers,
    data: error.response?.data,
  };
  return simplifiedError;
}

export function isApiLimitError(error: Error): boolean {
  //https://docs.github.com/en/rest/overview/rate-limits-for-the-rest-api?apiVersion=2022-11-28#exceeding-the-rate-limit
  return (
    axios.isAxiosError(error) &&
    error.response?.status !== undefined &&
    [403, 429].includes(error.response.status) &&
    error.response?.headers?.["x-ratelimit-remaining"] === "0"
  );
}
