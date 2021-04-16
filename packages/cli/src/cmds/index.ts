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
import Publish from "./publish";
import Build from "./build";
import Test from "./test";

export const commands: YargsCommand[] = [
  new Account(),
  new New(),
  new Provision(),
  new Deploy(),
  new Resource(),
  new Init(),
  new Build(),
  new Test(),
  new Publish()
];
