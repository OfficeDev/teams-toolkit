// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as fs from "fs-extra";
import klaw from "klaw";
import AdmZip, { EntryHeader } from "adm-zip";
import ignore, { Ignore } from "ignore";
import path from "path";
import glob from "glob";
import { DeployConstant } from "../constant/deployConstant";
import { DeployUserInputError } from "../error/deployError";

/**
 * Asynchronously zip a folder and return buffer
 * @param sourceDir base dir
 * @param notIncluded block list
 * @param cache zip cache file location
 */
export async function zipFolderAsync(
  sourceDir: string,
  cache: string,
  notIncluded: Ignore
): Promise<Buffer> {
  const normalizeTime = (t: number) => Math.floor(t / DeployConstant.ZIP_TIME_MS_GRANULARITY);

  const tasks: Promise<void>[] = [];
  const zipFiles = new Set<string>();
  const ig = notIncluded ?? ignore();
  const cacheFile = await readZip(cache);
  const zip = cacheFile ?? new AdmZip();

  const addFileIntoZip = async (
    zp: AdmZip,
    filePath: string,
    zipPath: string,
    stats?: fs.Stats
  ) => {
    const content = await fs.readFile(filePath);
    zp.addFile(zipPath, content);
    if (stats) {
      (zp.getEntry(zipPath)?.header as EntryHeader).time = stats.mtime;
    }
  };

  await forEachFileAndDir(
    sourceDir,
    (itemPath: string, stats: fs.Stats) => {
      const relativePath: string = path.relative(sourceDir, itemPath);
      if (relativePath && !stats.isDirectory()) {
        zipFiles.add(relativePath);

        const entry = zip.getEntry(relativePath);
        if (entry) {
          // The header is an object, the ts declare of adm-zip is wrong.
          const header = entry.header;
          const mtime = header ? header.time : new Date(0);
          // Some files' mtime in node_modules are too old, which may be invalid,
          // so we arbitrarily add a limitation to update this kind of files.
          // If mtime is valid and the two mtime is same in two-seconds, we think the two are same file.
          if (
            mtime >= DeployConstant.LATEST_TRUST_MS_TIME &&
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
    },
    (itemPath: string) => {
      return !ig.test(path.relative(sourceDir, itemPath)).ignored;
    }
  );

  if (!tasks && !cacheFile) {
    throw DeployUserInputError.noFilesFindInDistFolder();
  }

  await Promise.all(tasks);
  removeLegacyFileInZip(zip, zipFiles);
  // save to cache if exists
  const buffer = zip.toBuffer();
  if (cache && tasks) {
    await fs.mkdirs(path.dirname(cache));
    await fs.writeFile(cache, buffer);
  }

  return buffer;
}

export async function forEachFileAndDir(
  root: string,
  callback: (itemPath: string, stats: fs.Stats) => boolean | void,
  filter?: (itemPath: string) => boolean
): Promise<void> {
  await new Promise((resolve, reject) => {
    const stream: klaw.Walker = klaw(root, { filter: filter });
    stream
      .on("data", (item) => {
        if (callback(item.path, item.stats)) {
          stream.emit("close");
        }
      })
      .on("end", () => resolve({}))
      .on("error", (err) => reject(err))
      .on("close", () => resolve({}));
  });
}

function removeLegacyFileInZip(zip: AdmZip, existenceFiles: Set<string>): void {
  zip
    .getEntries()
    .filter((entry) => !existenceFiles.has(entry.name))
    .forEach((entry) => {
      zip.deleteFile(entry.name);
    });
}

async function readZip(cache: string): Promise<AdmZip | undefined> {
  try {
    const content = await fs.readFile(cache);
    return new AdmZip(content);
  } catch {
    // Failed to load cache, it doesn't block deployment.
  }
  return undefined;
}

/**
 * Recursively list all files that match a naming pattern in a specified directory
 * @param directoryPath base dir
 * @param matchPattern filename pattern
 * @param ignorePattern filename ignore pattern
 */
export async function listFilePaths(
  directoryPath: string,
  matchPattern = "**",
  ignorePattern?: string
): Promise<string[]> {
  return new Promise<string[]>((resolve, reject) => {
    const ignore: string = ignorePattern ? path.join(directoryPath, ignorePattern) : "";
    glob(
      path.join(directoryPath, matchPattern),
      {
        dot: true, // Include .dot files
        nodir: true, // Only match files
        ignore,
      },
      (error, filePaths) => {
        if (error) {
          reject(error);
        } else {
          resolve(filePaths);
        }
      }
    );
  });
}
