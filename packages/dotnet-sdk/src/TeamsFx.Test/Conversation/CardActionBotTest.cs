namespace Microsoft.TeamsFx.Test.Conversation
{
    using Microsoft.Bot.Builder;
    using Microsoft.TeamsFx.Conversation;
    using Microsoft.VisualStudio.TestTools.UnitTesting;
    using Moq;
    using System.Collections.Generic;
    using System.Linq;

    [TestClass]
    public class CardActionBotTest
    {
        [TestMethod]
        public void CreateCardActionBot_ShouldUseMiddleware()
        {
            // Arrange
            var _mockAdapter = new Mock<BotAdapter>();

            // Act
            var bot = new CardActionBot(_mockAdapter.Object,
                new CardActionOptions()
                {
                    Actions = new List<IAdaptiveCardActionHandler> { new Mock<IAdaptiveCardActionHandler>().Object }
                });

            // Assert
            Assert.IsNotNull(bot.CardActionHandlers);
            Assert.AreEqual(1, bot.CardActionHandlers.Count);
            Assert.IsNotNull(_mockAdapter.Object.MiddlewareSet);
            Assert.AreEqual(1, _mockAdapter.Object.MiddlewareSet.Count());
            Assert.IsTrue(_mockAdapter.Object.MiddlewareSet.First() is CardActionMiddleware);
        }

        [TestMethod]
        public void RegisterHandler_ShouldSucceed()
        {
            // Arrange
            var _mockAdapter = new Mock<BotAdapter>();
            var bot = new CardActionBot(_mockAdapter.Object, new CardActionOptions());

            // Act
            bot.RegisterHandler(new Mock<IAdaptiveCardActionHandler>().Object);

            // Assert
            Assert.IsNotNull(bot.CardActionHandlers);
            Assert.AreEqual(1, bot.CardActionHandlers.Count);
        }

        [TestMethod]
        public void RegisterHandlers_ShouldSucceed()
        {
            // Arrange
            var _mockAdapter = new Mock<BotAdapter>();
            var bot = new CardActionBot(_mockAdapter.Object, new CardActionOptions());
            var handlers = new List<IAdaptiveCardActionHandler>
            {
                new Mock<IAdaptiveCardActionHandler>().Object,
                new Mock<IAdaptiveCardActionHandler>().Object
            };

            // Act
            bot.RegisterHandlers(handlers);

            // Assert
            Assert.IsNotNull(bot.CardActionHandlers);
            Assert.AreEqual(2, bot.CardActionHandlers.Count);
        }
    }
}
