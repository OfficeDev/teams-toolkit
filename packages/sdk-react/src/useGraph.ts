// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Data, useData } from "./useData";
import { TeamsFx, createMicrosoftGraphClient, ErrorWithCode } from "@microsoft/teamsfx";
import { Client, GraphError } from "@microsoft/microsoft-graph-client";
import { useState } from "react";

type GraphOption = {
  scope?: string[];
  teamsfx?: TeamsFx;
};

/**
 * Helper function to call Microsoft Graph API with authentication.
 *
 * @param fetchGraphDataAsync - async function of how to call Graph API and fetch data.
 * @param options - teamsfx instance and OAuth resource scope.
 * @returns data, loading status, error and reload function
 *
 * @beta
 */
export function useGraph<T>(
  fetchGraphDataAsync: (graph: Client, teamsfx: TeamsFx, scope: string[]) => Promise<T>,
  options?: GraphOption
): Data<T> {
  const { scope, teamsfx } = { scope: ["User.Read"], teamsfx: new TeamsFx(), ...options };
  const [needConsent, setNeedConsent] = useState(false);
  const { data, error, loading, reload } = useData(async () => {
    if (needConsent) {
      try {
        await teamsfx.login(scope);
        setNeedConsent(false);
        // Important: tokens are stored in sessionStorage, read more here: https://aka.ms/teamsfx-session-storage-notice
      } catch (err: unknown) {
        if (err instanceof ErrorWithCode && err.message?.includes("CancelledByUser")) {
          const helpLink = "https://aka.ms/teamsfx-auth-code-flow";
          err.message +=
            '\nIf you see "AADSTS50011: The reply URL specified in the request does not match the reply URLs configured for the application" ' +
            "in the popup window, you may be using unmatched version for TeamsFx SDK (version >= 0.5.0) and Teams Toolkit (version < 3.3.0) or " +
            `cli (version < 0.11.0). Please refer to the help link for how to fix the issue: ${helpLink}`;
        }
        throw err;
      }
    }
    try {
      const graph = createMicrosoftGraphClient(teamsfx, scope);
      const graphData = await fetchGraphDataAsync(graph, teamsfx, scope);
      return graphData;
    } catch (err: unknown) {
      if (err instanceof GraphError && err.code?.includes("UiRequiredError")) {
        // Silently fail for user didn't consent error
        setNeedConsent(true);
      } else {
        throw err;
      }
    }
  });
  return { data, error, loading, reload };
}
