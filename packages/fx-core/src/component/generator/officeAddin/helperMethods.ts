// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author darrmill@microsoft.com, yefuwang@microsoft.com
 */
import { ManifestUtil, devPreview } from "@microsoft/teamsfx-api";
import fs from "fs";
import fse from "fs-extra";
import * as path from "path";
import * as unzip from "unzipper";
import { manifestUtils } from "../../driver/teamsApp/utils/ManifestUtils";

const zipFile = "project.zip";

export class HelperMethods {
  static async downloadProjectTemplateZipFile(
    projectFolder: string,
    projectRepo: string,
    projectBranch?: string
  ): Promise<void> {
    const projectTemplateZipFile = `${projectRepo}/archive/${projectBranch || ""}.zip`;
    const writeFileStream = fs.createWriteStream(path.resolve(projectFolder, zipFile));
    const response = await fetch(projectTemplateZipFile, { method: "GET" });
    const reader = response.body?.getReader();
    if (reader) {
      while (true) {
        const res = await reader.read();
        if (res.value) {
          writeFileStream.write(res.value);
        }
        if (res.done) {
          break;
        }
      }
      writeFileStream.close();
      await HelperMethods.unzipProjectTemplate(projectFolder);
    }
  }

  static async unzipProjectTemplate(projectFolder: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // TODO: Verify file exists
      const readStream = fs.createReadStream(path.resolve(`${projectFolder}/${zipFile}`));
      readStream
        .pipe(unzip.Extract({ path: projectFolder }))
        .on("error", function (err: unknown) {
          // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
          reject(`Unable to unzip project zip file for "${projectFolder}".\n${err}`);
        })
        .on("close", () => {
          HelperMethods.moveUnzippedFiles(projectFolder);
          resolve();
        });
    });
  }

  static moveUnzippedFiles(projectFolder: string): void {
    // delete original zip file
    const zipFilePath = path.resolve(`${projectFolder}/${zipFile}`);
    if (fs.existsSync(zipFilePath)) {
      fs.unlinkSync(zipFilePath);
    }

    // get path to unzipped folder
    const unzippedFolder = fs.readdirSync(projectFolder).filter(function (file) {
      return fs.statSync(`${projectFolder}/${file}`).isDirectory();
    });

    // construct paths to move files out of unzipped folder into project root folder
    const fromFolder = path.resolve(`${projectFolder}/${unzippedFolder[0]}`);
    HelperMethods.copyAddinFiles(fromFolder, projectFolder);

    // delete project zipped folder
    fs.rmSync(fromFolder, { recursive: true, force: true });
  }

  static copyAddinFiles(fromFolder: string, toFolder: string): void {
    fse.copySync(fromFolder, toFolder, {
      filter: (path) => !path.includes("node_modules"),
    });
  }

  static async updateManifest(projectRoot: string, addinManifestPath: string): Promise<void> {
    // Read add-in manifest file
    const addinManifest: devPreview.DevPreviewSchema = await ManifestUtil.loadFromPath(
      addinManifestPath
    );

    // Open project manifest file
    const manifestTemplatePath = manifestUtils.getTeamsAppManifestPath(projectRoot);
    if (!(await fse.pathExists(manifestTemplatePath))) {
      return;
    }
    const manifest: devPreview.DevPreviewSchema = await ManifestUtil.loadFromPath(
      manifestTemplatePath
    );

    // Update project manifest
    manifest.extensions = addinManifest.extensions;
    manifest.authorization = addinManifest.authorization;

    // Save project manifest
    await ManifestUtil.writeToPath(manifestTemplatePath, manifest);
  }

  // Move the manifest.json and assets to appPackage folder and update related files.
  static async moveManifestLocation(
    projectRoot: string,
    manifestRelativePath: string
  ): Promise<void> {
    const manifestPath = path.join(projectRoot, manifestRelativePath);
    if (await fse.pathExists(manifestPath)) {
      if (!(await fse.pathExists(path.join(projectRoot, "appPackage")))) {
        await fse.mkdir(path.join(projectRoot, "appPackage"));
      }
      await fse.rename(manifestPath, path.join(projectRoot, "appPackage", "manifest.json"));

      const packageJsonPath = path.join(projectRoot, "package.json");
      if (await fse.pathExists(packageJsonPath)) {
        const content = (await fse.readFile(packageJsonPath)).toString();
        const reg = /\smanifest\.json\"/g;
        const data = content.replace(reg, ` appPackage/manifest.json"`);
        await fse.writeFile(packageJsonPath, data);
      }

      const assetsPath = path.join(projectRoot, "assets");
      if (await fse.pathExists(assetsPath)) {
        await fse.move(assetsPath, path.join(projectRoot, "appPackage", "assets"));
      }

      const webpackConfigPath = path.join(projectRoot, "webpack.config.js");
      if (await fse.pathExists(webpackConfigPath)) {
        const content = (await fse.readFile(webpackConfigPath)).toString();
        const manifestReg = /\"manifest\*\.json\"/g;
        const assetsReg = /\"assets\/\*\"/g;
        const data = content
          .replace(manifestReg, `"appPackage/manifest*.json"`)
          .replace(assetsReg, `"appPackage/assets/*"`);

        await fse.writeFile(webpackConfigPath, data);
      }

      const htmlPath = path.join(projectRoot, "src", "taskpane", "taskpane.html");
      if (await fse.pathExists(htmlPath)) {
        const content = (await fse.readFile(htmlPath)).toString();
        const assetsReg = /\/assets\//g;
        const data = content.replace(assetsReg, `/appPackage/assets/`);

        await fse.writeFile(htmlPath, data);
      }
    }
  }
}
