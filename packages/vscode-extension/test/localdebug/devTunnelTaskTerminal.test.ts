// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
/**
 * @author Xiaofu Huang <xiaofhua@microsoft.com>
 */

import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
import * as sinon from "sinon";
import * as vscode from "vscode";
import { UserError } from "@microsoft/teamsfx-api";
import { BaseTaskTerminal } from "../../src/debug/taskTerminal/baseTaskTerminal";
import {
  DevTunnelTaskTerminal,
  IDevTunnelArgs,
} from "../../src/debug/taskTerminal/devTunnelTaskTerminal";
import { ExtensionErrors, ExtensionSource } from "../../src/error";

chai.use(chaiAsPromised);

class TestDevTunnelTaskTerminal extends DevTunnelTaskTerminal {
  public resolveArgs(args: IDevTunnelArgs): Promise<void> {
    return super.resolveArgs(args);
  }
}

describe("devTunnelTaskTerminal", () => {
  const taskDefinition: vscode.TaskDefinition = {
    type: "teamsfx",
  };
  const tunnelTaskTerminal = new TestDevTunnelTaskTerminal(taskDefinition);

  describe("resolveArgs", () => {
    const sandbox = sinon.createSandbox();
    beforeEach(async () => {
      sandbox.stub(BaseTaskTerminal, "taskDefinitionError").callsFake((argName) => {
        return new UserError(
          ExtensionSource,
          ExtensionErrors.TaskDefinitionError,
          `The value of '${argName}' is invalid for the task of type 'teamsfx'`
        );
      });
    });

    afterEach(async () => {
      sandbox.restore();
    });
    const testDataList: { message: string; args: any; errorPropertyName?: string }[] = [
      {
        message: "undefined args",
        args: undefined,
        errorPropertyName: "args",
      },
      {
        message: "property type - undefined",
        args: {
          ports: [
            {
              portNumber: 53000,
              protocol: "https",
            },
          ],
        },
        errorPropertyName: "args.type",
      },
      {
        message: "property type - error string",
        args: {
          type: "error-type",
        },
        errorPropertyName: "args.type",
      },
      {
        message: "property type - number",
        args: {
          type: 1,
        },
        errorPropertyName: "args.type",
      },
      {
        message: "property ports - undefined",
        args: {
          type: "dev-tunnel",
        },
        errorPropertyName: "args.ports",
      },
      {
        message: "property ports - not array",
        args: {
          type: "dev-tunnel",
          ports: {
            portNumber: 53000,
            protocol: "https",
          },
        },
        errorPropertyName: "args.ports",
      },
      {
        message: "property ports - empty",
        args: {
          type: "dev-tunnel",
          ports: [],
        },
      },
      {
        message: "property ports.portNumber - undefined",
        args: {
          type: "dev-tunnel",
          ports: [
            {
              portNumber: 53000,
              protocol: "https",
            },
            {
              protocol: "http",
            },
          ],
        },
        errorPropertyName: "args.ports[1].portNumber",
      },
      {
        message: "property ports.portNumber - string",
        args: {
          type: "dev-tunnel",
          ports: [
            {
              portNumber: "53000",
              protocol: "https",
            },
            {
              portNumber: 53000,
              protocol: "http",
            },
          ],
        },
        errorPropertyName: "args.ports[0].portNumber",
      },
      {
        message: "property ports.portNumber - string",
        args: {
          type: "dev-tunnel",
          ports: [
            {
              portNumber: "53000",
              protocol: "https",
            },
            {
              portNumber: 53000,
              protocol: "http",
            },
          ],
        },
        errorPropertyName: "args.ports[0].portNumber",
      },
      {
        message: "property ports.protocol - undefined",
        args: {
          type: "dev-tunnel",
          ports: [
            {
              portNumber: 53000,
            },
          ],
        },
        errorPropertyName: "args.ports[0].protocol",
      },
      {
        message: "property ports.protocol - error string",
        args: {
          type: "dev-tunnel",
          ports: [
            {
              portNumber: 53000,
              protocol: "error",
            },
          ],
        },
        errorPropertyName: "args.ports[0].protocol",
      },
      {
        message: "property ports.access - error string",
        args: {
          type: "dev-tunnel",
          ports: [
            {
              portNumber: 53000,
              protocol: "https",
              access: "error",
            },
          ],
        },
        errorPropertyName: "args.ports[0].access",
      },
      {
        message: "property ports.writeToEnvironmentFile - error type",
        args: {
          type: "dev-tunnel",
          ports: [
            {
              portNumber: 53000,
              protocol: "https",
              writeToEnvironmentFile: "error",
            },
          ],
        },
        errorPropertyName: "args.ports[0].writeToEnvironmentFile",
      },
      {
        message: "property ports.writeToEnvironmentFile.endpoint - error type",
        args: {
          type: "dev-tunnel",
          ports: [
            {
              portNumber: 53000,
              protocol: "https",
              writeToEnvironmentFile: {
                endpoint: 1,
              },
            },
          ],
        },
        errorPropertyName: "args.ports[0].writeToEnvironmentFile.endpoint",
      },
      {
        message: "property ports.writeToEnvironmentFile.domain - error type",
        args: {
          type: "dev-tunnel",
          ports: [
            {
              portNumber: 53000,
              protocol: "https",
              writeToEnvironmentFile: {
                domain: 1,
              },
            },
          ],
        },
        errorPropertyName: "args.ports[0].writeToEnvironmentFile.domain",
      },
      {
        message: "property ports.writeToEnvironmentFile - empty",
        args: {
          type: "dev-tunnel",
          ports: [
            {
              portNumber: 53000,
              protocol: "https",
              writeToEnvironmentFile: {},
            },
          ],
        },
      },
      {
        message: "property env - error type",
        args: {
          type: "dev-tunnel",
          ports: [
            {
              portNumber: 53000,
              protocol: "https",
            },
          ],
          env: 123,
        },
        errorPropertyName: "args.env",
      },
      {
        message: "happy path",
        args: {
          type: "dev-tunnel",
          ports: [
            {
              portNumber: 53000,
              protocol: "https",
              access: "private",
              writeToEnvironmentFile: {
                endpoint: "TAB_ENDPOINT",
                domain: "TAB_DOMAIN",
              },
            },
          ],
          env: "local",
        },
      },
    ];

    testDataList.forEach((testData) => {
      it(testData.message, async () => {
        if (testData.errorPropertyName) {
          await chai
            .expect(tunnelTaskTerminal.resolveArgs(testData.args as IDevTunnelArgs))
            .rejectedWith(
              `The value of '${testData.errorPropertyName}' is invalid for the task of type 'teamsfx'`
            );
        } else {
          await chai.expect(tunnelTaskTerminal.resolveArgs(testData.args as IDevTunnelArgs))
            .fulfilled;
        }
      });
    });
  });
});
