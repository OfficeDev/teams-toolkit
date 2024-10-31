using Microsoft.Teams.AI.State;
using Microsoft.Teams.AI;

namespace {{SafeProjectName}}
{
    public class APIBot : Application<TurnState>
    {
        public APIBot(ApplicationOptions<TurnState> options) : base(options)
        {
            // Registering action handlers that will be hooked up to the planner.
            AI.ImportActions(new APIActions());
        }
    }
}