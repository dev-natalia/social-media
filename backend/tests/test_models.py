from datetime import date

from sqlalchemy import select

from app.models import CHECKLIST_KEYS, Client, ContentType, Post, PostStatus, User


def _setup(db):
    user = User(email="a@x.com", password_hash="h")
    db.add(user)
    db.flush()
    client = Client(user_id=user.id, name="Padaria", color="#aabbcc")
    ctype = ContentType(user_id=user.id, name="Dica", color="#3b82f6")
    db.add_all([client, ctype])
    db.flush()
    return user, client, ctype


def test_post_defaults(db_session):
    _, client, ctype = _setup(db_session)
    post = Post(client_id=client.id, title="Oi", date=date(2026, 11, 3), content_type_id=ctype.id)
    db_session.add(post)
    db_session.commit()
    db_session.refresh(post)
    assert post.status == PostStatus.a_fazer
    assert post.checklist == {k: False for k in CHECKLIST_KEYS}
    assert post.description == ""


def test_delete_client_cascades_posts(db_session):
    _, client, ctype = _setup(db_session)
    db_session.add(Post(client_id=client.id, title="Oi", date=date(2026, 11, 3), content_type_id=ctype.id))
    db_session.commit()
    db_session.delete(client)
    db_session.commit()
    assert db_session.scalars(select(Post)).all() == []
