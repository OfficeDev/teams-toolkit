import { TeamsFx } from "@microsoft/teamsfx";
import { createContext } from "react";
import { Theme } from "@fluentui/react-theme";

export const TeamsFxContext = createContext<{
  theme?: Theme;
  themeString: string;
  teamsfx?: TeamsFx;
}>({
  theme: undefined,
  themeString: "",
  teamsfx: undefined,
});
