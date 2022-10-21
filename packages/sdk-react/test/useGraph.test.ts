// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import { assert, expect } from "chai";
import { renderHook } from "@testing-library/react-hooks";
import { Client, GraphError } from "@microsoft/microsoft-graph-client";
import { useGraph } from "../src/useGraph";
import { TeamsFx, ErrorWithCode, ErrorCode } from "@microsoft/teamsfx";
import { act } from "react-test-renderer";
import * as sinon from "sinon";

const sandbox = sinon.createSandbox();

describe("useGraph() hook tests", () => {
  afterEach(() => {
    sandbox.restore();
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
    assert.isDefined(result.current.reload);
    expect(result.current.data).equals(undefined);
    expect(result.current.error).equals(undefined);
    expect(result.current.loading).equals(true);

    await waitForNextUpdate();
    expect(result.current.data).equals("graph data");
    expect(result.current.error).equals(undefined);
    expect(result.current.loading).equals(false);

    expect((authenticatedGraph as any).config.authProvider.credentialOrTeamsFx).to.be.instanceOf(
      TeamsFx
    );
    expect(graphScope && graphScope[0]).equals("User.Read");
  });

  it("call login() automatically when user has not consented", async () => {
    let authenticatedGraph: Client | undefined;
    let graphScope: string[] | undefined;
    let callTime = 0;
    sandbox.stub(TeamsFx.prototype, "login");
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
    assert.isDefined(result.current.reload);
    expect(result.current.data).equals(undefined);
    expect(result.current.error).equals(undefined);
    expect(result.current.loading).equals(true);

    await waitForNextUpdate();
    expect(result.current.data).equals(undefined);
    expect(result.current.error).equals(undefined);
    expect(result.current.loading).equals(false);

    expect((authenticatedGraph as any).config.authProvider.credentialOrTeamsFx).to.be.instanceOf(
      TeamsFx
    );
    expect(graphScope && graphScope[0]).equals("User.Read");

    act(() => result.current.reload());
    await waitForNextUpdate();
    expect(result.current.data).equals("graph data");
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
    sandbox.stub(TeamsFx.prototype, "login").callsFake(() => {
      throw new ErrorWithCode("CancelledByUser");
    });
    assert.isDefined(result.current.reload);
    expect(result.current.data).equals(undefined);
    expect(result.current.error).equals(undefined);
    expect(result.current.loading).equals(true);

    await waitForNextUpdate();
    expect(result.current.data).equals(undefined);
    expect(result.current.error).equals(undefined);
    expect(result.current.loading).equals(false);

    expect((authenticatedGraph as any).config.authProvider.credentialOrTeamsFx).to.be.instanceOf(
      TeamsFx
    );
    expect(graphScope && graphScope[0]).equals("User.Read");

    act(() => result.current.reload());
    await waitForNextUpdate();
    expect(result.current.data).equals(undefined);
    assert.isDefined(result.current.error);
    expect((result.current.error as ErrorWithCode).message).equals(
      "CancelledByUser" +
        '\nIf you see "AADSTS50011: The reply URL specified in the request does not match the reply URLs configured for the application" ' +
        "in the popup window, you may be using unmatched version for TeamsFx SDK (version >= 0.5.0) and Teams Toolkit (version < 3.3.0) or " +
        `cli (version < 0.11.0). Please refer to the help link for how to fix the issue: https://aka.ms/teamsfx-auth-code-flow`
    );
  });
});
