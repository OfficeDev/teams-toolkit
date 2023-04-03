import { AADApplication } from "./interfaces/AADApplication";
import { AADManifest } from "./interfaces/AADManifest";
import { AadManifestHelper } from "./utils/aadManifestHelper";
import axios, { AxiosInstance } from "axios";
import { AadManifestLoadError, GraphClientErrorMessage } from "./errors";
import { ResultFactory } from "./results";
import { Constants } from "./constants";
import { PluginContext } from "@microsoft/teamsfx-api/build/context";
import { v4 as uuidv4 } from "uuid";
import * as fs from "fs-extra";
import Mustache from "mustache";
import { getAppDirectory } from "../../../common/tools";
import { AppPackageFolderName, BuildFolderName } from "@microsoft/teamsfx-api";
import * as path from "path";
import { FileNotFoundError } from "../../../error/common";

const baseUrl = `https://graph.microsoft.com/v1.0`;

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace AadAppManifestManager {
  export async function createAadApp(
    graphToken: string,
    manifest: AADManifest
  ): Promise<AADManifest> {
    const instance = initAxiosInstance(graphToken);
    const aadApp = AadManifestHelper.manifestToApplication(manifest);
    deleteUnusedProperties(aadApp);
    const response = await instance.post(`${baseUrl}/applications`, aadApp);
    if (response && response.data) {
      const app = <AADApplication>response.data;
      if (app) {
        return AadManifestHelper.applicationToManifest(app);
      }
    }
    throw new Error(
      `${GraphClientErrorMessage.CreateFailed}: ${GraphClientErrorMessage.EmptyResponse}.`
    );
  }

  export async function updateAadApp(
    graphToken: string,
    manifest: AADManifest
  ): Promise<AADManifest> {
    const instance = initAxiosInstance(graphToken);
    const aadApp = AadManifestHelper.manifestToApplication(manifest);
    deleteUnusedProperties(aadApp);
    await instance.patch(`${baseUrl}/applications/${manifest.id}`, aadApp);
    return manifest;
  }

  export async function getAadAppManifest(
    graphToken: string,
    objectId: string
  ): Promise<AADManifest> {
    if (!objectId) {
      throw new Error(
        `${GraphClientErrorMessage.GetFailed}: ${GraphClientErrorMessage.AppObjectIdIsNull}.`
      );
    }

    const instance = initAxiosInstance(graphToken);
    const response = await instance.get(`${baseUrl}/applications/${objectId}`);
    if (response && response.data) {
      const app = <AADApplication>response.data;
      return AadManifestHelper.applicationToManifest(app);
    }

    throw new Error(
      `${GraphClientErrorMessage.GetFailed}: ${GraphClientErrorMessage.EmptyResponse}.`
    );
  }

  export function initAxiosInstance(graphToken: string): AxiosInstance {
    const instance = axios.create({
      baseURL: baseUrl,
    });
    instance.defaults.headers.common["Authorization"] = `Bearer ${graphToken}`;
    return instance;
  }

  export async function loadAadManifest(ctx: PluginContext): Promise<AADManifest> {
    const appDir = await getAppDirectory(ctx.root);
    const manifestFilePath = `${appDir}/${Constants.aadManifestTemplateName}`;
    if (!(await fs.pathExists(manifestFilePath))) {
      throw new FileNotFoundError("loadAadManifest", manifestFilePath);
    }

    try {
      let manifestString = await fs.readFile(manifestFilePath, "utf8");
      const stateObject = JSON.parse(JSON.stringify(fromEntries(ctx.envInfo.state)));
      const aadKey = "fx-resource-aad-app-for-teams";
      if (!stateObject[aadKey].oauth2PermissionScopeId) {
        stateObject[aadKey].oauth2PermissionScopeId = uuidv4();
      }

      const view = {
        config: ctx.envInfo.config,
        state: stateObject,
        env: process.env,
      };

      Mustache.escape = (value) => value;
      manifestString = Mustache.render(manifestString, view, undefined, {});
      const manifest: AADManifest = JSON.parse(manifestString);
      manifest.identifierUris = manifest.identifierUris.filter((item) => !!item);
      manifest.replyUrlsWithType = manifest.replyUrlsWithType.filter((item) =>
        isValidURL(item.url)
      );

      AadManifestHelper.processRequiredResourceAccessInManifest(manifest);
      const warningMsg = AadManifestHelper.validateManifest(manifest);
      if (warningMsg) {
        warningMsg.split("\n").forEach((warning) => {
          ctx.logProvider?.warning(warning);
        });
      }
      return manifest;
    } catch (e: any) {
      if (
        e.stack &&
        (e.stack.startsWith("SyntaxError") ||
          e.stack.indexOf("Unknown resourceAccess") >= 0 ||
          e.stack.indexOf("Unknown resourceAppId") >= 0)
      ) {
        throw ResultFactory.UserError(
          AadManifestLoadError.name,
          AadManifestLoadError.message(manifestFilePath, e.message)
        );
      }
      throw ResultFactory.SystemError(
        AadManifestLoadError.name,
        AadManifestLoadError.message(manifestFilePath, e.message)
      );
    }
  }

  export async function writeManifestFileToBuildFolder(
    manifest: AADManifest,
    ctx: PluginContext
  ): Promise<void> {
    const aadManifestPath = `${ctx.root}/${BuildFolderName}/${AppPackageFolderName}/aad.${ctx.envInfo.envName}.json`;
    const manifestString = JSON.stringify(manifest, null, 4);
    await fs.ensureDir(path.dirname(aadManifestPath));
    await fs.writeFile(aadManifestPath, manifestString, "utf8");
  }

  function fromEntries(iterable: Map<string, any>) {
    return [...iterable].reduce((obj, [key, val]) => {
      (obj as any)[key] = val;
      return obj;
    }, {});
  }

  function deleteUnusedProperties(aadApp: AADApplication) {
    delete aadApp.id;
    delete aadApp.appId;
    aadApp.api?.oauth2PermissionScopes?.forEach((item) => {
      delete (item as any).lang;
      delete (item as any).origin;
    });
  }

  function isValidURL(url: string) {
    try {
      const urlObj = new URL(url);

      // "customSchema://" is valid URL but not a valid redirect URL
      if (urlObj.protocol !== "http:" && urlObj.protocol !== "https:") {
        // trim end "/" characters
        const trimmedUrl = url.replace(/\/+$/g, "");
        if (trimmedUrl.endsWith(":")) {
          return false;
        } else {
          return true;
        }
      }

      return true;
    } catch (err) {
      return false;
    }
  }
}
