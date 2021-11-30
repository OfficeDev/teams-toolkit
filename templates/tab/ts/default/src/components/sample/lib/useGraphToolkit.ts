import { LogLevel, setLogLevel, setLogFunction } from "@microsoft/teamsfx";
import { Providers, ProvidersChangedState, ProviderState } from "@microsoft/mgt-element";
import { TeamsFxProvider } from "@microsoft/mgt-teamsfx-provider";
import React from "react";

export function useGraphToolkit() {
  const [providerState, setProviderState] = React.useState<ProviderState>(ProviderState.Loading);
      
  React.useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      setLogLevel(LogLevel.Verbose);
      setLogFunction((level: LogLevel, message: string) => { console.log(message); });
    }

    Providers.globalProvider = new TeamsFxProvider({      
      scopes: [
        "User.Read",
        "User.ReadBasic.All"
      ]
    });

    setProviderState(Providers.globalProvider.state);

    Providers.onProviderUpdated((stateEvent: ProvidersChangedState) => {
      if(stateEvent === ProvidersChangedState.ProviderStateChanged) {
        setProviderState(Providers.globalProvider.state);
      }      
    });
  }, []);

  return { providerState };
}
