// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Constants } from "./constants";
import { GraphClientErrorMessage } from "./errors";
import { IAADPassword } from "./interfaces/IAADApplication";
import { IAADDefinition } from "./interfaces/IAADDefinition";

import axios from "axios";
const baseUrl = `https://graph.microsoft.com/v1.0`;

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace GraphClient {
  export async function createAADApp(
    graphToken: string,
    aadApp: IAADDefinition
  ): Promise<IAADDefinition> {
    if (!aadApp) {
      throw new Error(
        `${GraphClientErrorMessage.CreateFailed}: ${GraphClientErrorMessage.AppDefinitionIsNull}.`
      );
    }

    axios.defaults.headers.common["Authorization"] = `Bearer ${graphToken}`;

    const response = await axios.post(`${baseUrl}/applications`, aadApp);
    if (response && response.data) {
      const app = <IAADDefinition>response.data;

      if (app) {
        return app;
      }
    }

    throw new Error(
      `${GraphClientErrorMessage.CreateFailed}: ${GraphClientErrorMessage.EmptyResponse}.`
    );
  }

  export async function updateAADApp(
    graphToken: string,
    objectId: string,
    aadApp: IAADDefinition
  ): Promise<void> {
    if (!aadApp) {
      throw new Error(
        `${GraphClientErrorMessage.UpdateFailed}: ${GraphClientErrorMessage.AppDefinitionIsNull}.`
      );
    }

    if (!objectId) {
      throw new Error(
        `${GraphClientErrorMessage.UpdateFailed}: ${GraphClientErrorMessage.AppObjectIdIsNull}.`
      );
    }

    axios.defaults.headers.common["Authorization"] = `Bearer ${graphToken}`;

    await axios.patch(`${baseUrl}/applications/${objectId}`, aadApp);
  }

  export async function createAadAppSecret(
    graphToken: string,
    objectId: string
  ): Promise<IAADPassword> {
    if (!objectId) {
      throw new Error(
        `${GraphClientErrorMessage.UpdateFailed}: ${GraphClientErrorMessage.AppObjectIdIsNull}.`
      );
    }

    axios.defaults.headers.common["Authorization"] = `Bearer ${graphToken}`;

    const aadSecretObject = createAadAppSecretObject();

    const response = await axios.post(
      `${baseUrl}/applications/${objectId}/addPassword`,
      aadSecretObject
    );
    if (response && response.data) {
      const app = response.data;

      if (app) {
        return {
          hint: app.hint,
          id: app.keyId,
          endDate: app.endDateTime,
          startDate: app.startDateTime,
          value: app.secretText,
        } as IAADPassword;
      }
    }

    throw new Error(
      `${GraphClientErrorMessage.UpdateFailed}: ${GraphClientErrorMessage.EmptyResponse}.`
    );
  }

  function createAadAppSecretObject() {
    return {
      passwordCredential: {
        displayName: Constants.aadAppPasswordDisplayName,
      },
    };
  }
}
