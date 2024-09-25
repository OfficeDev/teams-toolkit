// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import * as fs from "fs";
export function updatePakcageJson(path: string): void {
  const content = fs.readFileSync(path);
  const x = JSON.parse(content.toString());
  x.devDependencies["@types/restify"] = "^8.5.5";
  x.devDependencies["@types/node"] = "^18.0.0";
  x.devDependencies["ts-node"] = "^10.4.0";
  x.devDependencies["typescript"] = "^4.4.4";
  x.dependencies["@microsoft/teamsfx"] = "^2.3.1";
  x.dependencies["restify"] = "^10.0.0";
  x.dependencies["botbuilder"] = "^4.20.0";

  fs.writeFileSync(path, JSON.stringify(x, null, 2));
}
