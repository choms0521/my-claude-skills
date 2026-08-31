#!/usr/bin/env python3
"""PostToolUse hook: nudge a docmost re-auth when a docmost MCP call fails auth.

Wired into ~/.claude/settings.json as a PostToolUse hook with matcher
`mcp__docmost__.*`. It reads the hook payload on stdin, and if the docmost tool
response looks like an authentication/token-expiry failure, it emits a single
`additionalContext` line telling the model to run the reauth-docmost skill.

Design rule: this hook must NEVER disrupt normal tool flow. Any parsing problem,
missing field, or unexpected shape results in a clean exit 0 with no output.
It only ever *adds* a reminder; it never blocks a tool.
"""

import json
import sys

# Substrings (lowercased) that indicate an auth/token failure in a tool response.
AUTH_FAILURE_MARKERS = (
    "401",
    "unauthorized",
    "token expired",
    "token has expired",
    "jwt expired",
    "expired token",
    "authentication failed",
    "authentication required",
    "not authenticated",
    "invalid token",
    "invalid authorization",
    "invalid credentials",
)

REMINDER = (
    "docmost MCP returned what looks like an authentication/token-expiry error. "
    "The docmost auth token is likely stale. Run the reauth-docmost skill "
    "(/reauth-docmost) to refresh it from the logged-in Chrome session, then "
    "reconnect the docmost MCP. If reauth reports the browser holds the same "
    "token (exit 4) or an expired one (exit 3), tell the user to re-login at "
    "http://172.31.79.201:3000 first."
)


def looks_like_auth_failure(payload):
    tool_name = payload.get("tool_name", "")
    if not isinstance(tool_name, str) or not tool_name.startswith("mcp__docmost__"):
        return False

    response = payload.get("tool_response")
    if response is None:
        return False

    # Serialize whatever shape the response has, then scan case-insensitively.
    try:
        blob = response if isinstance(response, str) else json.dumps(response, ensure_ascii=False)
    except (TypeError, ValueError):
        blob = str(response)
    blob = blob.lower()

    return any(marker in blob for marker in AUTH_FAILURE_MARKERS)


def main():
    try:
        raw = sys.stdin.read()
        payload = json.loads(raw) if raw.strip() else {}
    except (ValueError, OSError):
        return 0

    try:
        if not looks_like_auth_failure(payload):
            return 0
        print(json.dumps({
            "hookSpecificOutput": {
                "hookEventName": "PostToolUse",
                "additionalContext": REMINDER,
            }
        }))
    except Exception:
        # Never let a hook error interfere with the tool flow.
        return 0
    return 0


if __name__ == "__main__":
    sys.exit(main())
