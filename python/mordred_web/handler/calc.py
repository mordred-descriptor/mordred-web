import time
from cgi import parse_header
import math

from mordred import Calculator, descriptors
from tornado import gen, web
from mordred.error import MissingValueBase

from ..db import transaction, issue_text_id
from .common import RequestHandler, SSEHandler
from ..job_queue import Task, Worker, SingleWorker


class PrepareTask(Task):
    def __init__(self, calc_id, total, file_id, disabled, conn):
        self.calc_id = calc_id
        self.file_id = file_id
        self.disabled = disabled
        self.conn = conn
        self.total = total

    def worker(self):
        return PrepareWorker(disabled=self.disabled)

    def on_task_error(e):
        print(e)

    def on_task_end(self, calc):
        self.calc = calc
        self.desc_ids = []

        with transaction(self.conn) as cur:
            for desc in calc.descriptors:
                cur.execute(
                    'INSERT INTO descriptor (calc_id, name) VALUES (?, ?)',
                    (self.calc_id, str(desc))
                )
                self.desc_ids.append(cur.lastrowid)

    def next_task(self):
        task = CalcTask(
            file_id=self.file_id, calc_id=self.calc_id, desc_ids=self.desc_ids,
            total=self.total, calc=self.calc, conn=self.conn
        )
        task.get_mols()
        return task


class PrepareWorker(SingleWorker):
    def __init__(self, disabled):
        self.disabled = disabled

    def __call__(self):
        calc = Calculator(
            getattr(descriptors, d)
            for d in descriptors.__all__
            if d not in self.disabled
        )

        return calc


class CalcTask(Task):
    def __init__(self, file_id, calc_id, desc_ids, calc, total, conn):
        self.file_id = file_id
        self.calc_id = calc_id
        self.desc_ids = desc_ids
        self.calc = calc
        self.conn = conn
        self.total = total

        Nd = len(desc_ids)
        self.max = [None] * Nd
        self.min = [None] * Nd
        self.mean = [None] * Nd
        self.M = [0.0] * Nd
        self.S = [0.0] * Nd
        self.k = [0] * Nd

    def get_mols(self):
        with transaction(self.conn) as cur:
            cur.execute(
                'SELECT id, mol FROM molecule WHERE file_id = ?',
                (self.file_id,)
            )
            self.mols = cur.fetchall()

    def worker(self):
        return CalcWorker(mols=self.mols, calc=self.calc)

    def on_task_error(self, e):
        print(e)

    def on_end(self):
        std = ((None if k == 0 else math.sqrt(S / k)) for S, k in zip(self.S, self.k))
        results = zip(self.desc_ids, self.min, self.max, self.mean, std)

        with transaction(self.conn) as cur:
            for desc_id, vmin, vmax, mean, std in results:
                cur.execute(
                    'UPDATE descriptor SET min = ?, max = ?, mean = ?, std = ? WHERE id = ?',
                    (vmin, vmax, mean, std, desc_id)
                )

            cur.execute('UPDATE calc SET done = 1 WHERE id = ?', (self.calc_id,))

    def on_task_end(self, results):
        mol_id, results = results

        with transaction(self.conn) as cur:
            for i, (desc_id, result) in enumerate(zip(self.desc_ids, results)):
                value, error = None, None
                if isinstance(result, MissingValueBase):
                    error = str(result.error)
                else:
                    value = result

                cur.execute('''
                    INSERT INTO result (calc_id, molecule_id, descriptor_id, value, error)
                    VALUES (?, ?, ?, ?, ?)
                    ''', (self.calc_id, mol_id, desc_id, value, error))

                if error:
                    continue

                if self.max[i] is None or self.max[i] < value:
                    self.max[i] = value

                if self.min[i] is None or self.min[i] > value:
                    self.min[i] = value

                self.mean[i] = (self.mean[i] or 0) + value / self.total

                self.k[i] += 1

                M = self.M[i]
                self.M[i] += (value - M) / self.k[i]
                self.S[i] += (value - M) * (value - self.M[i])

            cur.execute('UPDATE calc SET current = current + 1 WHERE id = ?', (self.calc_id,))


class CalcWorker(Worker):
    def __init__(self, mols, calc):
        self.mols = mols
        self.calc = calc

    def __next__(self):
        if len(self.mols) == 0:
            raise StopIteration

        self.mol, self.mols = self.mols[0], self.mols[1:]

    def __call__(self):
        mol_id, mol = self.mol
        result = self.calc(mol)
        return mol_id, result


