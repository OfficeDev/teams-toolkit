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
import { CancelDownloading, ParseUrlError } from "./error";
import { deepCopy } from "../../common/tools";
import { InvalidInputError } from "../../core/error";

async function selectTemplateTag(getTags: () => Promise<string[]>): Promise<string | undefined> {
  const preRelease = process.env.TEAMSFX_TEMPLATE_PRERELEASE
    ? `0.0.0-${process.env.TEAMSFX_TEMPLATE_PRERELEASE}`
    : "";
  const templateVersion = templateConfig.version;
  const templateTagPrefix = templateConfig.tagPrefix;
  const useLocal = templateConfig.useLocalTemplate;
  const versionPattern = preRelease || templateVersion;

  if (useLocal.toString() === "true") {
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
  filterFn?: (filePath: string, data: Buffer) => boolean
): Promise<string[]> {
  const output = [];
  const entries = zip
    .getEntries()
    .filter((entry) => !entry.isDirectory)
    .filter((entry) => {
      return filterFn ? filterFn(entry.entryName, entry.getData()) : true;
    });
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

export function getSampleInfoFromName(sampleName: string): SampleConfig {
  const sample = sampleProvider.SampleCollection.samples.find(
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
  sampleUrl: string,
  dstPath: string,
  concurrencyLimits = sampleConcurrencyLimits,
  retryLimits = sampleDefaultRetryLimits
): Promise<string[]> {
  const urlInfo = parseSampleUrl(sampleUrl);
  const { samplePaths, fileUrlPrefix } = await getSampleFileInfo(urlInfo, retryLimits);
  await downloadSampleFiles(
    fileUrlPrefix,
    samplePaths,
    dstPath,
    urlInfo.dir,
    retryLimits,
    concurrencyLimits
  );
  return samplePaths;
}

type SampleUrlInfo = {
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

export function parseSampleUrl(url: string): SampleUrlInfo {
  const urlParserRegex = /https:\/\/github.com\/([^/]+)\/([^/]+)\/tree\/([^/]+)[/](.*)/;
  const parsed = urlParserRegex.exec(url);
  if (!parsed) throw new ParseUrlError(url);
  const [owner, repository, ref, dir] = parsed.slice(1);
  return { owner, repository, ref, dir };
}

async function getSampleFileInfo(urlInfo: SampleUrlInfo, retryLimits: number): Promise<any> {
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
  fileUrlPrefix: string,
  samplePaths: string[],
  dstPath: string,
  relativePath: string,
  retryLimits: number,
  concurrencyLimits: number
): Promise<void> {
  const downloadCallback = async (samplePath: string) => {
    const file = (await sendRequestWithRetry(async () => {
      return await axios.get(fileUrlPrefix + samplePath, { responseType: "arraybuffer" });
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
    case "javascript": {
      return "js";
    }
    case "typescript": {
      return "ts";
    }
    case "csharp": {
      return "csharp";
    }
  }
  return programmingLanguage;
}
