import { useData } from "./useData";
import { TeamsUserCredential, createMicrosoftGraphClient, ErrorWithCode } from "@microsoft/teamsfx";
import { Client, GraphError } from "@microsoft/microsoft-graph-client";

export function useGraph<T>(
  asyncFunc: (graph: Client) => Promise<T>,
  options?: { scope: string | string[] }
) {
  const { scope } = { scope: ["User.Read"], ...options };
  const initial = useData(async () => {
    try {
      const credential = new TeamsUserCredential();
      const graph = createMicrosoftGraphClient(credential, scope);
      return await asyncFunc(graph);
    } catch (err: unknown) {
      if (err instanceof GraphError && err.code?.includes("UiRequiredError")) {
        // Silently fail for user didn't login error
      } else {
        throw err;
      }
    }
  });

  const { data, error, loading, reload } = useData(
    async () => {
      try {
        const credential = new TeamsUserCredential();
        await credential.login(scope);
        // Important: tokens are stored in sessionStorage, read more here: https://aka.ms/teamsfx-session-storage-notice
        const graph = createMicrosoftGraphClient(credential, scope);
        return await asyncFunc(graph);
      } catch (err: unknown) {
        if (err instanceof ErrorWithCode && err.message?.includes("CancelledByUser")) {
          const helpLink = "https://aka.ms/teamsfx-auth-code-flow";
          err.message += 
            "\nIf you see \"AADSTS50011: The reply URL specified in the request does not match the reply URLs configured for the application\" " + 
            "in the popup window, you may be using unmatched version for TeamsFx SDK (version >= 0.5.0) and Teams Toolkit (version < 3.3.0) or " +
            `cli (version < 0.11.0). Please refer to the help link for how to fix the issue: ${helpLink}` ;
        }

        throw err;
      }
    },
    { auto: false }
  );

  return data || error || loading
    ? { data, error, loading, reload }
    : {
        data: initial.data,
        error: initial.error,
        loading: initial.loading,
        reload,
      };
}
