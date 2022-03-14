// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as sinon from "sinon";
import { assert, expect } from "chai";
import { renderHook } from "@testing-library/react-hooks";

// TODO: fix the teamsjs mock, not working now
describe("useTeamsFx() hook tests", () => {
  it("returns default teamsfx instance", async () => {
    // sinon.stub(msteams, "useTeams").returns({
    //   inTeams: true,
    //   theme: {
    //     siteVariables: {
    //       fontSizes: {},
    //     },
    //     componentVariables: {},
    //     componentStyles: {},
    //     fontFaces: [],
    //     staticStyles: [],
    //     animations: {},
    //   },
    //   themeString: "default",
    // });
  });
});
