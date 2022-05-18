namespace Microsoft.TeamsFx.Test.Conversation
{
    using Microsoft.Bot.Builder;
    using Microsoft.TeamsFx.Conversation;
    using Microsoft.VisualStudio.TestTools.UnitTesting;
    using Moq;

    [TestClass]
    public class CommandBotTest
    {
        [TestMethod]
        public void CreateCommandBot_ShouldUseMiddleware()
        {
            // Arrange
            var _mockAdapter = new Mock<BotAdapter>();

            // Act
            CommandBot bot = new CommandBot(_mockAdapter.Object,
                new CommandOptions()
                {
                    Commands = new List<ITeamsCommandHandler> { new TestCommandHandler(("test-command")) }
                });

            // Assert
            Assert.IsNotNull(bot.CommandHandlers);
            Assert.AreEqual(1, bot.CommandHandlers.Count);
            Assert.IsNotNull(_mockAdapter.Object.MiddlewareSet);
            Assert.AreEqual(1, _mockAdapter.Object.MiddlewareSet.Count());
            Assert.IsTrue(_mockAdapter.Object.MiddlewareSet.First() is CommandResponseMiddleware);
        }

        [TestMethod]
        public void RegisterCommand_ShouldSucceed()
        {
            // Arrange
            var _mockAdapter = new Mock<BotAdapter>();
            CommandBot bot = new CommandBot(_mockAdapter.Object,
                new CommandOptions()
                {
                    Commands = new List<ITeamsCommandHandler> { new TestCommandHandler(("test-command1")) }
                });

            // Act
            bot.RegisterCommand(new TestCommandHandler("test-command2"));

            // Assert
            Assert.IsNotNull(bot.CommandHandlers);
            Assert.AreEqual(2, bot.CommandHandlers.Count);
        }

        [TestMethod]
        public void RegisterCommands_ShouldSucceed()
        {
            // Arrange
            var _mockAdapter = new Mock<BotAdapter>();
            CommandBot bot = new CommandBot(_mockAdapter.Object, new CommandOptions());
            var Commands = new List<ITeamsCommandHandler>
            { 
                new TestCommandHandler(("test-command1")),
                new TestCommandHandler(("test-command2"))
            };

            // Act
            bot.RegisterCommands(Commands);

            // Assert
            Assert.IsNotNull(bot.CommandHandlers);
            Assert.AreEqual(2, bot.CommandHandlers.Count);
        }
    }
}
