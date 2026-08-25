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
    sent_at: str
    read_at: str | None = None
    is_deleted: bool
    sender_username: str | None = None