class CalcIdHandler(SSEHandler):
    def post(self, file_text_id):
        with self.transaction() as cur:
            cur.execute(
                'SELECT id, name, total FROM file WHERE text_id = ? LIMIT 1',
                (file_text_id,),
            )
            result = cur.fetchone()
            if result is None:
                self.fail(404, "no id")

            file_id, file_name, total = result

            calc_text_id = issue_text_id()

            cur.execute('''
            INSERT INTO calc (file_id, text_id, created_at, current, done)
            VALUES (?, ?, ?, 0, 0)''', (file_id, calc_text_id, int(time.time())))

            calc_id = cur.lastrowid

        disabled = set(self.get_arguments("disabled"))
        task = PrepareTask(
            calc_id=calc_id, file_id=file_id, total=total, disabled=disabled, conn=self.db
        )
        self.put(task)

        self.json(id=calc_text_id)

    def get(self, calc_text_id):
        with self.transaction() as cur:
            cur.execute('SELECT id, file_id FROM calc WHERE text_id = ? LIMIT 1', (calc_text_id,))
            result = cur.fetchone()
            if result is None:
                self.fail(404, "no id")

            self.calc_id, self.file_id = result

            cur.execute(
                'SELECT name, total, text_id FROM file WHERE id = ? LIMIT 1',
                (self.file_id,),
            )
            self.file_name, self.total, file_text_id = cur.fetchone()

        accept, _ = parse_header(self.request.headers['Accept'])

        if accept == 'text/event-stream':
            return self.get_sse()
        else:
            return self.get_json()

    @gen.coroutine
    def get_sse(self):
        self.init_sse()
        while True:
            with self.transaction() as cur:
                cur.execute(
                    'SELECT done, current FROM calc WHERE id = ? LIMIT 1',
                    (self.calc_id,),
                )

                done, current = cur.fetchone()

            yield self.publish(
                total=self.total, name=self.file_name, done=bool(done), current=current
            )

            if done:
                raise web.Finish
            yield gen.sleep(0.5)

    def get_json(self):
        with self.transaction() as cur:
            cur.execute(
                'SELECT name, text_id FROM file WHERE id = ? LIMIT 1',
                (self.file_id,),
            )

            result = cur.fetchone()
            if result is None:
                self.fail(404, "no id")

            cur.execute('''
                SELECT name, max, min, mean, std
                FROM descriptor
                WHERE calc_id = ?
                ORDER BY id
            ''', (self.calc_id,))

            descs = [
                {"name": name, "max": vmax, "min": vmin, "mean": mean, "std": std}
                for name, vmax, vmin, mean, std in cur.fetchall()
            ]

            file_name, file_text_id = result

            self.json(
                file_name=file_name,
                file_id=file_text_id,
                descriptors=descs,
            )


class CalcIdExtHandler(RequestHandler):
    EXTS = set(["csv"])

    def get(self, calc_text_id, ext):
        if ext not in self.EXTS:
            self.fail(400, "unknown extension")

        with self.transaction() as cur:
            cur.execute('SELECT id, file_id FROM calc WHERE text_id = ? LIMIT 1', (calc_text_id,))
            result = cur.fetchone()
            if result is None:
                self.fail(404, "no id")

            self.calc_id, self.file_id = result

            cur.execute(
                'SELECT id, name FROM molecule WHERE file_id = ? ORDER BY nth',
                (self.file_id,)
            )
            self.molecules = cur.fetchall()

            cur.execute(
                'SELECT name FROM descriptor WHERE calc_id = ? ORDER BY id',
                (self.calc_id,)
            )
            self.descriptors = [d for d, in cur.fetchall()]

            if ext == "csv":
                return self.get_csv(cur)

    def get_csv(self, cur):
        self.set_header('content-type', 'text/csv')
        self.write('name,')
        self.write(','.join(self.descriptors))
        self.write('\n')

        for mol_id, name in self.molecules:
            self.write(name + ',')
            cur.execute('''
                SELECT value FROM result WHERE calc_id = ? AND molecule_id = ?
                ORDER BY descriptor_id
                ''', (self.calc_id, mol_id))

            self.write(','.join(('' if v is None else str(v)) for v, in cur.fetchall()))
            self.write('\n')
