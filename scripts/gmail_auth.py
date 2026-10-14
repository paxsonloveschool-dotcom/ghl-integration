"""One-time helper: mint a Gmail refresh token for the recruiter.

Prereqs (5 minutes in Google Cloud Console):
1. Create a project, enable the Gmail API.
2. Create an OAuth client ID of type "Desktop app"; note client ID + secret.
3. Add the recruiting inbox as a test user on the OAuth consent screen.

Run locally (NOT in CI — it opens a browser):
    GMAIL_CLIENT_ID=... GMAIL_CLIENT_SECRET=... python scripts/gmail_auth.py

It prints the GMAIL_REFRESH_TOKEN to add to your GitHub Actions secrets.
"""

from __future__ import annotations

import http.server
import os
import sys
import threading
import urllib.parse
import webbrowser

import requests

SCOPE = "https://www.googleapis.com/auth/gmail.modify"
PORT = 8765
REDIRECT = f"http://localhost:{PORT}/"

_code: list[str] = []


class _Handler(http.server.BaseHTTPRequestHandler):
    def do_GET(self) -> None:  # noqa: N802 - http.server API
        qs = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
        if "code" in qs:
            _code.append(qs["code"][0])
            body = b"Authorized. You can close this tab and return to the terminal."
        else:
            body = b"No code in callback."
        self.send_response(200)
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *args: object) -> None:
        pass


def main() -> int:
    client_id = os.environ.get("GMAIL_CLIENT_ID", "")
    client_secret = os.environ.get("GMAIL_CLIENT_SECRET", "")
    if not (client_id and client_secret):
        print("Set GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET first.", file=sys.stderr)
        return 1

    auth_url = "https://accounts.google.com/o/oauth2/v2/auth?" + urllib.parse.urlencode(
        {
            "client_id": client_id,
            "redirect_uri": REDIRECT,
            "response_type": "code",
            "scope": SCOPE,
            "access_type": "offline",
            "prompt": "consent",
        }
    )

    server = http.server.HTTPServer(("localhost", PORT), _Handler)
    threading.Thread(target=server.handle_request, daemon=True).start()

    print(f"Open this URL and sign in with the recruiting inbox:\n\n{auth_url}\n")
    webbrowser.open(auth_url)

    while not _code:
        pass
    server.server_close()

    resp = requests.post(
        "https://oauth2.googleapis.com/token",
        data={
            "client_id": client_id,
            "client_secret": client_secret,
            "code": _code[0],
            "grant_type": "authorization_code",
            "redirect_uri": REDIRECT,
        },
        timeout=30,
    )
    resp.raise_for_status()
    token = resp.json().get("refresh_token", "")
    if not token:
        print(f"No refresh token in response: {resp.json()}", file=sys.stderr)
        return 1

    print("Add this to your GitHub Actions secrets:\n")
    print(f"GMAIL_REFRESH_TOKEN={token}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
