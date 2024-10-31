// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @jest-environment jsdom
 */

import * as sdkReact from "../src/index";

describe("index", () => {
  it("Should export useTeams", () => {
    expect(sdkReact.useTeams).toBeDefined();
  });

  it("Should export useTeamsUserCredential", () => {
    expect(sdkReact.useTeamsUserCredential).toBeDefined();
  });

  it("Should export useData", () => {
    expect(sdkReact.useData).toBeDefined();
  });

  it("Should export useGraphWithCredential", () => {
    expect(sdkReact.useGraphWithCredential).toBeDefined();
  });

  it("Should export BaseDashboard", () => {
    expect(sdkReact.BaseDashboard).toBeDefined();
  });

  it("Should export BaseWidget", () => {
    expect(sdkReact.BaseWidget).toBeDefined();
  });
});
