namespace Microsoft.TeamsFx.Test.Conversation
{
    using System.Text.Json;
    using Microsoft.Bot.Schema;
    using Microsoft.TeamsFx.Conversation;
    using Microsoft.VisualStudio.TestTools.UnitTesting;

    [TestClass]
    [Obsolete]
    public class LocalFileStorageTest
    {
        private const string testDir = "./test-local";

        [TestInitialize]
        public void TestInitialize()
        {
            Directory.CreateDirectory(testDir);
        }

        [TestCleanup]
        public void TestCleanup()
        {
            Directory.Delete(testDir, true);
        }

        [TestMethod]
        public async Task List_EmptyFile()
        {
            File.WriteAllText(Path.Combine(testDir, ".notification.localstore.json"), "");
            var storage = new LocalFileStorage(testDir);
            var list = await storage.List(CancellationToken.None);

            Assert.IsNotNull(list);
            Assert.AreEqual(0, list.Length);
        }

        [TestMethod]
        public async Task List_NoFile()
        {
            File.Delete(Path.Combine(testDir, ".notification.localstore.json"));
            var storage = new LocalFileStorage(testDir);
            var list = await storage.List(CancellationToken.None);

            Assert.IsNotNull(list);
            Assert.AreEqual(0, list.Length);
        }
    }
}