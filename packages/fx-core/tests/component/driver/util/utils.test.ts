// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import mockedEnv, { RestoreFn } from "mocked-env";
import { loadStateFromEnv, mapStateToEnv } from "../../../../src/component/driver/util/utils";
import { expect } from "chai";

describe("loadStateFromEnv", () => {
  let envRestore: RestoreFn | undefined;

  afterEach(() => {
    if (envRestore) {
      envRestore();
      envRestore = undefined;
    }
  });

  it("should return empty object when outputEnvVarNames is empty", () => {
    const outputEnvVarNames: Map<string, string> = new Map<string, string>();
    const result = loadStateFromEnv(outputEnvVarNames);
    expect(Object.entries(result).length).to.equal(0);
  });

  it("should return state object with value from env", () => {
    envRestore = mockedEnv({
      ENV_A: "ENV_A value",
      ENV_B: "ENV_B value",
    });
    const outputEnvVarNames: Map<string, string> = new Map(
      Object.entries({
        envA: "ENV_A",
        envB: "ENV_B",
      })
    );

    const result = loadStateFromEnv(outputEnvVarNames);
    expect(Object.entries(result).length).to.equal(2);
    expect(result.envA).to.equal("ENV_A value");
    expect(result.envB).to.equal("ENV_B value");
  });

  it("should return state object with undefined property if env does not exist", () => {
    envRestore = mockedEnv({
      ENV_A: "ENV_A value",
    });
    const outputEnvVarNames: Map<string, string> = new Map(
      Object.entries({
        envA: "ENV_A",
        envB: "ENV_B",
      })
    );

    const result = loadStateFromEnv(outputEnvVarNames);
    expect(Object.entries(result).length).to.equal(2);
    expect(result.envA).to.equal("ENV_A value");
    expect(result.envB).to.be.undefined;
  });
});

describe("mapStateToEnv", async () => {
  it("should convert state to env based on outputEnvVarNames", () => {
    const state: Record<string, string> = {
      envA: "ENV_A value",
      envB: "ENV_B value",
    };
    let outputEnvVarNames: Map<string, string> = new Map(
      Object.entries({
        envA: "ENV_A",
      })
    );
    let result = mapStateToEnv(state, outputEnvVarNames);
    expect(result.size).to.equal(1);
    expect(result.get("ENV_A")).to.equal("ENV_A value");

    outputEnvVarNames = new Map(
      Object.entries({
        envA: "ENV_A",
        envB: "ENV_B",
      })
    );
    result = mapStateToEnv(state, outputEnvVarNames);
    expect(result.size).to.equal(2);
    expect(result.get("ENV_A")).to.equal("ENV_A value");
    expect(result.get("ENV_B")).to.equal("ENV_B value");

    outputEnvVarNames = new Map();
    result = mapStateToEnv(state, outputEnvVarNames);
    expect(result.size).to.equal(0);
  });

  it("should convert state to env and exclude given properties", () => {
    const state: Record<string, string> = {
      envA: "ENV_A value",
      envB: "ENV_B value",
    };
    const outputEnvVarNames: Map<string, string> = new Map(
      Object.entries({
        envA: "ENV_A",
        envB: "ENV_B",
      })
    );
    const result = mapStateToEnv(state, outputEnvVarNames, ["envB"]);
    expect(result.size).to.equal(1);
    expect(result.get("ENV_A")).to.equal("ENV_A value");
  });
});
