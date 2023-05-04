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

  it("Should export useTeamsFx", () => {
    expect(sdkReact.useTeamsFx).toBeDefined();
  });

  it("Should export useData", () => {
    expect(sdkReact.useData).toBeDefined();
  });

  it("Should export useGraph", () => {
    expect(sdkReact.useGraph).toBeDefined();
  });

  it("Should export BaseDashboard", () => {
    expect(sdkReact.BaseDashboard).toBeDefined();
  });

  it("Should export BaseWidget", () => {
    expect(sdkReact.BaseWidget).toBeDefined();
  });
});
