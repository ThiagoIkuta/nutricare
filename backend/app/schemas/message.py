from pydantic import BaseModel


class MessageSend(BaseModel):
    content: str


class MessageResponse(BaseModel):
    id: int
    care_link_id: int
    sender_id: str
    message_type: str
    content: str | None = None
    attachment_url: str | None = None
    recipe_id: int | None = None
    recipe_snapshot: dict | None = None
    accepted_recipe_id: int | None = None
    sent_at: str
    read_at: str | None = None
    is_deleted: bool
    sender_username: str | None = None
