"""Minimal GoHighLevel v2 API client.

Auth: pass a Private Integration Token (PIT) as `token`.
Docs: https://highlevel.stoplight.io/docs/integrations
"""

from __future__ import annotations

import os
from typing import Any

import requests

BASE_URL = "https://services.leadconnectorhq.com"
API_VERSION = "2021-07-28"


class GHLError(RuntimeError):
    pass


class GHLClient:
    def __init__(
        self,
        token: str | None = None,
        location_id: str | None = None,
        timeout: int = 30,
    ) -> None:
        self.token = token or os.environ.get("GHL_API_TOKEN", "")
        self.location_id = location_id or os.environ.get("GHL_LOCATION_ID", "")
        self.timeout = timeout
        if not self.token:
            raise GHLError("GHL_API_TOKEN not set")

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self.token}",
            "Version": API_VERSION,
            "Accept": "application/json",
            "Content-Type": "application/json",
        }

    def _req(self, method: str, path: str, **kwargs: Any) -> dict[str, Any]:
        url = f"{BASE_URL}{path}"
        resp = requests.request(
            method, url, headers=self._headers(), timeout=self.timeout, **kwargs
        )
        if resp.status_code >= 400:
            raise GHLError(f"{method} {path} -> {resp.status_code}: {resp.text[:500]}")
        if not resp.content:
            return {}
        return resp.json()

    # --- Contacts -------------------------------------------------------------

    def create_contact(
        self,
        first_name: str = "",
        last_name: str = "",
        email: str = "",
        phone: str = "",
        tags: list[str] | None = None,
        source: str = "agent",
    ) -> dict[str, Any]:
        body = {
            "locationId": self.location_id,
            "firstName": first_name,
            "lastName": last_name,
            "email": email,
            "phone": phone,
            "tags": tags or [],
            "source": source,
        }
        return self._req("POST", "/contacts/", json=body)

    def search_contacts(self, query: str, limit: int = 20) -> dict[str, Any]:
        params = {"locationId": self.location_id, "query": query, "limit": limit}
        return self._req("GET", "/contacts/", params=params)

    def add_tag(self, contact_id: str, tags: list[str]) -> dict[str, Any]:
        return self._req(
            "POST", f"/contacts/{contact_id}/tags", json={"tags": tags}
        )

    # --- Conversations --------------------------------------------------------

    def send_sms(self, contact_id: str, message: str) -> dict[str, Any]:
        body = {"type": "SMS", "contactId": contact_id, "message": message}
        return self._req("POST", "/conversations/messages", json=body)

    def send_email(
        self, contact_id: str, subject: str, html: str
    ) -> dict[str, Any]:
        body = {
            "type": "Email",
            "contactId": contact_id,
            "subject": subject,
            "html": html,
        }
        return self._req("POST", "/conversations/messages", json=body)

    # --- Opportunities --------------------------------------------------------

    def create_opportunity(
        self,
        pipeline_id: str,
        stage_id: str,
        name: str,
        contact_id: str,
        monetary_value: float = 0,
        status: str = "open",
    ) -> dict[str, Any]:
        body = {
            "pipelineId": pipeline_id,
            "locationId": self.location_id,
            "name": name,
            "pipelineStageId": stage_id,
            "status": status,
            "contactId": contact_id,
            "monetaryValue": monetary_value,
        }
        return self._req("POST", "/opportunities/", json=body)

    def list_pipelines(self) -> dict[str, Any]:
        params = {"locationId": self.location_id}
        return self._req("GET", "/opportunities/pipelines", params=params)
