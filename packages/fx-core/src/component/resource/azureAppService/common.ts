// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import AdmZip from "adm-zip";
import ignore, { Ignore } from "ignore";
import * as fs from "fs-extra";
import { forEachFileAndDir } from "./dir-walk";
import path from "path";
import { AzureOperationCommonConstants } from "../../../common/azure-hosting/hostingConstant";

/**
 * Asynchronously zip a folder and return buffer
 * @param sourceDir base dir
 * @param notIncluded block list
 * @param cache zip cache file location
 */
export async function zipFolderAsync(
  sourceDir: string,
  cache: string,
  notIncluded?: Ignore
): Promise<Buffer> {
  const normalizeTime = (t: number) =>
    Math.floor(t / AzureOperationCommonConstants.zipTimeMSGranularity);

  const tasks: Promise<void>[] = [];
  const zipFiles = new Set<string>();
  const ig = notIncluded ?? ignore();
  const zip = (await readZipFromCache(cache)) || new AdmZip();

  const addFileIntoZip = async (
    zp: AdmZip,
    filePath: string,
    zipPath: string,
    stats?: fs.Stats
  ) => {
    const content = await fs.readFile(filePath);
    zp.addFile(zipPath, content);
    if (stats) {
      (zp.getEntry(zipPath)!.header as any).time = stats.mtime;
    }
  };

  await forEachFileAndDir(sourceDir, (itemPath: string, stats: fs.Stats) => {
    const relativePath: string = path.relative(sourceDir, itemPath);
    if (relativePath && !stats.isDirectory() && ig.filter([relativePath]).length > 0) {
      zipFiles.add(relativePath);

      const entry = zip.getEntry(relativePath);
      if (entry) {
        // The header is an object, the ts declare of adm-zip is wrong.
        const header = entry.header as any;
        const mtime = header && header.time;
        // Some files' mtime in node_modules are too old, which may be invalid,
        // so we arbitrarily add a limitation to update this kind of files.
        // If mtime is valid and the two mtime is same in two-seconds, we think the two are same file.
        if (
          mtime >= AzureOperationCommonConstants.latestTrustMtime &&
          normalizeTime(mtime.getTime()) === normalizeTime(stats.mtime.getTime())
        ) {
          return;
        }

        // Delete the entry because the file has been updated.
        zip.deleteFile(relativePath);
      }

      // If fail to reuse cached entry, load it from disk.
      const fullPath = path.join(sourceDir, relativePath);
      const task = addFileIntoZip(zip, fullPath, relativePath, stats);
      tasks.push(task);
    }
  });

  await Promise.all(tasks);
  removeLegacyFileInZip(zip, zipFiles);

  return zip.toBuffer();
}

async function readZipFromCache(cache: string): Promise<AdmZip | undefined> {
  try {
    const content = await fs.readFile(cache);
    return new AdmZip(content);
  } catch {
    // Failed to load cache, it doesn't block deployment.
  }
  return undefined;
}

function removeLegacyFileInZip(zip: AdmZip, existenceFiles: Set<string>): void {
  zip
    .getEntries()
    .filter((entry) => !existenceFiles.has(entry.name))
    .forEach((entry) => {
      zip.deleteFile(entry.name);
    });
}
