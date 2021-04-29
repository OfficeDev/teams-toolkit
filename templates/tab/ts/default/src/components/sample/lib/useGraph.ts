import { useRef } from "react";
import { useData } from "./useData";
import {
  TeamsUserCredential,
  createMicrosoftGraphClient,
} from "teamsdev-client";

const callGraph = async (
  credential: TeamsUserCredential,
  scope: string | string[]
) => {
  const graph = await createMicrosoftGraphClient(credential, scope);
  const profile = await graph.api("/me").get();
  const photo = await graph.api("/me/photo/$value").get();
  return {
    profile,
    photo,
  };
};

const silentCallGraph = async (
  credential: TeamsUserCredential,
  scope: string | string[]
) => {
  try {
    return await callGraph(credential, scope);
  } catch (err) {
    if (err.code === "ErrorWithCode.UiRequiredError") {
      // Silently fail for user didn't login error
    } else {
      throw err;
    }
  }
};

export function useGraph(options?: { scope: string | string[] }) {
  const credential = useRef<TeamsUserCredential>(new TeamsUserCredential());
  const { scope } = { scope: ["User.Read"], ...options };

  const initial = useData(async () => {
    return await silentCallGraph(credential.current, scope);
  });

  const { data, error, loading, reload } = useData(
    async () => {
      await credential.current.login(scope);
      return await callGraph(credential.current, scope);
    },
    { auto: false }
  );

  return {
    data: data || initial.data,
    error: error || initial.error,
    loading: loading || initial.loading,
    reload,
  };
}
