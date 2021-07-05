import { loadConfiguration, ResourceType, LogLevel, setLogLevel, setLogFunction } from "@microsoft/teamsfx";
import { useData } from "./useData";
import { useTeams } from "msteams-react-base-component";

var teamsfxEndpoint = process.env.REACT_APP_TEAMSFX_ENDPOINT;
var startLoginPageUrl = process.env.REACT_APP_START_LOGIN_PAGE_URL;
var functionEndpoint = process.env.REACT_APP_FUNC_ENDPOINT;
var clientId = process.env.REACT_APP_CLIENT_ID;

// TODO fix this when the SDK stops hiding global state!
let initialized = false;

export function useTeamsFx() {
  const [result] = useTeams({});
  const { error, loading } = useData(async () => {
    if (!initialized) {
      if (process.env.NODE_ENV === "development") {
        setLogLevel(LogLevel.Verbose);
        setLogFunction((leve: LogLevel, message: string) => { console.log(message); });
      }
      loadConfiguration({
        authentication: {
          initiateLoginEndpoint: startLoginPageUrl,
          simpleAuthEndpoint: teamsfxEndpoint,
          clientId: clientId,
        },
        resources: [
          {
            type: ResourceType.API,
            name: "default",
            properties: {
              endpoint: functionEndpoint,
            },
          },
        ],
      });
      initialized = true;
    }
  });
  const isInTeams = true;
  return { error, loading, isInTeams, ...result };
}
