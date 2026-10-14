"""Minimal Gmail REST client (no Google SDK, just requests + OAuth refresh token).

Auth: a one-time OAuth consent (scripts/gmail_auth.py) yields a refresh
token; each run exchanges it for a short-lived access token. Scope used:
gmail.modify (read, send, label) — the narrowest scope that covers the
recruiter's needs.
"""

from __future__ import annotations

import base64
import os
import re
import time
from email.message import EmailMessage
from html import unescape
from typing import Any

import requests

TOKEN_URL = "https://oauth2.googleapis.com/token"
API_BASE = "https://gmail.googleapis.com/gmail/v1/users/me"


class GmailError(RuntimeError):
    pass


class GmailClient:
    def __init__(self, timeout: int = 30) -> None:
        self.client_id = os.environ.get("GMAIL_CLIENT_ID", "")
        self.client_secret = os.environ.get("GMAIL_CLIENT_SECRET", "")
        self.refresh_token = os.environ.get("GMAIL_REFRESH_TOKEN", "")
        self.timeout = timeout
        self._access_token = ""
        self._token_expiry = 0.0
        if not (self.client_id and self.client_secret and self.refresh_token):
            raise GmailError(
                "GMAIL_CLIENT_ID / GMAIL_CLIENT_SECRET / GMAIL_REFRESH_TOKEN not set"
            )

    # --- Auth -----------------------------------------------------------------

    def _token(self) -> str:
        if self._access_token and time.time() < self._token_expiry - 60:
            return self._access_token
        resp = requests.post(
            TOKEN_URL,
            data={
                "client_id": self.client_id,
                "client_secret": self.client_secret,
                "refresh_token": self.refresh_token,
                "grant_type": "refresh_token",
            },
            timeout=self.timeout,
        )
        if resp.status_code >= 400:
            raise GmailError(f"token refresh failed: {resp.status_code} {resp.text[:300]}")
        data = resp.json()
        self._access_token = data["access_token"]
        self._token_expiry = time.time() + int(data.get("expires_in", 3600))
        return self._access_token

    def _req(self, method: str, path: str, **kwargs: Any) -> dict[str, Any]:
        resp = requests.request(
            method,
            f"{API_BASE}{path}",
            headers={"Authorization": f"Bearer {self._token()}"},
            timeout=self.timeout,
            **kwargs,
        )
        if resp.status_code >= 400:
            raise GmailError(f"{method} {path} -> {resp.status_code}: {resp.text[:500]}")
        return resp.json() if resp.content else {}

    # --- Read -----------------------------------------------------------------

    def search(self, query: str, max_results: int = 50) -> list[str]:
        data = self._req(
            "GET", "/messages", params={"q": query, "maxResults": max_results}
        )
        return [m["id"] for m in data.get("messages", [])]

    def get_message(self, msg_id: str) -> dict[str, Any]:
        return self._req("GET", f"/messages/{msg_id}", params={"format": "full"})

    @staticmethod
    def headers(message: dict[str, Any]) -> dict[str, str]:
        return {
            h["name"].lower(): h["value"]
            for h in message.get("payload", {}).get("headers", [])
        }

    @staticmethod
    def body_text(message: dict[str, Any], limit: int = 8000) -> str:
        """Best-effort plain text: prefer text/plain parts, fall back to
        stripped text/html."""

        def walk(part: dict[str, Any], mime: str) -> list[str]:
            found = []
            if part.get("mimeType") == mime and part.get("body", {}).get("data"):
                found.append(_b64url_decode(part["body"]["data"]))
            for sub in part.get("parts", []) or []:
                found.extend(walk(sub, mime))
            return found

        payload = message.get("payload", {})
        text = "\n".join(walk(payload, "text/plain"))
        if not text.strip():
            html = "\n".join(walk(payload, "text/html"))
            text = _strip_html(html)
        return text.strip()[:limit]

    # --- Labels ---------------------------------------------------------------

    def ensure_label(self, name: str) -> str:
        for label in self._req("GET", "/labels").get("labels", []):
            if label["name"] == name:
                return label["id"]
        created = self._req("POST", "/labels", json={"name": name})
        return created["id"]

    def add_label(self, msg_id: str, label_id: str) -> None:
        self._req(
            "POST", f"/messages/{msg_id}/modify", json={"addLabelIds": [label_id]}
        )

    # --- Send -----------------------------------------------------------------

    def send(
        self,
        to: str,
        subject: str,
        body: str,
        thread_id: str | None = None,
        in_reply_to: str | None = None,
        references: str | None = None,
    ) -> dict[str, Any]:
        msg = EmailMessage()
        msg["To"] = to
        msg["Subject"] = subject
        if in_reply_to:
            msg["In-Reply-To"] = in_reply_to
            msg["References"] = f"{references} {in_reply_to}".strip() if references else in_reply_to
        msg.set_content(body)
        raw = base64.urlsafe_b64encode(msg.as_bytes()).decode()
        payload: dict[str, Any] = {"raw": raw}
        if thread_id:
            payload["threadId"] = thread_id
        return self._req("POST", "/messages/send", json=payload)


def _b64url_decode(data: str) -> str:
    pad = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + pad).decode("utf-8", errors="replace")


def _strip_html(html: str) -> str:
    html = re.sub(r"(?is)<(script|style).*?</\1>", " ", html)
    html = re.sub(r"(?i)<br\s*/?>|</p>|</div>|</tr>", "\n", html)
    text = re.sub(r"<[^>]+>", " ", html)
    text = unescape(text)
    return re.sub(r"[ \t]+", " ", re.sub(r"\n\s+", "\n", text))
