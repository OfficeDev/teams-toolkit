// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ConversationReference } from "botbuilder";
import { assert, use as chaiUse } from "chai";
import * as chaiPromises from "chai-as-promised";
import * as fs from "fs";
import * as sinon from "sinon";
import { ConversationReferenceStore, LocalFileStorage } from "../../../../src/conversation/storage";
import { TestStorage } from "./testUtils";

chaiUse(chaiPromises);

describe("Notification.Storage Tests - Node", () => {
  describe("LocalFileStorage Tests - Node", () => {
    const sandbox = sinon.createSandbox();
    let fileContent = "";
    let fileExists = true;
    let localFileStorage: LocalFileStorage;

    beforeEach(() => {
      sandbox.stub(fs, "access").callsFake((path, cb) => {
        if (fileExists) {
          cb(null);
        } else {
          cb(new Error("Test file not exist"));
        }
      });
      (
        sandbox.stub(fs, "readFile") as unknown as sinon.SinonStub<
          [fs.PathOrFileDescriptor, any, (err: NodeJS.ErrnoException | null, data: string) => void],
          void
        >
      ).callsFake((path, options, cb) => {
        if (fileExists) {
          cb(null, fileContent);
        } else {
          cb(new Error("Test file not exist"), "");
        }
      });
      (
        sandbox.stub(fs, "writeFile") as unknown as sinon.SinonStub<
          [fs.PathOrFileDescriptor, string, any, fs.NoParamCallback],
          void
        >
      ).callsFake((path, data, options, cb) => {
        fileExists = true;
        fileContent = data.toString();
        cb(null);
      });
      localFileStorage = new LocalFileStorage("test");
    });

    afterEach(() => {
      sandbox.restore();
      fileContent = "";
      fileExists = false;
    });

    it("read should return undefined if file not exist", async () => {
      fileExists = false;
      const data = await localFileStorage.read("key");
      assert.isUndefined(data);
    });

    it("read should return correct data", async () => {
      fileContent = `{
        "key1": { "foo": "bar" },
        "key2": "B"
      }`;
      fileExists = true;
      const data = await localFileStorage.read("key1");
      assert.deepStrictEqual(data, { foo: "bar" });
    });

    it("read should return undefined if key not exist", async () => {
      fileContent = `{
        "key1": { "foo": "bar" },
        "key2": "B"
      }`;
      fileExists = true;
      const data = await localFileStorage.read("key3");
      assert.isUndefined(data);
    });

    it("list should return empty array if file not exist", async () => {
      fileExists = false;
      const data = await localFileStorage.list();
      assert.strictEqual(data.length, 0);
    });

    it("list should return correct data", async () => {
      fileContent = `{
        "key1": { "foo1": "bar1" },
        "key2": { "foo2": "bar2" }
      }`;
      fileExists = true;
      const data = await localFileStorage.list();
      assert.deepStrictEqual(data, [{ foo1: "bar1" }, { foo2: "bar2" }]);
    });

    it("write should persist correct data", async () => {
      fileContent = "";
      fileExists = false;
      await localFileStorage.write("key1", { foo1: "bar1" });
      assert.strictEqual(fileExists, true);
      assert.deepStrictEqual(JSON.parse(fileContent), { key1: { foo1: "bar1" } });
    });

    it("write should override data", async () => {
      fileContent = `{
        "key1": { "foo1": "bar1" },
        "key2": { "foo2": "bar2" }
      }`;
      fileExists = true;
      await localFileStorage.write("key1", { fooX: "barX" });
      assert.strictEqual(fileExists, true);
      assert.deepStrictEqual(JSON.parse(fileContent), {
        key1: { fooX: "barX" },
        key2: { foo2: "bar2" },
      });
    });

    it("delete should ignore if file not exist", async () => {
      fileContent = "";
      fileExists = false;
      await localFileStorage.delete("key");
      assert.isFalse(fileExists);
    });

    it("delete should remove correct data", async () => {
      fileContent = `{
        "key1": { "foo1": "bar1" },
        "key2": { "foo2": "bar2" }
      }`;
      fileExists = true;
      await localFileStorage.delete("key1");
      assert.strictEqual(fileExists, true);
      assert.deepStrictEqual(JSON.parse(fileContent), { key2: { foo2: "bar2" } });
    });

    it("delete should ignore if key not found", async () => {
      fileContent = `{
        "key1": { "foo1": "bar1" }
      }`;
      fileExists = true;
      await localFileStorage.delete("key2");
      assert.strictEqual(fileExists, true);
      assert.deepStrictEqual(JSON.parse(fileContent), { key1: { foo1: "bar1" } });
    });
  });

  describe("ConversationReferenceStore Tests - Node", () => {
    const storage = new TestStorage();
    const testStore = new ConversationReferenceStore(storage);

    it("check should return true if exist", async () => {
      storage.items = {};
      storage.items["_a_1"] = {
        conversation: {
          id: "1",
          tenantId: "a",
        },
      };
      const result = await testStore.check({
        channelId: "foo:bar",
        conversation: {
          id: "1",
          tenantId: "a",
        },
      } as ConversationReference);
      assert.isTrue(result);
      assert.deepStrictEqual(storage.items, {
        _a_1: {
          conversation: {
            id: "1",
            tenantId: "a",
          },
        },
      });
    });

    it("check should return false if not exist", async () => {
      storage.items = {};
      storage.items["_a_1"] = {
        conversation: {
          id: "1",
          tenantId: "a",
        },
      };
      const result = await testStore.check({
        channelId: "foo:bar",
        conversation: {
          id: "2",
          tenantId: "b",
        },
      } as ConversationReference);
      assert.isFalse(result);
      assert.deepStrictEqual(storage.items, {
        _a_1: {
          conversation: {
            id: "1",
            tenantId: "a",
          },
        },
      });
    });

    it("getAll should return correct data", async () => {
      storage.items = {};
      storage.items["_a_1"] = {
        conversation: {
          id: "1",
          tenantId: "a",
        },
      };
      const data = await testStore.getAll();
      assert.deepStrictEqual(data, [
        {
          conversation: {
            id: "1",
            tenantId: "a",
          },
        } as ConversationReference,
      ]);
    });

    it("getAll should return empty data if storage is empty", async () => {
      storage.items = {};
      const data = await testStore.getAll();
      assert.strictEqual(data.length, 0);
    });

    it("set should persist correct data", async () => {
      storage.items = {};
      await testStore.set({
        conversation: {
          id: "1",
          tenantId: "a",
        },
      } as ConversationReference);
      assert.deepStrictEqual(storage.items, {
        _a_1: {
          conversation: {
            id: "1",
            tenantId: "a",
          },
        },
      });
    });

    it("delete should remove correct data", async () => {
      storage.items = {};
      storage.items["_a_1"] = {
        conversation: {
          id: "1",
          tenantId: "a",
        },
      };
      await testStore.delete({
        conversation: {
          id: "1",
          tenantId: "a",
        },
      } as ConversationReference);
      assert.deepStrictEqual(storage.items, {});
    });
  });
});
