// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { assert } from "chai";
import mockedEnv from "mocked-env";
import { TeamsFx } from "../../../src";

describe("TeamsFx Tests - Node", () => {
  let restore: () => void;

  afterEach(() => {
    restore();
  });

  it("should load all environment variables", () => {
    restore = mockedEnv({
      TEST_ENV: "test value",
    });

    const teamsFx = new TeamsFx();

    assert.equal(teamsFx.getConfig("TEST_ENV"), "test value");
  });

  it("should not override reserved key", () => {
    restore = mockedEnv({
      clientId: "test value",
    });

    const teamsFx = new TeamsFx(undefined, {
      clientId: "predefined value",
    });

    assert.equal(teamsFx.getConfig("clientId"), "predefined value");
  });
});
