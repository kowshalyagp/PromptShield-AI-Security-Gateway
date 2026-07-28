from pydantic import BaseModel

class PolicyUpdate(BaseModel):
    enabled: bool
    threshold: int

class PolicyResponse(BaseModel):
    id: str
    title: str
    description: str
    enabled: bool
    threshold: int

    class Config:
        from_attributes = True
