// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import fs from "fs-extra";
import { Messages } from "../constant";
import tmp from "tmp";
import axios from "axios";
import util from "util";
import AdmZip from "adm-zip";

/**
 * @author Aocheng Wang <aochengwang@microsoft.com>
 */

/**
 * Download a file from URL and save to a temporary file.
 * The temp file can only be used during callback. After that the temp file is deleted.
 *  */
export async function downloadToTempFile(
  url: string,
  options: {
    timeout: number;
    headers?: { [key: string]: string };
  },
  callback: (filePath: string) => Promise<void>
): Promise<void> {
  // name is full path
  const { name, removeCallback } = tmp.fileSync();
  try {
    const writer = fs.createWriteStream(name, { flags: "w" /* Open for write */ });
    const response = await axios.get(url, {
      responseType: "stream",
      headers: options.headers,
      timeout: options.timeout,
    });
    response.data.pipe(writer);
    if (response.status !== 200) {
      throw new Error(
        Messages.failToDownloadFromUrl()
          .replace(/@Url/g, url)
          .replace(/@Status/g, response.status.toString())
      );
    }

    await new Promise<void>((resolve, reject) => {
      writer.on("error", (err) => {
        reject(err);
      });
      writer.on("finish", () => {
        resolve();
      });
    });

    await callback(name);
  } finally {
    removeCallback();
  }
}

export async function unzip(zipFilePath: string, destinationPath: string): Promise<void> {
  // Create all parent dirs of destinationPath.
  await fs.mkdir(destinationPath, { recursive: true });
  const zip = new AdmZip(zipFilePath);
  // Don't use 2 parameter version: https://github.com/cthackers/adm-zip/issues/407#issuecomment-990086783
  await util.promisify(zip.extractAllToAsync)(destinationPath, true, false);
}
