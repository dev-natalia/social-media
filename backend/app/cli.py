import getpass
import sys

from sqlalchemy.orm import Session

from app.config import get_settings
from app.db import make_engine
from app.seed import create_user


def main(argv: list[str]) -> int:
    if len(argv) != 2 or argv[0] != "create-admin":
        print("uso: python -m app.cli create-admin EMAIL")
        return 2
    password = getpass.getpass("Senha: ")
    if len(password) < 8:
        print("A senha precisa ter pelo menos 8 caracteres.")
        return 1
    engine = make_engine(get_settings().database_url)
    with Session(engine) as db:
        try:
            create_user(db, argv[1], password, is_admin=True)
        except ValueError:
            print("E-mail já cadastrado.")
            return 1
        db.commit()
    print("Admin criada.")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
