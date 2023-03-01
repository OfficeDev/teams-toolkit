import React from "react";
import { Avatar, Text } from "@fluentui/react-components";
import { Card, CardHeader } from "@fluentui/react-components/unstable";

export const ProfileCard = (loading: boolean, data?: any) => {
  return (
    <Card
      aria-roledescription="card avatar"
      appearance="filled-alternative"
      orientation="horizontal"
      className="profile-card"
    >
      {!loading && data && (
        <>
          <CardHeader
            image={
              <Avatar size={64} image={{ src: data.photoUrl }} name={data.profile.displayName} />
            }
          />
          <div className="flex column">
            <Text weight="bold">{data.profile.displayName}</Text>
            <Text size={200}>{data.profile.mail}</Text>
            <Text size={200}>{data.profile.mobilePhone}</Text>
          </div>
        </>
      )}
    </Card>
  );
};
