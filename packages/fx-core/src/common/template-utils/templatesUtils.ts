// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import AdmZip from "adm-zip";
import axios, { AxiosResponse, CancelToken } from "axios";
import path from "path";
import fs from "fs-extra";
import Mustache from "mustache";
import { EOL } from "os";

import config from "../templates-config.json";
import { selectTag, templateURL } from "./templates";

export const tagListUrl = config.tagListURL;
export const templateFileExt = ".tpl";

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

export async function fetchTemplateTagList(
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

export async function fetchTemplateUrl(
  group: string,
  language: string,
  scenario: string,
  tryLimits: number,
  timeoutInMs: number
): Promise<string> {
  const tags: string = await fetchTemplateTagList(tagListUrl, tryLimits, timeoutInMs);
  const selectedTag = selectTag(tags.replace(/\r/g, "").split("\n"));
  if (!selectedTag) {
    throw new Error(`Failed to find valid template for ${group}+${language}+${scenario}`);
  }
  return templateURL(selectedTag, `${group}.${language}.${scenario}`);
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
  filesInAppendMode = [".gitignore"]
): Promise<void> {
  const entries: AdmZip.IZipEntry[] = zip.getEntries().filter((entry) => !entry.isDirectory);

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
    if (filesInAppendMode.includes(entryName) && (await fs.pathExists(filePath))) {
      await fs.appendFile(filePath, EOL);
      await fs.appendFile(filePath, entryData);
    } else {
      await fs.writeFile(filePath, entryData);
    }
  }
}

export function renderTemplateContent(
  filePath: string,
  data: Buffer,
  variables: { [key: string]: string }
): string | Buffer {
  if (path.extname(filePath) === templateFileExt) {
    return Mustache.render(data.toString(), variables);
  }
  // Return Buffer instead of string if the file is not a template. Because `toString()` may break binary resources, like png files.
  return data;
}
