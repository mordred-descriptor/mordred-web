from tornado import gen, web
from cgi import parse_header
import re
from io import BytesIO
import os
import time
from rdkit import Chem
from rdkit.Chem import Draw
from tempfile import NamedTemporaryFile
from rdkit.Chem.rdDistGeom import EmbedMolecule
from rdkit.Chem.rdForceFieldHelpers import MMFFOptimizeMolecule, UFFOptimizeMolecule

from ..db import issue_text_id, transaction
from .common import RequestHandler, SSEHandler
from ..job_queue import SingleWorker, Worker, Task


SMI_FIELDS = re.compile(br'^(\S+)\s+(.+)?')


def read_smiles(bs):
    for i, line in enumerate(BytesIO(bs), 1):
        fields = SMI_FIELDS.match(line)
        if fields is None:
            yield ValueError('parse failed on line {}'.format(i)), None
            continue

        smi, name = fields.groups()
        if name is None:
            name = smi

        mol = Chem.MolFromSmiles(smi)
        if mol is None:
            yield ValueError('SMILES parse failed on line {}: {}'.format(
                i, line.decode('UTF-8').strip())
            ), None
            continue
        yield mol, name.decode('UTF-8')


def read_sdf(bs):
    with NamedTemporaryFile() as tmp:
        tmp.write(bs)
        tmp.flush()

        for i, mol in enumerate(Chem.SDMolSupplier(tmp.name, removeHs=False), 1):
            if mol is None:
                yield ValueError('SDF parser failed on {}-th molecule'.format(i)), None
                continue

            if mol.HasProp('_Name'):
                name = mol.GetProp('_Name')
            else:
                name = Chem.MolToSmiles(mol)

            yield mol, name


class ParseWorker(SingleWorker):
    def __init__(self, body, reader):
        self.body = body
        self.reader = reader

    def __call__(self):
        mols, errors = [], []
        for mol, name in self.reader(self.body):
            if not isinstance(mol, Chem.Mol):
                errors.append(mol)
                continue

            mols.append((mol, name))

        return mols, errors


class ParseTask(Task):
    def __init__(self, text_id, filename, body, gen3D, desalt, conn, reader):
        self.conn = conn
        self.text_id = text_id
        self.filename = filename
        self.body = body
        self.gen3D = gen3D
        self.desalt = desalt
        self.reader = reader

    def worker(self):
        return ParseWorker(
            body=self.body,
            reader=self.reader,
        )

    def insert_file(self):
        is3D = self.reader != read_smiles or self.gen3D

        with transaction(self.conn) as cur:
            cur.execute('''
            INSERT INTO file (text_id, name, created_at, gen3D, is3D, desalt, done)
            VALUES (?, ?, ?, ?, ?, ?, 0)
            ''', (self.text_id, self.filename, int(time.time()), self.gen3D, is3D, self.desalt))
            self.file_id = cur.lastrowid

    def on_task_end(self, v):
        self.mols, errors = v
        with transaction(self.conn) as cur:
            cur.execute(
                'UPDATE file SET total = ? WHERE id = ?',
                (len(self.mols), self.file_id),
            )
            for err in errors:
                cur.execute('''
                INSERT INTO file_error (file_id, error)
                VALUES (?, ?)
                ''', (self.file_id, str(err)))

    def next_task(self):
        return PrepareTask(
            file_id=self.file_id,
            mols=self.mols,
            gen3D=self.gen3D,
            desalt=self.desalt,
            conn=self.conn,
        )


