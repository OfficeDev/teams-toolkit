import React from "react";
import { Avatar, Card, Flex, Skeleton, Text } from "@fluentui/react-northstar";

export const ProfileCard = (loading, data) => (
  <Card
    aria-roledescription="card avatar"
    elevated
    inverted
    styles={{ height: "max-content", margin: "0.5em 0" , width: "340px", background: "#faf9f8" }}
  >
    <Card.Header styles={{ "margin-bottom": "0" }}>
      {loading && (
        <Skeleton animation="wave">
          <Flex gap="gap.medium">
            <Skeleton.Avatar size="larger" />
            <div>
              <Skeleton.Line width="100px" />
              <Skeleton.Line width="150px" />
            </div>
          </Flex>
        </Skeleton>
      )}
      {!loading && data && (
        <Flex gap="gap.medium">
          <Avatar size="larger" image={data.photoUrl} name={data.profile.displayName} />{" "}
          <Flex column>
            <Text content={data.profile.displayName} weight="bold" />
            <Text content={data.profile.mail} size="small" />
            <Text content={data.profile.mobilePhone} size="small" />
          </Flex>
        </Flex>
      )}
    </Card.Header>
  </Card>
);
