import * as fs from "fs-extra";
import * as path from "path";
import AdmZip from "adm-zip";
import { forEachFileAndDir } from "../utils/dir-walk";
import { sendRequestWithRetry } from "../../../../common/templatesUtils";
import axios from "axios";
import {
  runWithErrorCatchAndThrow,
  ZipError,
  PublishCredentialError,
  UploadZipError,
  BuildError,
  runWithErrorCatchAndWrap,
} from "../resources/errors";
import { WebSiteManagementClient } from "@azure/arm-appservice";
import { AzureInfo, BlazorCommands as Commands } from "../constants";
import { execute } from "../utils/execute";

export async function build(path: string, runtime: string) {
  const command = Commands.buildRelease(runtime);
  await runWithErrorCatchAndWrap(
    (error) => new BuildError(error),
    async () => await execute(command, path)
  );
}

export async function generateZip(componentPath: string) {
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
) {
  const zip = await runWithErrorCatchAndThrow(
    new ZipError(),
    async () => await generateZip(componentPath)
  );
  const zipContent = zip.toBuffer();

  const publishCred = await runWithErrorCatchAndThrow(
    new PublishCredentialError(),
    async () => await client.webApps.listPublishingCredentials(resourceGroupName, webAppName)
  );
  const username = publishCred.publishingUserName;
  const password = publishCred.publishingPassword;

  if (!password) {
    // TODO: Logger.error("Filaed to query publish cred.");
    throw new PublishCredentialError();
  }

  await runWithErrorCatchAndThrow(
    new UploadZipError(),
    async () =>
      await sendRequestWithRetry(
        async () =>
          await axios.post(AzureInfo.zipDeployURL(webAppName), zipContent, {
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
      )
  );
}
