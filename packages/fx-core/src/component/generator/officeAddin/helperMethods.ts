import axios from "axios";
import fs from "fs";
import * as fse from "fs-extra";
import * as path from "path";
import * as unzip from "unzipper";
import { ManifestUtil, devPreview } from "@microsoft/teamsfx-api";
import { manifestUtils } from "../../resource/appManifest/utils/ManifestUtils";

const zipFile = "project.zip";

export class HelperMethods {
  static async downloadProjectTemplateZipFile(
    projectFolder: string,
    projectRepo: string,
    projectBranch?: string
  ): Promise<void> {
    const projectTemplateZipFile = `${projectRepo}/archive/${projectBranch}.zip`;
    return axios
      .get(projectTemplateZipFile, {
        responseType: "stream",
      })
      .then((response) => {
        return new Promise<void>((resolve, reject) => {
          response.data
            .pipe(fs.createWriteStream(`${projectFolder}/${zipFile}`))
            .on("error", function (err: unknown) {
              reject(
                `Unable to download project zip file for "${projectTemplateZipFile}".\n${err}`
              );
            })
            .on("close", async () => {
              await HelperMethods.unzipProjectTemplate(projectFolder);
              resolve();
            });
        });
      })
      .catch((err) => {
        console.log(`Unable to download project zip file for "${projectTemplateZipFile}".\n${err}`);
      });
  }

  static async unzipProjectTemplate(projectFolder: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
      // TODO: Verify file exists
      const readStream = fs.createReadStream(`${projectFolder}/${zipFile}`);
      readStream
        .pipe(unzip.Extract({ path: projectFolder }))
        .on("error", function (err: unknown) {
          reject(`Unable to unzip project zip file for "${projectFolder}".\n${err}`);
        })
        .on("close", async () => {
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
    const manifestTemplatePath = await manifestUtils.getTeamsAppManifestPath(projectRoot);
    const manifest: devPreview.DevPreviewSchema = await ManifestUtil.loadFromPath(
      manifestTemplatePath
    );

    // Update project manifest
    manifest.extensions = addinManifest.extensions;
    manifest.authorization = addinManifest.authorization;

    // Safe project manifest
    await ManifestUtil.writeToPath(manifestTemplatePath, manifest);
  }
}
