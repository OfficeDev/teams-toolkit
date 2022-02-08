// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import fs from "fs-extra";
import * as path from "path";
import AdmZip from "adm-zip";
import axios from "axios";
import { WebSiteManagementClient } from "@azure/arm-appservice";
import { Utils } from "../frontend/utils";
import { forEachFileAndDir } from "../function/utils/dir-walk";
import { sendRequestWithRetry } from "../../../common/template-utils/templatesUtils";

export async function getFrameworkVersion(projectFilePath: string): Promise<string> {
  const content = await fs.readFile(projectFilePath, "utf8");
  const framework = content.match(/(?<=<TargetFramework>)(.*)(?=<)/gim);
  if (framework?.length) {
    return framework[0].trim();
  }
  return "net6.0";
}

export async function build(path: string, runtime: string): Promise<void> {
  const command = `dotnet publish --configuration Release --runtime ${runtime} --self-contained`;
  await Utils.execute(command, path);
}

export async function generateZip(componentPath: string): Promise<AdmZip> {
  const zip = new AdmZip();
  const tasks: Promise<void>[] = [];
  const zipFiles = new Set<string>();

  const addFileIntoZip = async (zip: AdmZip, filePath: string, zipPath: string) => {
    const content = await fs.readFile(filePath);
    zip.addFile(zipPath, content);
  };

  await forEachFileAndDir(componentPath, (itemPath: string, stats: fs.Stats) => {
    const relativePath: string = path.relative(componentPath, itemPath);
    if (relativePath && !stats.isDirectory()) {
      zipFiles.add(relativePath);

      // If fail to reuse cached entry, load it from disk.
      const fullPath = path.join(componentPath, relativePath);
      const task = addFileIntoZip(zip, fullPath, relativePath);
      tasks.push(task);
    }
  });

  await Promise.all(tasks);
  return zip;
}

export async function zipDeploy(
  client: WebSiteManagementClient,
  resourceGroupName: string,
  webAppName: string,
  componentPath: string
): Promise<void> {
  const zip = await generateZip(componentPath);
  const zipContent = zip.toBuffer();

  const publishCred = await client.webApps.listPublishingCredentials(resourceGroupName, webAppName);
  const username = publishCred.publishingUserName;
  const password = publishCred.publishingPassword;

  if (!password) {
    throw new Error("PublishCredentialError");
  }

  await sendRequestWithRetry(
    async () =>
      await axios.post(`https://${webAppName}.scm.azurewebsites.net/api/zipdeploy`, zipContent, {
        headers: {
          "Content-Type": "application/octet-stream",
          "Cache-Control": "no-cache",
        },
        auth: {
          username: username,
          password: password,
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        timeout: 10 * 60 * 1000,
      }),
    3
  );
}
