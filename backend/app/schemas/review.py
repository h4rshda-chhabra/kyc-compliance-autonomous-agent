from pydantic import BaseModel


class SarDecisionRequest(BaseModel):
    decision: str
