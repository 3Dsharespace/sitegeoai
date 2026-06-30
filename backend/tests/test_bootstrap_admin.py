"""Bootstrap admin promotion on startup."""

from app.core.config import settings
from app.core.plans import PLAN_ADMIN
from app.core.security import ROLE_ADMIN
from app.db.init_db import _bootstrap_admin
from app.db.models import User
from app.db.session import SessionLocal, engine
from app.db.models import Base


def test_bootstrap_admin_promotes_user(monkeypatch):
    Base.metadata.create_all(bind=engine)
    email = "bootstrap-admin@test.com"
    monkeypatch.setattr(settings, "BOOTSTRAP_ADMIN_EMAIL", email)
    db = SessionLocal()
    try:
        db.add(User(name="Bootstrap", email=email, role="user", plan="free"))
        db.commit()
        _bootstrap_admin(db)
        db.commit()
        user = db.query(User).filter(User.email == email).one()
        assert user.role == ROLE_ADMIN
        assert user.plan == PLAN_ADMIN
    finally:
        db.query(User).filter(User.email == email).delete()
        db.commit()
        db.close()
