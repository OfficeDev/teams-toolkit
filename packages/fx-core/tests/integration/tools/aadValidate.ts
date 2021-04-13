// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import * as chai from "chai";
import { MockAppStudioTokenProvider } from "./appstudio";
import {
  IAADDefinition,
  IAadObject,
  IAadObjectLocal,
} from "./interfaces/IAADDefinition";
const axios = require("axios");

const aadPluginName: string = "mods-toolkit-plugin-aad-app-for-teams";
const baseUrl: string = "https://dev.teams.microsoft.com/api/aadapp/v2";

function delay(ms: number) {
  // tslint:disable-next-line no-string-based-set-timeout
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class AadValidator {
  public static init(ctx: {}, isLocalDebug: boolean = false): IAadObject {
    console.log("Start to init validator for Azure AD app.");

    let aadObject: IAadObject | undefined = AadValidator.parseConfig(
      ctx[aadPluginName],
      isLocalDebug
    );
    chai.assert.exists(aadObject);

    console.log("Successfully init validator for Azure AD app.");
    return aadObject!;
  }

  public static async validate(aadObject: IAadObject) {
    console.log("Start to validate Azure AD app.");

    let groundTruth = await AadValidator.getAadApp(aadObject.objectId);
    console.log(groundTruth);
    chai.assert.exists(groundTruth);

    chai.assert(aadObject.clientId, groundTruth?.appId);
    chai.assert(
      aadObject.oauth2PermissionScopeId,
      groundTruth?.api?.oauth2PermissionScopes![0].id
    );
    chai.assert(aadObject.applicationIdUris, groundTruth?.identifierUris![0]);

    console.log("Successfully validate Azure AD app.");
  }

  private static parseConfig(
    aad: Object,
    isLocalDebug: boolean
  ): IAadObject | undefined {
    if (!isLocalDebug) {
      return <IAadObject>aad;
    } else {
      let localObject = <IAadObjectLocal>aad;
      return AadValidator.objectTransform(localObject);
    }
  }

  private static async getAadApp(objectId: string) {
    let tokenProvider = MockAppStudioTokenProvider.getInstance();
    let token = await tokenProvider.getAccessToken();

    let retries = 10;
    while (retries > 0) {
      try {
        retries = retries - 1;
        axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
        const aadGetResponse = await axios.get(`${baseUrl}/${objectId}`);
        if (
          aadGetResponse &&
          aadGetResponse.data &&
          aadGetResponse.data["identifierUris"][0]
        ) {
          return <IAADDefinition>aadGetResponse.data;
        }
      } catch (error) {
        console.log(error);
      }

      await delay(10000);
    }

    return undefined;
  }

  private static objectTransform(localObject: IAadObjectLocal): IAadObject {
    return {
      clientId: localObject.local_clientId,
      clientSecret: localObject.local_clientSecret,
      objectId: localObject.local_objectId,
      oauth2PermissionScopeId: localObject.local_oauth2PermissionScopeId,
      applicationIdUris: localObject.local_applicationIdUris,
      oauthAuthority: localObject.oauthAuthority,
      teamsMobileDesktopAppId: localObject.teamsMobileDesktopAppId,
      teamsWebAppId: localObject.teamsWebAppId,
    } as IAadObject;
  }
}

export async function deleteAadApp(ctx: object) {
  let tokenProvider = MockAppStudioTokenProvider.getInstance();
  let token = await tokenProvider.getAccessToken();

  let objectId: string = (<IAadObject>ctx[aadPluginName]).objectId;
  axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  await axios.delete(`${baseUrl}/${objectId}`);
}
