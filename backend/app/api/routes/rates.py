from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.models import RateItem
from app.db.session import get_db

router = APIRouter(prefix="/api/admin/rates", tags=["admin"])


class RateIn(BaseModel):
    region: str = "default"
    item_code: str
    item_name: str
    unit: str
    rate: float
    currency: str = "INR"


def _out(r: RateItem) -> dict:
    return {"id": r.id, "region": r.region, "item_code": r.item_code, "item_name": r.item_name,
            "unit": r.unit, "rate": r.rate, "currency": r.currency, "updated_at": r.updated_at}


@router.get("")
def list_rates(region: str = "default", db: Session = Depends(get_db)):
    return [_out(r) for r in db.query(RateItem).filter(RateItem.region == region).order_by(RateItem.item_code)]


@router.post("", status_code=201)
def create_rate(payload: RateIn, db: Session = Depends(get_db)):
    rate = RateItem(**payload.model_dump())
    db.add(rate)
    db.commit()
    db.refresh(rate)
    return _out(rate)


@router.put("/{rate_id}")
def update_rate(rate_id: int, payload: RateIn, db: Session = Depends(get_db)):
    rate = db.get(RateItem, rate_id)
    if rate is None:
        raise HTTPException(404, "Rate not found")
    for key, value in payload.model_dump().items():
        setattr(rate, key, value)
    db.commit()
    db.refresh(rate)
    return _out(rate)


@router.delete("/{rate_id}", status_code=204)
def delete_rate(rate_id: int, db: Session = Depends(get_db)):
    rate = db.get(RateItem, rate_id)
    if rate is None:
        raise HTTPException(404, "Rate not found")
    db.delete(rate)
    db.commit()
