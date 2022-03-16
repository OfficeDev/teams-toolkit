import { assert, use as chaiUse } from "chai";
import * as chaiPromises from "chai-as-promised";
import {
  cloneConversation,
  getTargetType,
  getTeamsBotInstallationId,
} from "../../../../src/notification/utils";

chaiUse(chaiPromises);

describe("Notification.Utils Tests - Node", () => {
  it("cloneConversation should clone correct data", () => {
    const source = { channelId: "1" };
    const target = cloneConversation(source) as any;
    source.channelId = "2";
    assert.deepStrictEqual(target, { channelId: "1" });
  });

  it("getTargetType should return correct type", () => {
    const ref1 = {
      conversation: {
        conversationType: "personal",
      },
    };
    const ref2 = {
      conversation: {
        conversationType: "groupChat",
      },
    };
    const ref3 = {
      conversation: {
        conversationType: "channel",
      },
    };
    const ref4 = {
      conversation: {
        conversationType: "test",
      },
    };
    const type1 = getTargetType(ref1 as any);
    const type2 = getTargetType(ref2 as any);
    const type3 = getTargetType(ref3 as any);
    const type4 = getTargetType(ref4 as any);
    assert.strictEqual(type1, "Person");
    assert.strictEqual(type2, "Group");
    assert.strictEqual(type3, "Channel");
    assert.isUndefined(type4);
  });

  it("getTeamsBotInstallationId should return correct id", () => {
    const context1 = {
      activity: {
        channelData: {
          team: {
            id: "1",
          },
        },
        conversation: {
          id: "X",
        },
      },
    };
    const context2 = {
      activity: {
        conversation: {
          id: "2",
        },
      },
    };
    const id1 = getTeamsBotInstallationId(context1 as any);
    const id2 = getTeamsBotInstallationId(context2 as any);
    assert.strictEqual(id1, "1");
    assert.strictEqual(id2, "2");
  });
});
