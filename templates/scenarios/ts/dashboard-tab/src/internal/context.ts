import { TeamsUserCredential } from "@microsoft/teamsfx";
import { createContext } from "react";
import { Theme } from "@fluentui/react-theme";

export const TeamsFxContext = createContext<{
  theme?: Theme;
  themeString: string;
  teamsUserCredential?: TeamsUserCredential;
}>({
  theme: undefined,
  themeString: "",
  teamsUserCredential: undefined,
});
