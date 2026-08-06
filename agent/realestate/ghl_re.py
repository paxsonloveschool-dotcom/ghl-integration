"""Real estate extended GHL client."""
from __future__ import annotations

from typing import Any

from ..ghl import GHLClient


class REGHLClient(GHLClient):
    """GHL client extended with real estate-specific operations."""

    def get_contact(self, contact_id: str) -> dict[str, Any]:
        return self._req("GET", f"/contacts/{contact_id}")

    def update_contact(self, contact_id: str, **fields: Any) -> dict[str, Any]:
        return self._req("PUT", f"/contacts/{contact_id}", json=fields)

    def remove_tag(self, contact_id: str, tags: list[str]) -> dict[str, Any]:
        return self._req("DELETE", f"/contacts/{contact_id}/tags", json={"tags": tags})

    def create_note(self, contact_id: str, body: str) -> dict[str, Any]:
        return self._req("POST", f"/contacts/{contact_id}/notes", json={"body": body})

    def get_conversation_by_contact(self, contact_id: str) -> dict[str, Any]:
        params = {"locationId": self.location_id, "contactId": contact_id}
        return self._req("GET", "/conversations/search", params=params)

    def list_conversations(self, limit: int = 20) -> dict[str, Any]:
        params = {"locationId": self.location_id, "limit": limit}
        return self._req("GET", "/conversations/search", params=params)

    def list_opportunities(
        self,
        pipeline_id: str | None = None,
        stage_id: str | None = None,
        limit: int = 50,
    ) -> dict[str, Any]:
        params: dict[str, Any] = {"location_id": self.location_id, "limit": limit}
        if pipeline_id:
            params["pipeline_id"] = pipeline_id
        if stage_id:
            params["pipeline_stage_id"] = stage_id
        return self._req("GET", "/opportunities/search", params=params)

    def update_opportunity(self, opportunity_id: str, **fields: Any) -> dict[str, Any]:
        return self._req("PUT", f"/opportunities/{opportunity_id}", json=fields)

    def get_location_info(self) -> dict[str, Any]:
        return self._req("GET", f"/locations/{self.location_id}")
