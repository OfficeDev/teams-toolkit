import { AADApplication } from "./interfaces/AADApplication";
import { AADManifest } from "./interfaces/AADManifest";
import { AadManifestHelper } from "./utils/aadManifestHelper";
import axios, { AxiosInstance } from "axios";
import { GraphClientErrorMessage } from "./errors";

const baseUrl = `https://graph.microsoft.com/v1.0`;

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace AadAppManifestManager {
  export async function createAadApp(
    graphToken: string,
    manifest: AADManifest
  ): Promise<AADManifest> {
    const instance = initAxiosInstance(graphToken);
    const aadApp = AadManifestHelper.manifestToApplication(manifest);
    delete aadApp.id;
    delete aadApp.appId;
    try {
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
    } catch (err: any) {
      let errMsg = err.toString();
      if (err?.response?.data?.error?.message) {
        errMsg = err.response.data.error.message;
      }
      throw new Error(`${GraphClientErrorMessage.CreateFailed}: ${errMsg}.`);
    }
  }

  export async function updateAadApp(
    graphToken: string,
    manifest: AADManifest
  ): Promise<AADManifest> {
    const instance = initAxiosInstance(graphToken);
    const aadApp = AadManifestHelper.manifestToApplication(manifest);
    delete aadApp.id;
    delete aadApp.appId;
    try {
      await instance.patch(`${baseUrl}/applications/${manifest.id}`, aadApp);
      return manifest;
    } catch (err: any) {
      let errMsg = err.toString();
      if (err?.response?.data?.error?.message) {
        errMsg = err.response.data.error.message;
      }
      throw new Error(`${GraphClientErrorMessage.CreateFailed}:${errMsg}`);
    }
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
}
