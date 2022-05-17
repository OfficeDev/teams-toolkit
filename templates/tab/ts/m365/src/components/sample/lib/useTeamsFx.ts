import { LogLevel, setLogLevel, setLogFunction } from "@microsoft/teamsfx";
import { useData } from "./useData";
import { useTeams } from "./useTeams";

// TODO fix this when the SDK stops hiding global state!
let initialized = false;

export function useTeamsFx() {
  const [result] = useTeams();
  const { error, loading } = useData(async () => {
    if (!initialized) {
      if (process.env.NODE_ENV === "development") {
        setLogLevel(LogLevel.Verbose);
        setLogFunction((leve: LogLevel, message: string) => { console.log(message); });
      }
      initialized = true;
    }
  });
  return { error, loading, ...result };
}
