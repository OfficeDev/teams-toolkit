// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */

import { Capability } from "../../utils/constants";
import { CaseFactory } from "../caseFactory";

class AiBotTestCase extends CaseFactory {}

new AiBotTestCase(
    Capability.AiBot,
    24808531,
    "v-ivanchen@microsoft.com",
    ["bot"],
    {}
).test();
