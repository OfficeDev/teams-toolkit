import { TeamsFx } from "@microsoft/teamsfx";
import { createContext } from "react";
import { ThemePrepared } from "@fluentui/react-northstar";

export const TeamsFxContext = createContext({
  theme: undefined,
  themeString: "",
  teamsfx: undefined
});
