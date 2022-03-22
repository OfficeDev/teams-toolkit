import { PersonCard } from "@microsoft/mgt-react";
import { useContext } from "react";
import { TeamsFxContext } from "../Context";

export function PersonCardGraphToolkit(props) {
  const { themeString } = useContext(TeamsFxContext);

  return (
    <div className="section-margin">
      <p>This example uses Graph Toolkit's&nbsp;
        <a href="https://docs.microsoft.com/en-us/graph/toolkit/components/person-card" target="_blank" rel="noreferrer">person card component</a> with&nbsp;
        <a href="https://github.com/microsoftgraph/microsoft-graph-toolkit/tree/next/teamsfx/packages/providers/mgt-teamsfx-provider" target="_blank" rel="noreferrer">TeamsFx provider</a> to show person card.
      </p>
      <pre>{`const provider = new TeamsFxProvider(teamsfx, scope); \nProviders.globalProvider = provider; \nProviders.globalProvider.setState(ProviderState.SignedIn);`}</pre>

      {!props.loading && props.error && (
        <div className="error">
          Failed to read your profile. Please try again later. <br /> Details: {props.error.toString()}
        </div>
      )}
      {!props.loading && !props.error && props.data && (
        <div className={
          themeString === "default" ? 'mgt-light' : 'mgt-dark'
        }>
          <PersonCard personQuery="me" isExpanded={false} ></PersonCard>
        </div>
      )}
    </div>)
}