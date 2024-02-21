// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import * as fs from "fs";
export function updatePakcageJson(path: string): void {
  const content = fs.readFileSync(path);
  const x = JSON.parse(content.toString());
  //@types/lodash@4.14.74 @types/node@^17.0.41
  x.devDependencies["@types/lodash"] = "4.14.74";
  x.devDependencies["@types/node"] = "^17.0.41";
  fs.writeFileSync(path, JSON.stringify(x, null, 2));
}
