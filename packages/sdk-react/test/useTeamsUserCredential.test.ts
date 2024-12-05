// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @jest-environment jsdom
 */

import { renderHook, waitFor } from "@testing-library/react";
import * as useTeams from "../src/useTeams";
import * as useData from "../src/useData";
import { useTeamsUserCredential } from "../src/useTeamsUserCredential";
import { teamsLightTheme } from "@fluentui/react-components";

jest.mock("@microsoft/teamsfx", () => {
  return {
    TeamsUserCredential: jest.fn().mockImplementation(() => {
      return {
        async login(): Promise<void> {},
        async getToken(): Promise<null> {
          return null;
        },
      };
    }),
  };
});

describe("useTeamsUserCredential() hook tests", () => {
  let spyUseTeams: jest.SpyInstance;
  let spyUseData: jest.SpyInstance;
  const authConfig = {
    clientId: "fake-client-id",
    initiateLoginEndpoint: "fake-initiate-login-endpoint",
  };

  beforeEach(() => {
    spyUseTeams = jest.spyOn(useTeams, "useTeams");
    spyUseTeams.mockImplementation(() => {
      return [
        { inTeams: true, theme: teamsLightTheme, themeString: "default", loading: false },
        { setTheme: () => {} },
      ];
    });
    spyUseData = jest.spyOn(useData, "useData");
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.clearAllMocks();
  });

  it("returns default teamsfx instance", async () => {
    const { result } = renderHook(() => useTeamsUserCredential(authConfig));
    expect(result.current.teamsUserCredential).toBeUndefined();
    expect(result.current.error).toBeUndefined();
    expect(result.current.loading).toBe(true);
    expect(result.current.inTeams).toBe(true);
    expect(result.current.themeString).toBe("default");

    await waitFor(
      () => {
        expect(result.current.error).toBeUndefined();
        expect(result.current.loading).toBe(false);
        expect(result.current.inTeams).toBe(true);
        expect(result.current.themeString).toBe("default");
      },
      { interval: 1 },
    );
  });

  it("returns useData() error", async () => {
    spyUseData.mockImplementation(() => {
      return { error: "useData error", loading: false };
    });
    const { result } = renderHook(() => useTeamsUserCredential(authConfig));
    expect(result.current.teamsUserCredential).toBe(undefined);
    expect(result.current.error).toBe("useData error");
    expect(result.current.loading).toBe(false);
    expect(result.current.inTeams).toBe(true);
    expect(result.current.themeString).toBe("default");
  });
});
