import fs from "fs-extra";
import * as path from "path";
import AdmZip from "adm-zip";
import { sendRequestWithRetry } from "../../../../../common/template-utils/templatesUtils";
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
import {
  AzureInfo,
  DotnetCommands as Commands,
  DotnetPluginInfo as PluginInfo,
  RegularExpr,
} from "../constants";
import { execute } from "../../../function/utils/execute";
import { forEachFileAndDir } from "../../../function/utils/dir-walk";
import { Logger } from "../../utils/logger";
import { Messages } from "../resources/messages";
import { ProgressHelper } from "../../utils/progress-helper";
import { WebappDeployProgress as DeployProgress } from "../resources/steps";

export async function getFrameworkVersion(projectFilePath: string): Promise<string> {
  const content = await fs.readFile(projectFilePath, "utf8");
  const framework = content.match(RegularExpr.targetFramework);
  if (framework?.length) {
    return framework[0].trim();
  }
  return PluginInfo.defaultFramework;
}

export async function build(path: string, runtime: string): Promise<void> {
  ProgressHelper.progressHandler?.next(DeployProgress.steps.build);
  Logger.info(Messages.Build(path));

  const command = Commands.buildRelease(runtime);
  await runWithErrorCatchAndWrap(
    (error) => new BuildError(error),
    async () => await execute(command, path)
  );
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
  Logger.info(Messages.GenerateZip(componentPath));
  ProgressHelper.progressHandler?.next(DeployProgress.steps.generateZip);
  const zip = await runWithErrorCatchAndThrow(
    new ZipError(),
    async () => await generateZip(componentPath)
  );
  const zipContent = zip.toBuffer();

  ProgressHelper.progressHandler?.next(DeployProgress.steps.fetchCredential);
  const publishCred = await runWithErrorCatchAndThrow(
    new PublishCredentialError(),
    async () => await client.webApps.listPublishingCredentials(resourceGroupName, webAppName)
  );
  const username = publishCred.publishingUserName;
  const password = publishCred.publishingPassword;

  if (!password) {
    Logger.error(Messages.FailQueryPublishCred);
    throw new PublishCredentialError();
  }

  Logger.info(Messages.UploadZip(zipContent.length));
  ProgressHelper.progressHandler?.next(DeployProgress.steps.deploy);
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
