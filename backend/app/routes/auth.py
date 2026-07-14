from fastapi import APIRouter

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login")
def login() -> dict:
    return {"access_token": "dummy-token", "token_type": "bearer"}


@router.post("/logout")
def logout() -> dict:
    return {"detail": "logged out"}


@router.get("/me")
def get_current_user() -> dict:
    return {"id": "dummy-user-id", "email": "demo@example.com", "role": "reviewer"}
