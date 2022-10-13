// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as sinon from "sinon";
import { assert, expect } from "chai";
import { renderHook } from "@testing-library/react-hooks";
import { useTeams } from "../src/useTeams";
import { useTeamsFx } from "../src/useTeamsFx";

// TODO: fix the teamsjs mock, not working now
describe("useTeamsFx() hook tests", () => {
  it("returns default teamsfx instance", async () => {
    // sinon.stub(useTeams.prototype).returns({
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
    // const { result } = renderHook(() => useTeamsFx({}));
    // expect(result.current.inTeams).equals(true);
  });
});
