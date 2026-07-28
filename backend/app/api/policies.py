from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.policy import SecurityPolicy
from app.schemas.policy import PolicyResponse, PolicyUpdate
from app.api.deps import require_admin
from typing import List

router = APIRouter(prefix="/policies", tags=["Security Policies"])

@router.get("/", response_model=List[PolicyResponse])
async def get_policies(
    current_admin = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Retrieves all security policies (Admin Only)."""
    result = await db.execute(select(SecurityPolicy))
    return result.scalars().all()

@router.put("/{policy_id}", response_model=PolicyResponse)
async def update_policy(
    policy_id: str,
    payload: PolicyUpdate,
    current_admin = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Updates a specific security policy (Admin Only)."""
    result = await db.execute(select(SecurityPolicy).where(SecurityPolicy.id == policy_id))
    policy = result.scalar_one_or_none()
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")
    
    policy.enabled = payload.enabled
    policy.threshold = payload.threshold
    await db.commit()
    await db.refresh(policy)
    return policy
