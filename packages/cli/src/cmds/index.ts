// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import { YargsCommand } from "../yargsCommand";
import Account from "./account";
import New from "./new";
import Capability from "./capability";
import Resource from "./resource";
import Provision from "./provision";
import Deploy from "./deploy";
import Init from "./init";
import Publish from "./publish";
import Build from "./build";
import Test from "./test";

export const commands: YargsCommand[] = [
  new Account(),
  new New(),
  new Capability(),
  new Resource(),
  new Provision(),
  new Deploy(),
  new Init(),
  new Build(),
  new Test(),
  new Publish()
];
