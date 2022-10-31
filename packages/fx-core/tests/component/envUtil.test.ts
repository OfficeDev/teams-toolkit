import { hooks } from "@feathersjs/hooks/lib";
import {
  err,
  FxError,
  Inputs,
  ok,
  Platform,
  Result,
  Settings,
  UserCancelError,
  UserError,
} from "@microsoft/teamsfx-api";
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
import { MockTools } from "../core/utils";
import { setTools } from "../../src/core/globalVars";
import { environmentManager } from "../../src/core/environment";
import mockedEnv, { RestoreFn } from "mocked-env";
import { EnvInfoLoaderMW_V3 } from "../../src/core/middleware/envInfoLoaderV3";
describe("env utils", () => {
  const tools = new MockTools();
  setTools(tools);
  const sandbox = sinon.createSandbox();
  const cryptoProvider = new LocalCrypto("mockProjectId");
  const decrypted = "123";
  const mockSettings: Settings = {
    projectId: "mockProjectId",
    version: "1",
    isFromSample: false,
  };
  let mockedEnvRestore: RestoreFn | undefined;

  afterEach(() => {
    sandbox.restore();
    if (mockedEnvRestore) {
      mockedEnvRestore();
    }
  });

  beforeEach(() => {
    mockedEnvRestore = mockedEnv({
      TEAMSFX_V3: "true",
    });
  });
  it("envUtil.readEnv", async () => {
    const encRes = await cryptoProvider.encrypt(decrypted);
    if (encRes.isErr()) throw encRes.error;
    const encrypted = encRes.value;
    sandbox.stub(fs, "readFile").resolves(("SECRET_ABC=" + encrypted) as any);
    sandbox.stub(fs, "pathExists").resolves(true);
    sandbox.stub(settingsUtil, "readSettings").resolves(ok(mockSettings));
    const res = await envUtil.readEnv(".", "dev");
    assert.isTrue(res.isOk());
    assert.equal(process.env.SECRET_ABC, decrypted);
  });

  it("envUtil.readEnv - loadToProcessEnv false", async () => {
    const encRes = await cryptoProvider.encrypt(decrypted);
    if (encRes.isErr()) throw encRes.error;
    const encrypted = encRes.value;
    sandbox.stub(fs, "readFile").resolves(("SECRET_ABC=" + encrypted) as any);
    sandbox.stub(fs, "pathExists").resolves(true);
    sandbox.stub(settingsUtil, "readSettings").resolves(ok(mockSettings));
    const res = await envUtil.readEnv(".", "dev", false);
    assert.isTrue(res.isOk());
    assert.equal(process.env.SECRET_ABC, decrypted);
  });

  it("envUtil.readEnv fail", async () => {
    sandbox
      .stub(settingsUtil, "readSettings")
      .resolves(err(new UserError({ source: "test", name: "TestError", message: "message" })));
    const res = await envUtil.readEnv(".", "dev");
    assert.isTrue(res.isErr());
  });
  it("envUtil.writeEnv", async () => {
    let value = "";
    sandbox.stub(fs, "writeFile").callsFake(async (file: fs.PathLike | number, data: any) => {
      value = data as string;
      return Promise.resolve();
    });
    sandbox.stub(settingsUtil, "readSettings").resolves(ok(mockSettings));
    const res = await envUtil.writeEnv(".", "dev", { SECRET_ABC: decrypted });
    assert.isTrue(res.isOk());
    assert.isDefined(value);
    value = value!.substring("SECRET_ABC=".length);
    const decRes = await cryptoProvider.decrypt(value);
    if (decRes.isErr()) throw decRes.error;
    assert.isTrue(decRes.isOk());
    assert.equal(decRes.value, decrypted);
  });
  it("envUtil.writeEnv failed", async () => {
    sandbox
      .stub(settingsUtil, "readSettings")
      .resolves(err(new UserError({ source: "test", name: "TestError", message: "message" })));
    const res = await envUtil.writeEnv(".", "dev", { SECRET_ABC: decrypted });
    assert.isTrue(res.isErr());
  });
  it("envUtil.listEnv", async () => {
    sandbox.stub(fs, "readdir").resolves([".env.dev", ".env.prod"] as any);
    const res = await envUtil.listEnv(".");
    assert.isTrue(res.isOk());
    if (res.isOk()) {
      assert.deepEqual(res.value, ["dev", "prod"]);
    }
  });
  it("environmentManager.listAllEnvConfigs", async () => {
    sandbox.stub(fs, "readdir").resolves([".env.dev", ".env.prod"] as any);
    const res = await environmentManager.listAllEnvConfigs(".");
    assert.isTrue(res.isOk());
    if (res.isOk()) {
      assert.deepEqual(res.value, ["dev", "prod"]);
    }
  });
  it("environmentManager.listRemoteEnvConfigs", async () => {
    sandbox.stub(fs, "readdir").resolves([".env.dev", ".env.prod", ".env.local"] as any);
    const res = await environmentManager.listRemoteEnvConfigs(".");
    assert.isTrue(res.isOk());
    if (res.isOk()) {
      assert.deepEqual(res.value, ["dev", "prod"]);
    }
  });
  it("EnvLoaderMW success", async () => {
    const encRes = await cryptoProvider.encrypt(decrypted);
    if (encRes.isErr()) throw encRes.error;
    const encrypted = encRes.value;
    sandbox.stub(fs, "pathExists").resolves(true);
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
  it("EnvLoaderMW fail without projectPath", async () => {
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
      env: "dev",
    };
    const res = await my.myMethod(inputs);
    assert.isTrue(res.isErr());
    if (res.isErr()) {
      assert.equal(res.error.name, "NoProjectOpenedError");
    }
  });
  it("EnvLoaderMW fail with listEnv Error", async () => {
    sandbox
      .stub(envUtil, "listEnv")
      .resolves(err(new UserError({ source: "test", name: "TestError", message: "message" })));
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
    };
    const res = await my.myMethod(inputs);
    assert.isTrue(res.isErr());
    if (res.isErr()) {
      assert.equal(res.error.name, "TestError");
    }
  });
  it("EnvLoaderMW cancel", async () => {
    sandbox.stub(envUtil, "listEnv").resolves(ok(["dev", "prod"]));
    sandbox.stub(tools.ui, "selectOption").resolves(err(UserCancelError));
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
    };
    const res = await my.myMethod(inputs);
    assert.isTrue(res.isErr());
  });
  it("EnvInfoLoaderMW_V3 call EnvLoaderMW", async () => {
    // This is a temporary solution to reduce the effort of adopting new EnvLoaderMW
    const encRes = await cryptoProvider.encrypt(decrypted);
    if (encRes.isErr()) throw encRes.error;
    const encrypted = encRes.value;
    sandbox.stub(fs, "pathExists").resolves(true);
    sandbox.stub(fs, "readFile").resolves(("SECRET_ABC=" + encrypted) as any);
    sandbox.stub(settingsUtil, "readSettings").resolves(ok(mockSettings));
    class MyClass {
      async myMethod(inputs: Inputs): Promise<Result<any, FxError>> {
        return ok(undefined);
      }
    }
    hooks(MyClass, {
      myMethod: [EnvInfoLoaderMW_V3(false)],
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
    const envs = { SECRET_ABC: decrypted };
    class MyClass {
      async myMethod(inputs: Inputs, ctx?: CoreHookContext): Promise<Result<any, FxError>> {
        ctx!.envVars = envs;
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
    assert.isDefined(value);
    value = value!.substring("SECRET_ABC=".length);
    const decRes = await cryptoProvider.decrypt(value);
    if (decRes.isErr()) throw decRes.error;
    assert.isTrue(decRes.isOk());
    assert.equal(decRes.value, decrypted);
  });
});
