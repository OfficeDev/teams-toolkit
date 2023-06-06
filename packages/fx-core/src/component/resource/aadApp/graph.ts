// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { GraphClientErrorMessage } from "./errors";

import axios from "axios";
import { AadOwner } from "../../../common/permissionInterface";
const baseUrl = `https://graph.microsoft.com/v1.0`;

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace GraphClient {
  export async function getAadOwners(
    graphToken: string,
    objectId: string
  ): Promise<AadOwner[] | undefined> {
    if (!objectId) {
      throw new Error(
        `${GraphClientErrorMessage.CheckPermissionFailed}: ${GraphClientErrorMessage.AppObjectIdIsNull}.`
      );
    }
    const instance = initAxiosInstance(graphToken);
    const response = await instance.get(`${baseUrl}/applications/${objectId}/owners`);

    const aadOwners: AadOwner[] = [];
    if (response && response.data && response.data.value) {
      for (const aadOwner of response.data.value) {
        aadOwners.push({
          userObjectId: aadOwner.id,
          resourceId: objectId,
          displayName: aadOwner.displayName,
          // For guest account, aadOwner.userPrincipalName will contains "EXT", thus use mail instead.
          userPrincipalName: aadOwner.mail ?? aadOwner.userPrincipalName,
        });
      }
      return aadOwners;
    }

    return undefined;
  }

  export async function checkPermission(
    graphToken: string,
    objectId: string,
    userObjectId: string
  ): Promise<boolean> {
    if (!userObjectId) {
      throw new Error(
        `${GraphClientErrorMessage.CheckPermissionFailed}: ${GraphClientErrorMessage.UserObjectIdIsNull}.`
      );
    }

    const owners = await getAadOwners(graphToken, objectId);
    const findUser = owners?.find((owner: AadOwner) => owner.userObjectId === userObjectId);
    if (findUser) {
      return true;
    } else {
      return false;
    }
  }

  export async function grantPermission(
    graphToken: string,
    objectId: string,
    userObjectId: string
  ): Promise<void> {
    if (!objectId) {
      throw new Error(
        `${GraphClientErrorMessage.GrantPermissionFailed}: ${GraphClientErrorMessage.AppObjectIdIsNull}.`
      );
    }

    if (!userObjectId) {
      throw new Error(
        `${GraphClientErrorMessage.GrantPermissionFailed}: ${GraphClientErrorMessage.UserObjectIdIsNull}.`
      );
    }

    const instance = initAxiosInstance(graphToken);
    await instance.post(`${baseUrl}/applications/${objectId}/owners/$ref`, {
      "@odata.id": `${baseUrl}/directoryObjects/${userObjectId}`,
    });
  }

  export function initAxiosInstance(graphToken: string) {
    const instance = axios.create({
      baseURL: baseUrl,
    });
    instance.defaults.headers.common["Authorization"] = `Bearer ${graphToken}`;
    return instance;
  }
}
