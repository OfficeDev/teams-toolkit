// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  CancellationToken,
  ChatContext,
  ChatFollowup,
  ChatFollowupProvider,
  ChatResult,
  ProviderResult,
} from "vscode";

import { DefaultNextStep } from "./consts";

export class TeamsFollowupProvider implements ChatFollowupProvider {
  private static instance: TeamsFollowupProvider;
  private followups: ChatFollowup[] = [];

  private constructor() {}

  public static getInstance() {
    if (!TeamsFollowupProvider.instance) {
      TeamsFollowupProvider.instance = new TeamsFollowupProvider();
    }
    return TeamsFollowupProvider.instance;
  }

  public clearFollowups() {
    this.followups = [];
  }

  public addFollowups(followups: ChatFollowup[]) {
    this.followups.push(...followups);
  }

  public provideFollowups(
    result: ChatResult,
    context: ChatContext,
    token: CancellationToken
  ): ProviderResult<ChatFollowup[]> {
    return this.followups.length > 0 ? this.followups : [DefaultNextStep];
  }
}

export default TeamsFollowupProvider.getInstance();
