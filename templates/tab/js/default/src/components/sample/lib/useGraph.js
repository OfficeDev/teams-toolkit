import { useData } from "./useData";
import { TeamsUserCredential, createMicrosoftGraphClient } from "@microsoft/teamsfx";

export function useGraph(asyncFunc, options) {
  const { scope } = { scope: ["User.Read"], ...options };
  const initial = useData(async () => {
    try {
      const credential = new TeamsUserCredential();
      const graph = createMicrosoftGraphClient(credential, scope);
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
      const credential = new TeamsUserCredential();
      await credential.login(scope);
      const graph = createMicrosoftGraphClient(credential, scope);
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