class PrepareTask(Task):
    def __init__(self, file_id, mols, gen3D, desalt, conn):
        self.file_id = file_id
        self.mols = mols
        self.gen3D = gen3D
        self.desalt = desalt
        self.conn = conn
        self.i = 0

    def worker(self):
        return PrepareWorker(
            mols=self.mols,
            gen3D=self.gen3D,
            desalt=self.desalt,
        )

    def on_task_end(self, result):
        uff, mol, name = result
        if self.gen3D:
            ff = "UFF" if uff else "MMFF"
        else:
            ff = None
        with transaction(self.conn) as cur:
            cur.execute('''
            INSERT INTO molecule (file_id, nth, forcefield, name, mol)
            VALUES (?, ?, ?, ?, ?)
            ''', (self.file_id, self.i, ff, name, mol))

        self.i += 1

    def on_task_error(self, err):
        with transaction(self.conn) as cur:
            cur.execute(
                'UPDATE file SET total = total - 1 WHERE id = ?',
                (self.file_id,),
            )
            cur.execute(
                'INSERT INTO file_error (file_id, error) VALUES (?, ?)',
                (self.file_id, str(err)),
            )

    def on_end(self):
        with transaction(self.conn) as cur:
            cur.execute(
                'UPDATE file SET done = ? WHERE id = ?',
                (True, self.file_id),
            )


def desalt(mol):
    mols = Chem.GetMolFrags(mol, asMols=True)
    return max(mols, key=lambda m: m.GetNumAtoms())


def optimize(mol, f):
    for _ in range(10):
        r = f(mol, maxIters=1000)
        if r == 0:
            return
        elif r != 1:
            raise ValueError("{} failed".format(f.__name__))

    raise ValueError("{} optimize not converged".format(f.__name__))


def gen3D(mol):
    mol = Chem.AddHs(mol)
    if EmbedMolecule(mol) != 0:
        raise ValueError("EmbedMolecule failed")

    uff = False

    try:
        optimize(mol, MMFFOptimizeMolecule)
    except ValueError:
        uff = True

    if uff:
        optimize(mol, UFFOptimizeMolecule)

    return uff, mol


class PrepareWorker(Worker):
    def __init__(self, mols, gen3D, desalt):
        self.mols = mols
        self.gen3D = gen3D
        self.desalt = desalt

    def __next__(self):
        if len(self.mols) == 0:
            raise StopIteration

        self.mol, self.mols = self.mols[0], self.mols[1:]

    def __call__(self):
        mol, name = self.mol
        if self.desalt:
            mol = desalt(mol)

        if self.gen3D:
            uff, mol = gen3D(mol)
            return uff, mol, name
        else:
            return None, mol, name


class FileHandler(RequestHandler):
    SMI_EXT = set([".smi", ".smiles"])
    SDF_EXT = set([".sdf", ".sd", ".mol"])

    def post(self):
        gen3D = self.get_flag("gen3D", False)
        desalt = self.get_flag("desalt", True)

        f = self.request.files.get("file")
        if f is None:
            self.fail(400, "no file parameter")

        f = f[0]
        ext = os.path.splitext(f.filename)[-1]

        if ext in self.SMI_EXT:
            reader = read_smiles
        elif ext in self.SDF_EXT:
            reader = read_sdf
        else:
            self.fail(400, 'unknown extension: {}'.format(ext))

        text_id = issue_text_id()
        task = ParseTask(
            text_id=text_id,
            filename=f.filename,
            body=f.body,
            gen3D=gen3D,
            desalt=desalt,
            conn=self.db,
            reader=reader,
        )
        task.insert_file()
        self.put(task)

        self.json(id=text_id)


