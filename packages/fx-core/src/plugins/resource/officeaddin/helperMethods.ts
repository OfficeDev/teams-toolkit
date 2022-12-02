import axios from "axios";
import * as fs from "fs";
import * as fse from "fs-extra";
import * as path from "path";
import * as unzip from "unzipper";
import { ManifestUtil, DevPreviewManifest } from "@microsoft/teamsfx-api";
import { getManifestTemplatePath } from "../appstudio/manifestTemplate";

const zipFile = "project.zip";

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace helperMethods {
  function deleteFolderRecursively(projectFolder: string) {
    try {
      if (fs.existsSync(projectFolder)) {
        fs.readdirSync(projectFolder).forEach(function (file) {
          const curPath = `${projectFolder}/${file}`;

          if (fs.lstatSync(curPath).isDirectory()) {
            deleteFolderRecursively(curPath);
          } else {
            fs.unlinkSync(curPath);
          }
        });
        fs.rmdirSync(projectFolder);
      }
    } catch (err) {
      throw new Error(`Unable to delete folder "${projectFolder}".\n${err}`);
    }
  }

  export function doesFolderExist(folderPath: string): boolean {
    if (fs.existsSync(folderPath)) {
      return fs.readdirSync(folderPath).length > 0;
    }
    return false;
  }

  export async function downloadProjectTemplateZipFile(
    projectFolder: string,
    projectRepo: string,
    projectBranch: string | undefined
  ): Promise<void> {
    const projectTemplateZipFile = `${projectRepo}/archive/${projectBranch}.zip`;
    return axios({
      method: "get",
      url: projectTemplateZipFile,
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
              await unzipProjectTemplate(projectFolder);
              resolve();
            });
        });
      })
      .catch((err) => {
        console.log(`Unable to download project zip file for "${projectTemplateZipFile}".\n${err}`);
      });
  }

  async function unzipProjectTemplate(projectFolder: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
      // TODO: Verify file exists
      const readStream = fs.createReadStream(`${projectFolder}/${zipFile}`);
      readStream
        .pipe(unzip.Extract({ path: projectFolder }))
        .on("error", function (err: unknown) {
          reject(`Unable to unzip project zip file for "${projectFolder}".\n${err}`);
        })
        .on("close", async () => {
          moveUnzippedFiles(projectFolder);
          resolve();
        });
    });
  }

  function moveUnzippedFiles(projectFolder: string): void {
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
    copyAddinFiles(fromFolder, projectFolder);

    // delete project zipped folder
    deleteFolderRecursively(fromFolder);
  }

  export function copyAddinFiles(fromFolder: string, toFolder: string): void {
    fse.copySync(fromFolder, toFolder, {
      filter: (path) => {
        const module: boolean = path.includes("node_modules");
        const ignore: boolean = path.includes(".gitignore");
        return !module && !ignore;
      },
    });
  }

  export async function updateManifest(
    projectRoot: string,
    addinManifestPath: string
  ): Promise<void> {
    // Read add-in manifest file
    const addinManifest: DevPreviewManifest = await ManifestUtil.loadFromPath(addinManifestPath);

    // Open project manifest file
    const manifestTemplatePath = await getManifestTemplatePath(projectRoot);
    const manifest: DevPreviewManifest = await ManifestUtil.loadFromPath(manifestTemplatePath);

    // Update project manifest
    manifest.extensions = addinManifest.extensions;
    manifest.authorization = addinManifest.authorization;

    // Safe project manifest
    await ManifestUtil.writeToPath(manifestTemplatePath, manifest);
  }
}
