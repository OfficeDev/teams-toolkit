import { ConversationReference } from "botbuilder";
import { assert, use as chaiUse } from "chai";
import * as chaiPromises from "chai-as-promised";
import * as fs from "fs";
import * as sinon from "sinon";
import { ConversationReferenceStore, LocalFileStorage } from "../../../../src/notification/storage";
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

    it("read should return empty data if file not exist", async () => {
      fileExists = false;
      const data = await localFileStorage.read(["key"]);
      assert.deepStrictEqual(data, {});
    });

    it("read should return correct data", async () => {
      fileContent = `{
        "key1": "A",
        "key2": "B",
        "key3": "C"
      }`;
      fileExists = true;
      const data = await localFileStorage.read(["key1", "key2"]);
      assert.deepStrictEqual(data, { key1: "A", key2: "B" });
    });

    it("read should ignore undefined data if key not exist", async () => {
      fileContent = `{
        "key1": "A",
        "key2": "B",
        "key3": "C"
      }`;
      fileExists = true;
      const data = await localFileStorage.read(["key1", "key4"]);
      assert.deepStrictEqual(data, { key1: "A" });
    });

    it("write should persist correct data", async () => {
      fileContent = "";
      fileExists = false;
      await localFileStorage.write({ key1: "A", key2: "B" });
      assert.strictEqual(fileExists, true);
      assert.deepStrictEqual(JSON.parse(fileContent), { key1: "A", key2: "B" });
    });

    it("write should override data", async () => {
      fileContent = `{
        "key1": "1",
        "key2": "2",
        "key3": "3"
      }`;
      fileExists = true;
      await localFileStorage.write({ key1: "A", key2: "B" });
      assert.strictEqual(fileExists, true);
      assert.deepStrictEqual(JSON.parse(fileContent), { key1: "A", key2: "B", key3: "3" });
    });

    it("delete not implemented", async () => {
      let error: Error | undefined = undefined;
      try {
        await localFileStorage.delete(["key"]);
      } catch (err: unknown) {
        error = err as Error;
      }
      assert.isDefined(error);
      assert.strictEqual(error?.message, "Method not implemented.");
    });
  });

  describe("ConversationReferenceStore Tests - Node", () => {
    const storageKey = "test-storage-key";
    const storage = new TestStorage();
    const testStore = new ConversationReferenceStore(storage, storageKey);

    it("getAll should return correct data", async () => {
      storage.items = {};
      storage.items[storageKey] = {
        _a_1: {
          conversation: {
            id: "1",
            tenantId: "a",
          },
        },
      };
      const data = await testStore.getAll();
      assert.deepStrictEqual(
        data,
        new Map([
          [
            "_a_1",
            {
              conversation: {
                id: "1",
                tenantId: "a",
              },
            } as ConversationReference,
          ],
        ])
      );
    });

    it("getAll should return empty data if storage is empty", async () => {
      storage.items = {};
      const data = await testStore.getAll();
      assert.deepStrictEqual(data, new Map());
    });

    it("set should persist correct data", async () => {
      storage.items = {};
      await testStore.set({
        conversation: {
          id: "1",
          tenantId: "a",
        },
      } as ConversationReference);
      assert.deepStrictEqual(storage.items[storageKey], {
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
      storage.items[storageKey] = {
        _a_1: {
          conversation: {
            id: "1",
            tenantId: "a",
          },
        },
      };
      await testStore.delete({
        conversation: {
          id: "1",
          tenantId: "a",
        },
      } as ConversationReference);
      assert.deepStrictEqual(storage.items[storageKey], {});
    });
  });
});
