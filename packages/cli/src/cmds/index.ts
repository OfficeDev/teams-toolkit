// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import { YargsCommand } from "../yargsCommand";
import Account from "./account";
import New from "./new";
import Provision from "./provision";
import Deploy from "./deploy";
import Resource from "./resource";
import Init from "./init";

export const commands: YargsCommand[] = [
  new Account(),
  new New(),
  new Provision(),
  new Deploy(),
  new Resource(),
  new Init()
];
