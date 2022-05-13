// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

namespace Microsoft.TeamsFx.Conversation
{
    using Microsoft.Bot.Builder;

    /// <summary>
    /// Represents a command bot to handle commands received from Teams.
    /// </summary>
    public class CommandBot
    {
        private readonly BotAdapter _adapter;
        private readonly CommandResponseMiddleware _middleware;

        /// <summary>
        /// Initialize a new instance of <see cref="CommandBot"/>.
        /// </summary>
        /// <param name="adapter"></param>
        /// <param name="options"></param>
        /// <exception cref="ArgumentNullException"><paramref name="options"/> is null.</exception>
        public CommandBot(BotAdapter adapter, CommandOptions options)
        {
            _adapter = adapter ?? throw new ArgumentNullException(nameof(adapter));

            if (options == null)
            {
                throw new ArgumentNullException(nameof(options));
            }

            _middleware = new CommandResponseMiddleware(options.Commands);
            _adapter.Use(_middleware);
        }

        /// <summary>
        /// Register a command to the command bot.
        /// </summary>
        /// <param name="commandHandler">A command handler implements <seealso cref="ITeamsCommandHandler"/>.</param>
        /// <exception cref="ArgumentNullException"><paramref name="commandHandler"/>is null.</exception>
        public void RegisterCommand(ITeamsCommandHandler commandHandler)
        {
            if (commandHandler == null)
            {
                throw new ArgumentNullException(nameof(commandHandler));
            }

            _middleware.CommandHandlers.Add(commandHandler);
        }

        /// <summary>
        /// Register a set of commands to the command bot.
        /// </summary>
        /// <param name="commandHandlers"></param>
        /// <exception cref="ArgumentException"><paramref name="commandHandlers"/> is null or empty. </exception>
        public void RegisterCommands(IList<ITeamsCommandHandler> commandHandlers)
        {
            if (commandHandlers == null && !commandHandlers.Any())
            {
                throw new ArgumentException("There is no command handler to be registered.", nameof(commandHandlers));
            }

            foreach (var command in commandHandlers)
            {
                _middleware.CommandHandlers.Add(command);
            }
        }
    }
}
