// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author darrmill@microsoft.com, yefuwang@microsoft.com
 */
import { ManifestUtil, devPreview } from "@microsoft/teamsfx-api";
import fs from "fs";
import fse from "fs-extra";
import fetch from "node-fetch";
import * as path from "path";
import * as unzip from "unzipper";
import { Entry } from "unzipper";
import { AccessGithubError, ReadFileError, WriteFileError } from "../../../error/common";
import { manifestUtils } from "../../driver/teamsApp/utils/ManifestUtils";

const zipFile = "project.zip";

export class HelperMethods {
  static async fetchAndUnzip(
    component: string,
    zipUrl: string,
    targetDir: string,
    skipRootFolder = true
  ): Promise<void> {
    let response: any;
    try {
      response = await fetch(zipUrl, { method: "GET" });
    } catch (e: any) {
      throw new AccessGithubError(zipUrl, component, e);
    }
    if (!response.ok) {
      throw new AccessGithubError(
        zipUrl,
        component,
        new Error(
          `Failed to fetch GitHub URL: ${response.status as string} ${
            response.statusText as string
          }`
        )
      );
    }
    const zipStream = response.body;
    let rootFolderName: string;
    await new Promise<void>((resolve, reject) => {
      zipStream
        .pipe(unzip.Parse())
        .on("entry", (entry: Entry) => {
          if (skipRootFolder && !rootFolderName) {
            rootFolderName = entry.path;
            return;
          }
          const targetPath = path.join(targetDir, entry.path.replace(rootFolderName, ""));
          console.log(`Extracting 'zip://${entry.path}' to '${targetPath}'`);
          if (entry.type === "Directory") {
            fs.mkdirSync(targetPath, { recursive: true });
          } else {
            entry
              .pipe(fs.createWriteStream(targetPath))
              .on("finish", () => {})
              .on("error", (err: Error) => {
                new WriteFileError(err, component);
              });
          }
        })
        .on("error", (err: Error) => reject(new ReadFileError(err, component)))
        .on("finish", () => resolve());
    });
  }
  static async downloadProjectTemplateZipFile(
    projectFolder: string,
    projectRepo: string
  ): Promise<void> {
    const projectTemplateZipFile = projectRepo;
    let response: any;
    try {
      response = await fetch(projectTemplateZipFile, { method: "GET" });
    } catch (e: any) {
      throw new AccessGithubError(projectTemplateZipFile, "OfficeAddinGenerator", e);
    }

    return new Promise<void>((resolve, reject) => {
      if (response.body) {
        response.body
          .pipe(fs.createWriteStream(path.resolve(projectFolder, zipFile)))
          .on("error", (err: Error) => {
            reject(new AccessGithubError(projectTemplateZipFile, "OfficeAddinGenerator", err));
          })
          .on("close", () => {
            HelperMethods.unzipProjectTemplate(projectFolder)
              .then(() => {
                resolve();
              })
              .catch((err) => {
                reject(err);
              });
          });
      } else {
        reject(
          new AccessGithubError(
            projectTemplateZipFile,
            "OfficeAddinGenerator",
            new Error(`Response body of GET "${projectTemplateZipFile}" is null.`)
          )
        );
      }
    });
  }

  static async unzipProjectTemplate(projectFolder: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // TODO: Verify file exists
      const readStream = fs.createReadStream(path.resolve(`${projectFolder}/${zipFile}`));
      readStream
        .pipe(unzip.Extract({ path: projectFolder }))
        .on("error", function (err: Error) {
          unzipErrorHandler(projectFolder, reject, err);
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

export function unzipErrorHandler(projectFolder: string, reject: any, error: Error): void {
  if (error.message) {
    error.message = `Unable to unzip project zip file for "${projectFolder}", reason: ${error.message}`;
  }
  reject(new ReadFileError(error, "OfficeAddinGenerator"));
}
