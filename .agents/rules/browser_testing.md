# Browser Testing Rule

Do NOT automatically run the `browser_subagent` or open browser testing sessions unless the user explicitly requests it in their prompt (e.g. "open browser", "test on browser", "check browser").

Running browser subagents automatically consumes extra tokens and exhausts rate limits. Always wait for explicit user instructions before triggering browser automation.
