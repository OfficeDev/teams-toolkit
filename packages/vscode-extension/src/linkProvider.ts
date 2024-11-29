// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import * as vscode from "vscode";

class CustomLink extends vscode.TerminalLink {
  public content: string;
  constructor(startIndex: number, length: number, public commandId: string, content: string) {
    super(startIndex, length);
    this.content = content;
  }
}

export class CustomLinkProvider implements vscode.TerminalLinkProvider<CustomLink> {
  provideTerminalLinks(
    context: vscode.TerminalLinkContext,
    token: vscode.CancellationToken
  ): CustomLink[] {
    const regex = /\[\s*Run\s+Command\s*\]|\[TeamsToolkitError\].*?\[TeamsToolkitError\]/g;
    const links: CustomLink[] = [];
    let match: RegExpExecArray | null;
    console.log(context.line);
    // Use exec in a loop to find all matches
    while ((match = regex.exec(context.line)) !== null) {
      console.log("matched!!!!");
      console.log(context.line);
      const commandId = "fx-extension.create"; // Capture the command ID
      const startIndex = match.index; // Start position of the match
      const length = match[0].length; // Length of the match
      const l = new CustomLink(startIndex, length, commandId, context.line);
      l.tooltip = "Troubleshoot with @teamsapp";
      // Create a CustomLink for each match
      links.push(l);
    }

    return links;
  }

  async handleTerminalLink(link: CustomLink): Promise<void> {
    const content = link.content;
    await vscode.commands.executeCommand(link.commandId, content);
  }
}
