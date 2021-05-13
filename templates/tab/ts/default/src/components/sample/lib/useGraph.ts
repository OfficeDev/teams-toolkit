import { useRef } from "react";
import { useData } from "./useData";
import { TeamsUserCredential, createMicrosoftGraphClient } from "@microsoft/teamsfx";
import { Client } from "@microsoft/microsoft-graph-client";

export function useGraph<T>(
  asyncFunc: (graph: Client) => Promise<T>,
  options?: { scope: string | string[] }
) {
  const credential = useRef(new TeamsUserCredential());

  const { scope } = { scope: ["User.Read"], ...options };
  const initial = useData(async () => {
    try {
      const graph = createMicrosoftGraphClient(credential.current, scope);
      return await asyncFunc(graph);
    } catch (err) {
      if (err.code.includes("UiRequiredError")) {
        // Silently fail for user didn't login error
      } else {
        throw err;
      }
    }
  });

  const { data, error, loading, reload } = useData(
    async () => {
      await credential.current.login(scope);
      const graph = createMicrosoftGraphClient(credential.current, scope);
      return await asyncFunc(graph);
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
