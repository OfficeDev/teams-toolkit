// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { sleep } from "@microsoft/vscode-ui";
import {
  CancellationToken,
  ParameterInformation,
  Position,
  SignatureHelp,
  SignatureHelpProvider,
  SignatureInformation,
  TextDocument,
} from "vscode";

export class MySignatureHelpProvider implements SignatureHelpProvider {
  public provideSignatureHelp(
    document: TextDocument,
    position: Position,
    token: CancellationToken
  ): SignatureHelp {
    const line = document.lineAt(position.line);
    // const regexPattern =/\${{[a-zA-Z_\s]*file\(/g;
    const sigHelp = new SignatureHelp();

    // const matches = regexPattern.exec(line.text)
    // if(matches!=null) {
    // let index = line.text.indexOf(matches[0]);
    const hasPlaceHolderBeginning = false;
    let index = position.character - 1;
    let methodPosition: Position;
    let openParenthesis = 0;
    while (index >= 0) {
      const char = line.text.charAt(index);
      if (char == "(") {
        openParenthesis = index;
        methodPosition = new Position(position.line, index);
        break;
      } else if (char == ")") {
        return sigHelp;
      }

      index--;
    }

    if (line.text.substring(0, openParenthesis).includes("${{")) {
      const word = document.getText(document.getWordRangeAtPosition(methodPosition!));
      console.log(word);
      if (word == "file") {
        sigHelp.activeParameter = 0;
        sigHelp.activeSignature = 0;
        const sigInfo = new SignatureInformation(
          "file(parameter1: string)",
          "Returns the content of file"
        );
        sigInfo.parameters = [];
        sigInfo.parameters.push(new ParameterInformation("parameter1", "paramter1 description"));
        sigHelp.signatures.push(sigInfo);
      }
    }

    //}

    return sigHelp;
  }
}
