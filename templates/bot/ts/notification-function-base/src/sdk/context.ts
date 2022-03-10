import { ChannelInfo, TeamsChannelAccount, TeamsInfo, TurnContext } from "botbuilder";

export type TargetType = "Channel" | "Group" | "Person";

export class Member {
  public readonly type: TargetType = "Person";
  public notificationTarget: NotificationTarget;
  public account: TeamsChannelAccount;
}

export class Channel {
  public readonly type: TargetType = "Channel";
  public notificationTarget: NotificationTarget;
  public info: ChannelInfo;
}

export class NotificationTarget {
  public readonly turnContext: TurnContext;
  public readonly type?: TargetType;

  constructor(turnContext: TurnContext, type?: TargetType) {
    this.turnContext = turnContext;
    this.type = type;
  }

  public async members(): Promise<Member[]> {
    const teamsMembers = await TeamsInfo.getMembers(this.turnContext);
    const members: Member[] = [];
    for (const member of teamsMembers) {
      members.push({
        type: "Person",
        notificationTarget: this,
        account: member,
      });
    }

    return members;
  }

  public async channels(): Promise<Channel[]> {
    const channels: Channel[] = [];
    const teamId = NotificationTarget.getNotificationTargeId(this.turnContext);
    if (!teamId) {
      return channels;
    }

    const teamsChannels = await TeamsInfo.getTeamChannels(this.turnContext, teamId);
    for (const channel of teamsChannels) {
      channels.push({
        type: "Channel",
        notificationTarget: this,
        info: channel,
      });
    }

    return channels;
  }

  private static getNotificationTargeId(context: TurnContext): string {
    return context.activity?.channelData?.team?.id ?? context.activity.conversation.id;
  }
}
