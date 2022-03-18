import { useContext } from "react";
import { Welcome } from "./sample/Welcome";
import { TeamsFxContext } from "./Context";

const showFunction = Boolean(process.env.REACT_APP_FUNC_NAME);

export default function Tab() {
  const { themeString } = useContext(TeamsFxContext);
  return (
    <div className={themeString === "default" ? "" : "dark"}>
      <Welcome showFunction={showFunction} />
    </div>
  );
}
