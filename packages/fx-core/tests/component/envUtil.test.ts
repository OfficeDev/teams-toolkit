import { hooks } from "@feathersjs/hooks/lib";
import { FxError, Inputs, ok, Platform, Result, Settings } from "@microsoft/teamsfx-api";
import { assert } from "chai";
import fs from "fs-extra";
import "mocha";
import * as sinon from "sinon";
import { envUtil } from "../../src/component/utils/envUtil";
import { settingsUtil } from "../../src/component/utils/settingsUtil";
import { LocalCrypto } from "../../src/core/crypto";
import { EnvLoaderMW, EnvWriterMW } from "../../src/component/middleware/envMW";
import { ContextInjectorMW } from "../../src/core/middleware/contextInjector";
import { CoreHookContext } from "../../src/core/types";
describe("env utils", () => {
  const sandbox = sinon.createSandbox();
  const cryptoProvider = new LocalCrypto("mockProjectId");
  const decrypted = "123";
  const mockSettings: Settings = {
    projectId: "mockProjectId",
    version: "1",
    isFromSample: false,
  };
  afterEach(() => {
    sandbox.restore();
  });
  it("envUtil.readEnv", async () => {
    const encRes = await cryptoProvider.encrypt(decrypted);
    if (encRes.isErr()) throw encRes.error;
    const encrypted = encRes.value;
    sandbox.stub(fs, "readFile").resolves(("SECRET_ABC=" + encrypted) as any);
    sandbox.stub(settingsUtil, "readSettings").resolves(ok(mockSettings));
    const res = await envUtil.readEnv(".", "dev");
    assert.isTrue(res.isOk());
    assert.equal(process.env.SECRET_ABC, decrypted);
  });
  it("envUtil.writeEnv", async () => {
    let value = "";
    sandbox.stub(fs, "writeFile").callsFake(async (file: fs.PathLike | number, data: any) => {
      value = data as string;
      return Promise.resolve();
    });
    sandbox.stub(settingsUtil, "readSettings").resolves(ok(mockSettings));
    const map = new Map<string, string>();
    map.set("SECRET_ABC", decrypted);
    const res = await envUtil.writeEnv(".", "dev", map);
    assert.isTrue(res.isOk());
    value = value!.substr("SECRET_ABC=".length);
    const decRes = await cryptoProvider.decrypt(value);
    if (decRes.isErr()) throw decRes.error;
    assert.isTrue(decRes.isOk());
    assert.equal(decRes.value, decrypted);
  });

  it("EnvLoaderMW", async () => {
    const encRes = await cryptoProvider.encrypt(decrypted);
    if (encRes.isErr()) throw encRes.error;
    const encrypted = encRes.value;
    sandbox.stub(fs, "readFile").resolves(("SECRET_ABC=" + encrypted) as any);
    sandbox.stub(settingsUtil, "readSettings").resolves(ok(mockSettings));
    class MyClass {
      async myMethod(inputs: Inputs): Promise<Result<any, FxError>> {
        return ok(undefined);
      }
    }
    hooks(MyClass, {
      myMethod: [EnvLoaderMW],
    });
    const my = new MyClass();
    const inputs = {
      platform: Platform.VSCode,
      projectPath: ".",
      env: "dev",
    };
    const res = await my.myMethod(inputs);
    assert.isTrue(res.isOk());
    assert.equal(process.env.SECRET_ABC, decrypted);
  });

  it("EnvWriterMW", async () => {
    let value = "";
    sandbox.stub(fs, "writeFile").callsFake(async (file: fs.PathLike | number, data: any) => {
      value = data as string;
      return Promise.resolve();
    });
    sandbox.stub(settingsUtil, "readSettings").resolves(ok(mockSettings));
    const map = new Map<string, string>();
    map.set("SECRET_ABC", decrypted);
    class MyClass {
      async myMethod(inputs: Inputs, ctx?: CoreHookContext): Promise<Result<any, FxError>> {
        ctx!.envOutput = map;
        return ok(undefined);
      }
    }
    hooks(MyClass, {
      myMethod: [ContextInjectorMW, EnvWriterMW],
    });
    const my = new MyClass();
    const inputs = {
      platform: Platform.VSCode,
      projectPath: ".",
      env: "dev",
    };
    const res = await my.myMethod(inputs);
    assert.isTrue(res.isOk());
    value = value!.substr("SECRET_ABC=".length);
    const decRes = await cryptoProvider.decrypt(value);
    if (decRes.isErr()) throw decRes.error;
    assert.isTrue(decRes.isOk());
    assert.equal(decRes.value, decrypted);
  });
});
