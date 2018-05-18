import uuid
import sqlite3
from enum import Enum
from contextlib import closing, contextmanager

import base58
from rdkit import Chem


def issue_text_id():
    return base58.b58encode(uuid.uuid4().bytes).decode()


@contextmanager
def transaction(conn):
    try:
        with closing(conn.cursor()) as cur:
            yield cur
    except Exception as e:
        conn.rollback()
        raise e
    else:
        conn.commit()


class Phase(Enum):
    PENDING = "pending"
    IN_PROGRESS = "in-progress"
    DONE = "done"
    ERROR = "error"


schema = [
    """
    CREATE TABLE IF NOT EXISTS file (
        id         INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        text_id    TEXT    NOT NULL,
        name       TEXT    NOT NULL,
        created_at INTEGER NOT NULL,
        desalt     INTEGER NOT NULL,
        gen3D      INTEGER NOT NULL,
        is3D       INTEGER NOT NULL,
        total      INTEGER,
        phase      TEXT    NOT NULL
    )
    """,
    """
    CREATE INDEX IF NOT EXISTS file__text_id ON file(text_id)
    """,
    """
    CREATE TABLE IF NOT EXISTS molecule (
        id         INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        file_id    INTEGER NOT NULL REFERENCES file(id) ON DELETE CASCADE ON UPDATE CASCADE,
        nth        INTEGER NOT NULL,
        forcefield TEXT,
        name       TEXT    NOT NULL,
        mol        MOL     NOT NULL,
        UNIQUE (file_id, nth)
    )
    """,
    """
    CREATE INDEX IF NOT EXISTS molecule__file_id ON molecule(file_id)
    """,
    """
    CREATE TABLE IF NOT EXISTS file_error (
        id      INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        file_id INTEGER NOT NULL REFERENCES file(id) ON DELETE CASCADE ON UPDATE CASCADE,
        error   TEXT    NOT NULL
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS calc (
        id          INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        file_id     INTEGER NOT NULL REFERENCES file(id) ON DELETE CASCADE ON UPDATE CASCADE,
        text_id     TEXT    NOT NULL,
        done        INTEGER NOT NULL,
        current     INTEGER NOT NULL,
        created_at  INTEGER NOT NULL
    )
    """,
    """
    CREATE INDEX IF NOT EXISTS calc__text_id ON calc(text_id)
    """,
    """
    CREATE TABLE IF NOT EXISTS descriptor (
        id      INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        calc_id INTEGER NOT NULL REFERENCES calc(id) ON DELETE CASCADE ON UPDATE CASCADE,
        name    TEXT NOT NULL,
        max     NUMBER,
        min     NUMBER,
        mean    NUMBER,
        std     NUMBER
    )
    """,
    """
    CREATE INDEX IF NOT EXISTS descriptor__calc_id ON descriptor(calc_id)
    """,
    """
    CREATE TABLE IF NOT EXISTS result (
        calc_id       INTEGER NOT NULL REFERENCES calc(id) ON DELETE CASCADE ON UPDATE CASCADE,
        molecule_id   INTEGER NOT NULL REFERENCES molecule(id) ON DELETE CASCADE ON UPDATE CASCADE,
        descriptor_id INTEGER NOT NULL REFERENCES descriptor(id) ON DELETE CASCADE ON UPDATE CASCADE,
        value   NUMBER,
        error   TEXT,
        UNIQUE (calc_id, molecule_id, descriptor_id)
    )
    """,  # noqa: E501
    """
    CREATE TABLE IF NOT EXISTS calc_error (
        id          INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        calc_id     INTEGER NOT NULL REFERENCES calc(id) ON DELETE CASCADE ON UPDATE CASCADE,
        molecule_id INTEGER REFERENCES molecule(id) ON DELETE CASCADE ON UPDATE CASCADE,
        error       TEXT NOT NULL
    )
    """,
]


def adapt_mol(m):
    return m.ToBinary()


def convert_mol(b):
    return Chem.Mol(b)


@contextmanager
def connect(db):
    sqlite_args = {
        "detect_types": sqlite3.PARSE_DECLTYPES,
        "isolation_level": "DEFERRED",
    }

    sqlite3.register_adapter(Chem.Mol, adapt_mol)
    sqlite3.register_converter("MOL", convert_mol)

    with sqlite3.connect(db, **sqlite_args) as conn:
        conn.text_factory = str
        conn.execute("PRAGMA foreign_keys = ON")
        with transaction(conn) as cur:
            for s in schema:
                cur.execute(s)

        yield conn
