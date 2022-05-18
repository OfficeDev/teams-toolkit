namespace Microsoft.TeamsFx.Test.Conversation
{
    using Microsoft.Bot.Builder;
    using Microsoft.Bot.Schema;
    using Microsoft.TeamsFx.Conversation;
    using Microsoft.VisualStudio.TestTools.UnitTesting;
    using Moq;
    using System;
    using System.Threading.Tasks;

    [TestClass]
    public class CommandResponseMiddlewareTest
    {
        private readonly CommandResponseMiddleware _middleware;
        private readonly StringTrigger _stringTrigger = new("SampleTest");
        private readonly RegExpTrigger _regexTrigger = new(@"^test (.*?)$");

        public CommandResponseMiddlewareTest()
        {
            _middleware = new CommandResponseMiddleware();
        }

        [TestMethod]
        public async Task OnTurnAsync_TriggerCommandByString_ShouldSucceed()
        {
            // Arrange
            var command = new TestCommandHandler(new[] { _stringTrigger });
            _middleware.CommandHandlers.Add(command);
            var input = "SampleTest";
            var activity = CreateMessageActivity(input);

            var mockTurnContext = new Mock<ITurnContext>();
            mockTurnContext.Setup(tc => tc.Activity).Returns(activity);

            // Act
            await _middleware.OnTurnAsync(mockTurnContext.Object, (ct) => { return Task.CompletedTask; }, CancellationToken.None);

            // Assert
            Assert.IsTrue(command.IsTriggered);
            Assert.IsNotNull(command.ReceivedMessage);
            Assert.AreEqual(command.ReceivedMessage.Text, input, true);
        }

        [TestMethod]
        public async Task OnTurnAsync_TriggerCommandByRegex_ShouldSucceed()
        {
            // Arrange
            var command = new TestCommandHandler(new[] { _regexTrigger });
            _middleware.CommandHandlers.Add(command);
            var input = "Test fake-value";
            var activity = CreateMessageActivity(input);

            var mockTurnContext = new Mock<ITurnContext>();
            mockTurnContext.Setup(tc => tc.Activity).Returns(activity);

            // Act
            await _middleware.OnTurnAsync(mockTurnContext.Object, (ct) => { return Task.CompletedTask; }, CancellationToken.None);

            // Assert
            Assert.IsTrue(command.IsTriggered);
            Assert.IsNotNull(command.ReceivedMessage);
            Assert.AreEqual(command.ReceivedMessage.Text, input, true);
            Assert.IsNotNull(command.ReceivedMessage.Matches);
            Assert.AreEqual(command.ReceivedMessage.Matches[0].Groups[1].Value, "fake-value");
        }

        [TestMethod]
        public async Task OnTurnAsync_MultiMatches_TriggerTheFirstMatch()
        {
            // Arrange
            var command1 = new TestCommandHandler(new[] { _regexTrigger });
            var command2 = new TestCommandHandler(new[] { _regexTrigger });
            _middleware.CommandHandlers.Add(command1);
            _middleware.CommandHandlers.Add(command2);

            var input = "Test fake-value";
            var activity = CreateMessageActivity(input);

            var mockTurnContext = new Mock<ITurnContext>();
            mockTurnContext.Setup(tc => tc.Activity).Returns(activity);

            // Act
            await _middleware.OnTurnAsync(mockTurnContext.Object, (ct) => { return Task.CompletedTask; }, CancellationToken.None);

            // Assert
            Assert.IsTrue(command1.IsTriggered);
            Assert.IsFalse(command2.IsTriggered);
        }

        [TestMethod]
        public async Task OnTurnAsync_MultiStringPatterns_ShouldTrigger()
        {
            // Arrange
            var command = new TestCommandHandler(new []
            { 
                new StringTrigger("test1"),
                new StringTrigger("test2")
            });

            _middleware.CommandHandlers.Add(command);

            var input = "test2";
            var activity = CreateMessageActivity(input);

            var mockTurnContext = new Mock<ITurnContext>();
            mockTurnContext.Setup(tc => tc.Activity).Returns(activity);

            // Act
            await _middleware.OnTurnAsync(mockTurnContext.Object, (ct) => { return Task.CompletedTask; }, CancellationToken.None);

            // Assert
            Assert.IsTrue(command.IsTriggered);
            Assert.IsNotNull(command.ReceivedMessage);
            Assert.AreEqual(command.ReceivedMessage.Text, input, true);
            Assert.IsTrue(command.IsTriggered);
        }

        [TestMethod]
        public async Task OnTurnAsync_InputNotMatch_ShouldSkipped()
        {
            // Arrange
            var command = new TestCommandHandler(new[] { _stringTrigger });
            _middleware.CommandHandlers.Add(command);
            var input = "Invalid input";
            var activity = CreateMessageActivity(input);

            var mockTurnContext = new Mock<ITurnContext>();
            mockTurnContext.Setup(tc => tc.Activity).Returns(activity);

            // Act
            await _middleware.OnTurnAsync(mockTurnContext.Object, (ct) => { return Task.CompletedTask; }, CancellationToken.None);

            // Assert
            Assert.IsFalse(command.IsTriggered);
        }

        private static Activity CreateMessageActivity(string text)
        {
            return new Activity()
            {
                Type = ActivityTypes.Message,
                Text = text,
                Recipient = new ChannelAccount()
                {
                    Id = Guid.NewGuid().ToString("N")
                }
            };
        }
    }
}
