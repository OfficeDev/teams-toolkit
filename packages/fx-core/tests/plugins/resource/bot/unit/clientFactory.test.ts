// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";
import * as chai from "chai";

import { ensureResourceProvider } from "../../../../../src/plugins/resource/bot/clientFactory";
import { generateFakeServiceClientCredentials } from "./utils";

describe("Client Factory", () => {
  describe("create", () => {
    it("Test ensureResourceProvider with existence", async () => {
      // Arrange
      const item: any = { registrationState: "Registered" };
      const namespace = ["ut"];
      const credentials = generateFakeServiceClientCredentials();
      const client: any = {
        get: (namespace: string) => item,
        register: (namespace: string) => item,
      };

      // Act
      const res = await ensureResourceProvider(client, namespace);

      // Assert
      chai.assert.deepEqual(res, [item]);
    });

    it("Test ensureResourceProvider", async () => {
      // Arrange
      let item: any = { registrationState: "Unregistered" };
      const namespace = ["ut"];
      const client: any = {
        get: (namespace: string) => item,
        register: (namespace: string) => {
          item = {};
          item = { ...item, $namespace: { registrationState: "Registered" } };
          return item;
        },
      };

      // Act
      const res = await ensureResourceProvider(client, namespace);

      // Assert
      chai.assert.deepEqual(res, [item]);
    });
  });
});
