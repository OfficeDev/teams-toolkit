// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @jest-environment jsdom
 */

import { renderHook } from "@testing-library/react-hooks";
import { Client, GraphError } from "@microsoft/microsoft-graph-client";
import { useGraph } from "../src/useGraph";
import { TeamsFx, ErrorWithCode, ErrorCode } from "@microsoft/teamsfx";
import { act } from "react-test-renderer";

require("isomorphic-fetch");

describe("useGraph() hook tests", () => {
  let spyTeamsFxLogin: jest.SpyInstance;

  beforeEach(() => {
    spyTeamsFxLogin = jest.spyOn(TeamsFx.prototype, "login");
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.clearAllMocks();
  });

  it("call function after initialized", async () => {
    let authenticatedGraph: Client | undefined;
    let graphScope: string[] | undefined;
    const { result, waitForNextUpdate } = renderHook(() =>
      useGraph((graph: Client, teamsfx: TeamsFx, scope: string[]) => {
        authenticatedGraph = graph;
        graphScope = scope;
        return Promise.resolve("graph data");
      })
    );
    expect(result.current.reload).toBeDefined();
    expect(result.current.data).toBe(undefined);
    expect(result.current.error).toBe(undefined);
    expect(result.current.loading).toBe(true);

    await waitForNextUpdate();
    expect(result.current.data).toBe("graph data");
    expect(result.current.error).toBe(undefined);
    expect(result.current.loading).toBe(false);

    expect((authenticatedGraph as any).config.authProvider.teamsfx).toBeInstanceOf(TeamsFx);
    expect(graphScope && graphScope[0]).toBe("User.Read");
  });

  it("call login() automatically when user has not consented", async () => {
    let authenticatedGraph: Client | undefined;
    let graphScope: string[] | undefined;
    let callTime = 0;
    spyTeamsFxLogin.mockImplementation(() => {
      return Promise.resolve();
    });
    const { result, waitForNextUpdate } = renderHook(() =>
      useGraph((graph: Client, teamsfx: TeamsFx, scope: string[]) => {
        authenticatedGraph = graph;
        graphScope = scope;
        if (callTime === 0) {
          callTime++;
          const error = new GraphError();
          error.code = ErrorCode.UiRequiredError;
          return Promise.reject(error);
        } else {
          return Promise.resolve("graph data");
        }
      })
    );
    expect(result.current.reload).toBeDefined();
    expect(result.current.data).toBe(undefined);
    expect(result.current.error).toBe(undefined);
    expect(result.current.loading).toBe(true);

    await waitForNextUpdate();
    expect(result.current.data).toBe(undefined);
    expect(result.current.error).toBe(undefined);
    expect(result.current.loading).toBe(false);

    expect((authenticatedGraph as any).config.authProvider.teamsfx).toBeInstanceOf(TeamsFx);
    expect(graphScope && graphScope[0]).toBe("User.Read");

    act(() => result.current.reload());
    await waitForNextUpdate();
    expect(result.current.data).toBe("graph data");
  });

  it("shows error message when user cancels consent dialog", async () => {
    let authenticatedGraph: Client | undefined;
    let graphScope: string[] | undefined;
    const { result, waitForNextUpdate } = renderHook(() =>
      useGraph((graph: Client, teamsfx: TeamsFx, scope: string[]) => {
        authenticatedGraph = graph;
        graphScope = scope;
        const error = new GraphError();
        error.code = ErrorCode.UiRequiredError;
        return Promise.reject(error);
      })
    );
    spyTeamsFxLogin.mockImplementation(() => {
      throw new ErrorWithCode("CancelledByUser");
    });
    expect(result.current.reload).toBeDefined;
    expect(result.current.data).toBe(undefined);
    expect(result.current.error).toBe(undefined);
    expect(result.current.loading).toBe(true);

    await waitForNextUpdate();
    expect(result.current.data).toBe(undefined);
    expect(result.current.error).toBe(undefined);
    expect(result.current.loading).toBe(false);

    expect((authenticatedGraph as any).config.authProvider.teamsfx).toBeInstanceOf(TeamsFx);
    expect(graphScope && graphScope[0]).toBe("User.Read");

    act(() => result.current.reload());
    await waitForNextUpdate();
    expect(result.current.data).toBe(undefined);
    expect(result.current.error).toBeDefined;
    expect((result.current.error as ErrorWithCode).message).toBe(
      "CancelledByUser" +
        '\nIf you see "AADSTS50011: The reply URL specified in the request does not match the reply URLs configured for the application" ' +
        "in the popup window, you may be using unmatched version for TeamsFx SDK (version >= 0.5.0) and Teams Toolkit (version < 3.3.0) or " +
        `cli (version < 0.11.0). Please refer to the help link for how to fix the issue: https://aka.ms/teamsfx-auth-code-flow`
    );
  });
});
