import { createContext } from "react";

import { Theme } from "@fluentui/react-components";
import { TeamsUserCredential } from "@microsoft/teamsfx";

export const TeamsFxContext = createContext<{
  theme?: Theme;
  themeString: string;
  teamsUserCredential?: TeamsUserCredential;
}>({
  theme: undefined,
  themeString: "",
  teamsUserCredential: undefined,
});
