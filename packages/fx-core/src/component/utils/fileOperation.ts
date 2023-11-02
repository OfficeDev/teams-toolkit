// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as fs from "fs-extra";
import klaw from "klaw";
import AdmZip, { EntryHeader } from "adm-zip";
import ignore, { Ignore } from "ignore";
import path from "path";
import { DeployEmptyFolderError } from "../../error/deploy";

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
): Promise<fs.ReadStream> {
  const tasks: Promise<void>[] = [];
  const ig = notIncluded ?? ignore();
  // always delete cache if exists
  if (fs.existsSync(cache)) {
    await fs.remove(cache);
  }
  const zip = new AdmZip();

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
      const zipPath = path.normalize(relativePath).split("\\").join("/");
      if (relativePath && !stats.isDirectory()) {
        const fullPath = path.join(sourceDir, relativePath);
        const task = addFileIntoZip(zip, fullPath, zipPath, stats);
        tasks.push(task);
      }
    },
    (itemPath: string) => {
      return !ig.test(path.relative(sourceDir, itemPath)).ignored;
    }
  );

  if (tasks.length === 0) {
    throw new DeployEmptyFolderError(sourceDir);
  }

  await Promise.all(tasks);
  // save to cache if exists
  if (cache && tasks) {
    await fs.mkdirs(path.dirname(cache));
    await new Promise((resolve, reject) => {
      zip.writeZip(cache, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve({});
        }
      });
    });
  }
  return fs.createReadStream(cache);
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
