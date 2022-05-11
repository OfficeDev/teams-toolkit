namespace Microsoft.TeamsFx.Test.Conversation
{
    using System.Text.Json;
    using Microsoft.Bot.Schema;
    using Microsoft.TeamsFx.Conversation;
    using Microsoft.VisualStudio.TestTools.UnitTesting;

    [TestClass]
    public class ConversationReferenceExtensionsTest
    {
        [TestMethod]
        public void Clone_IsDeepClone()
        {
            var source = new ConversationReference
            {
                ActivityId = "x",
                ChannelId = "y",
                Conversation = new ConversationAccount
                {
                    Id = "foo",
                    Name = "bar",
                },
            };

            var target = source.Clone();
            Assert.AreEqual(JsonSerializer.Serialize(source), JsonSerializer.Serialize(target));

            source.ActivityId = "xx";
            source.Conversation.Id = "foofoo";
            Assert.AreEqual("x", target.ActivityId);
            Assert.AreEqual("foo", target.Conversation.Id);
        }
    }
}