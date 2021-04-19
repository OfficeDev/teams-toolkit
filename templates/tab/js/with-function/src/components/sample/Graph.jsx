import React, { useRef } from "react";
import { Button, Avatar, Loader } from "@fluentui/react-northstar";
import { useData } from "./lib/useData";
import {
  TeamsUserCredential,
  createMicrosoftGraphClient,
} from "teamsdev-client";

export function Graph() {
  const graph = useRef(null);
  const { loading, error, data, reload } = useData(
    async () => {
      const credential = new TeamsUserCredential();
      const scope = ["User.Read"];
      await credential.login(scope);
      if (!graph.current) {
        graph.current = await createMicrosoftGraphClient(credential, scope);
      }
      const profile = await graph.current.api("/me").get();
      const photo = await graph.current.api("/me/photo/$value").get();
      return {
        profile,
        photo,
      };
    },
    { auto: false }
  );
  return (
    <div>
      <h2>Get the user's profile photo</h2>
      <p>
        Click below to authorize this app to read your profile photo using
        Microsoft Graph.
      </p>
      {loading ? (
        <Loader />
      ) : (
        <Button primary content="Authorize" onClick={reload} />
      )}
      {!loading && error && <div className="error">{error.toString()}</div>}
      {!loading && data && (
        <div className="profile">
          <Avatar
            image={URL.createObjectURL(data.photo)}
            name={data.profile.displayName}
          />{" "}
          <em>{data.profile.displayName}</em>
        </div>
      )}
    </div>
  );
}
