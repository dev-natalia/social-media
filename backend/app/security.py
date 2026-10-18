from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, InvalidHashError

# 19 MiB de memória por hash (mínimo da OWASP): cabe na máquina de 256 MB do Fly.
_hasher = PasswordHasher(time_cost=2, memory_cost=19456, parallelism=1)


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return _hasher.verify(password_hash, password)
    except (VerifyMismatchError, InvalidHashError):
        return False