class FileIdHandler(SSEHandler):
    def get(self, id):
        with self.transaction() as cur:
            cur.execute('SELECT id, name FROM file WHERE text_id = ? LIMIT 1', (id,))
            result = cur.fetchone()

        if result is None:
            self.fail(404, "no id")

        self.file_id, self.filename = result

        accept, _ = parse_header(self.request.headers['Accept'])

        if accept == 'text/event-stream':
            return self.get_sse(id)

        else:
            return self.get_json(id)

    @gen.coroutine
    def get_sse(self, id):
        self.init_sse()
        while True:
            with self.transaction() as cur:
                cur.execute('''
                SELECT total, done, count(molecule.file_id)
                FROM file JOIN molecule ON file.id = molecule.file_id
                WHERE file.id = ?
                LIMIT 1
                ''', (self.file_id,))

                total, done, current = cur.fetchone()

            yield self.publish(total=total, name=self.filename, done=bool(done), current=current)
            if done:
                raise web.Finish
            yield gen.sleep(0.5)

    def get_json(self, id):
        with self.transaction() as cur:
            cur.execute(
                'SELECT name, gen3D, is3D, desalt FROM file WHERE id = ? LIMIT 1',
                (self.file_id,),
            )
            name, gen3D, is3D, desalt = cur.fetchone()

            cur.execute(
                'SELECT name, forcefield FROM molecule WHERE file_id = ?',
                (self.file_id,),
            )
            mols = [{'name': n, 'forcefield': f} for n, f in cur.fetchall()]

            cur.execute(
                'SELECT error FROM file_error WHERE file_id = ?',
                (self.file_id,),
            )
            errors = [e for e, in cur.fetchall()]

        self.json(
            name=name,
            gen3D=bool(gen3D),
            desalt=bool(desalt),
            is3D=bool(is3D),
            mols=mols,
            errors=errors,
        )


class FileIdExtHandler(RequestHandler):
    EXTS = set(["sdf", 'smi'])

    def get(self, text_id, ext):
        if ext not in self.EXTS:
            self.fail(400, "unknown extension")

        with self.transaction() as cur:
            cur.execute('SELECT id FROM FILE WHERE text_id = ? LIMIT 1', (text_id,))
            result = cur.fetchone()
            if result is None:
                self.fail(404, "not found")

            file_id, = result

            cur.execute('''
            SELECT name, mol, forcefield
            FROM molecule
            WHERE file_id = ?
            ''', (file_id,))

            if ext == "sdf":
                self.get_sdf(cur)
            elif ext == "smi":
                self.get_smi(cur)
            else:
                self.fail(500, "BUG: unknown extension: {}".format(ext))

    def get_sdf(self, cur):
        self.set_header("content-type", "chemical/x-mdl-sdfile")
        with NamedTemporaryFile() as temp:
            writer = Chem.SDWriter(temp.name)
            while True:
                result = cur.fetchone()
                if result is None:
                    break

                name, mol, forcefield = result
                mol.SetProp("_Name", name)
                if forcefield:
                    mol.SetProp("ForceField", forcefield)

                writer.write(mol)

            writer.close()
            temp.seek(0)
            self.write(temp.read())

    def get_smi(self, cur):
        self.set_header("content-type", "chemical/x-daylight-smiles")
        while True:
            result = cur.fetchone()
            if result is None:
                break

            name, mol, _ = result
            self.write("{} {}\n".format(Chem.MolToSmiles(mol), name))


class FileIdNthExtHandler(RequestHandler):
    EXTS = set(["png", "mol"])

    def get(self, id, nth, ext):
        if ext not in self.EXTS:
            self.fail(400, "unknown extension")

        nth = int(nth)

        with self.transaction() as cur:
            cur.execute('''
            SELECT name, mol, forcefield
            FROM molecule
            WHERE nth = ?
            AND file_id = (SELECT id FROM FILE WHERE text_id = ?)
            LIMIT 1''', (nth, id))

            result = cur.fetchone()

        if result is None:
            self.fail(404, "not found")

        self.name, self.mol, self.forcefield = result

        if ext == "png":
            self.get_png()
        elif ext == "mol":
            self.get_mol()
        else:
            self.fail(500, "BUG: unknown extension: {}".format(ext))

    def get_png(self):
        self.mol.RemoveAllConformers()
        img = Draw.MolToImage(self.mol, size=(400, 400))
        bio = BytesIO()
        img.save(bio, format="png")

        self.set_header("Content-Type", "image/png")
        self.write(bio.getvalue())

    def get_mol(self):
        self.write(Chem.MolToMolBlock(self.mol))
