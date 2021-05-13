// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import axios, { AxiosInstance } from "axios";

import MockGraphTokenProvider from "./mockGraphTokenProvider";
import { GraphTokenProvider } from "../utils/login";

interface IAadAppInfo {
  displayName: string;
  id: string;
  appId: string;
  createdDateTime: string;
  deletedDateTime: string;
}

function delay(ms: number) {
  // tslint:disable-next-line no-string-based-set-timeout
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class AadManager {
  private static instance: AadManager;

  private static axios?: AxiosInstance;

  private static provider?: GraphTokenProvider;

  private constructor() {
    AadManager.axios = undefined;
    AadManager.provider = undefined;
  }

  public static async init(provider?: GraphTokenProvider): Promise<AadManager> {
    if (!AadManager.instance) {
      AadManager.instance = new AadManager();
    }
    if (AadManager.provider !== (provider || MockGraphTokenProvider)) {
      AadManager.provider = provider || MockGraphTokenProvider;
      const token = await AadManager.provider.getAccessToken();
      AadManager.axios = axios.create({
        baseURL: "https://graph.microsoft.com/v1.0/",
        headers: {
          authorization: `Bearer ${token}`,
          ConsistencyLevel: "eventual",
          "content-type": "application/json",
        },
      });
    }
    return Promise.resolve(AadManager.instance);
  }

  public async searchAliveAadApps(prefix: string, offsetHour = 0): Promise<IAadAppInfo[]> {
    const result = await AadManager.axios!.get(
      `applications?$filter=startswith(displayName, '${prefix}')&$count=true&$top=100&$orderby=displayName`
    );
    const apps = result.data.value as IAadAppInfo[];
    return Promise.resolve(
      apps.filter(
        (app) => Date.now() - new Date(app.createdDateTime).getTime() > offsetHour * 3600 * 1000
      )
    );
  }

  public async searchDeletedAadApps(prefix: string, offsetHour = 0): Promise<IAadAppInfo[]> {
    const result = await AadManager.axios!.get(
      `directory/deleteditems/microsoft.graph.application?$filter=startswith(displayName, '${prefix}')&$count=true&$top=100&$orderby=displayName`
    );
    const apps = result.data.value as IAadAppInfo[];
    return Promise.resolve(
      apps.filter(
        (app) => Date.now() - new Date(app.createdDateTime).getTime() > offsetHour * 3600 * 1000
      )
    );
  }

  public async searchAadApps(contain: string, offsetHour = 0): Promise<IAadAppInfo[]> {
    return new Promise<IAadAppInfo[]>(async (resolve) => {
      const [aliveAadApps, deletedAadApps] = await Promise.all([
        this.searchAliveAadApps(contain, offsetHour),
        this.searchDeletedAadApps(contain, offsetHour),
      ]);
      return resolve(aliveAadApps.concat(deletedAadApps));
    });
  }

  public async deleteAadAppById(id: string, retryTimes = 5) {
    return new Promise<boolean>(async (resolve) => {
      try {
        await AadManager.axios!.delete(`applications/${id}`);
      } finally {
        for (let i = 0; i < retryTimes; ++i) {
          try {
            await AadManager.axios!.delete(`directory/deletedItems/${id}`);
            return resolve(true);
          } catch {
            await delay(2000);
            if (i < retryTimes - 1) {
              console.warn(`[Retry] clean up the Aad app failed with id: ${id}`);
            }
          }
        }
        return resolve(false);
      }
    });
  }

  public async deleteAadApps(contain: string, offsetHour = 0, retryTimes = 5) {
    const aadApps = await this.searchAadApps(contain, offsetHour);
    console.log(
      `There are ${aadApps.length} Aad apps created ${offsetHour.toFixed(2)} hours ago. Deleting...`
    );

    const promises = aadApps.map((app) => this.deleteAadAppById(app.id, retryTimes));
    const results = await Promise.all(promises);
    results.forEach((result, index) => {
      if (result) {
        console.log(
          `[Sucessfully] clean up the Aad app with id: ${aadApps[index].id}, appId: ${aadApps[index].appId}`
        );
      } else {
        console.log(
          `[Failed] no permission to clean up the Aad app with id: ${aadApps[index].id}, appId: ${aadApps[index].appId}`
        );
      }
    });
  }
}
