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

export class OfficeAddinFollowupProvider implements ChatFollowupProvider {
  private static instance: OfficeAddinFollowupProvider;
  private followups: ChatFollowup[] = [];

  private constructor() {}

  public static getInstance() {
    if (!OfficeAddinFollowupProvider.instance) {
      OfficeAddinFollowupProvider.instance = new OfficeAddinFollowupProvider();
    }
    return OfficeAddinFollowupProvider.instance;
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

export default OfficeAddinFollowupProvider.getInstance();
