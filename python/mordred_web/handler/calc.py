import math
import time
from cgi import parse_header

import openpyxl
from mordred import Calculator, descriptors
from tornado import gen, web
from mordred.error import MissingValueBase

from ..db import transaction, issue_text_id
from .common import SSEHandler, RequestHandler
from ..task_queue import Task, SingleTask


class PrepareTask(SingleTask):
    timeout = 60

    def __init__(self, calc_id, total, file_id, disabled, conn, calc_timeout):
        self.calc_id = calc_id
        self.file_id = file_id
        self.disabled = disabled
        self.conn = conn
        self.total = total
        self.calc_timeout = calc_timeout
        self.error = False

    def on_job_error(self, job, e):
        with transaction(self.conn) as cur:
            cur.execute(
                "INSERT INTO calc_error (calc_id, error) VALUES (?, ?)",
                (self.calc_id,
                 "BUG: calculator prepare failed: {!r}".format(e)), )
        self.error = True

    def on_job_end(self, job, calc):
        self.calc = calc
        self.desc_ids = []

        with transaction(self.conn) as cur:
            for desc in calc.descriptors:
                cur.execute(
                    "INSERT INTO descriptor (calc_id, name) VALUES (?, ?)",
                    (self.calc_id, str(desc)), )
                self.desc_ids.append(cur.lastrowid)

    def next_task(self):
        if self.error:
            return

        task = CalcTask(
            file_id=self.file_id,
            calc_id=self.calc_id,
            desc_ids=self.desc_ids,
            total=self.total,
            calc=self.calc,
            conn=self.conn,
            timeout=self.calc_timeout, )
        task.get_mols()
        return task

    def job(self):
        return PrepareWorker(disabled=self.disabled)


class PrepareWorker(object):
    def __init__(self, disabled):
        self.disabled = disabled

    def __call__(self):
        calc = Calculator(
            getattr(descriptors, d) for d in descriptors.__all__
            if d not in self.disabled)

        return calc


class CalcTask(Task):
    def __init__(self, file_id, calc_id, desc_ids, calc, total, conn, timeout):
        self.file_id = file_id
        self.calc_id = calc_id
        self.desc_ids = desc_ids
        self.calc = calc
        self.conn = conn
        self.total = total
        self.timeout = timeout

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
                "SELECT id, mol FROM molecule WHERE file_id = ?",  # not require ORDER BY
                (self.file_id, ), )
            self.mols = cur.fetchall()

    def on_job_error(self, job, e):
        se = str(e)
        if len(se) == 0:
            se = repr(e)

        with transaction(self.conn) as cur:
            cur.execute(
                "INSERT INTO calc_error (calc_id, molecule_id, error) VALUES (?, ?, ?)",
                (self.calc_id, job.mol_id, se), )

    def on_task_end(self):
        std = ((None if k == 0 else math.sqrt(S / k))
               for S, k in zip(self.S, self.k))
        results = zip(self.desc_ids, self.min, self.max, self.mean, std)

        with transaction(self.conn) as cur:
            for desc_id, vmin, vmax, mean, std in results:
                cur.execute(
                    """
                    UPDATE descriptor
                    SET min = ?, max = ?, mean = ?, std = ?
                    WHERE id = ?""",
                    (vmin, vmax, mean, std, desc_id), )

            cur.execute("UPDATE calc SET done = 1 WHERE id = ?",
                        (self.calc_id, ))

    def on_job_end(self, job, results):

        with transaction(self.conn) as cur:
            for i, (desc_id, result) in enumerate(zip(self.desc_ids, results)):
                value, error = None, None
                if isinstance(result, MissingValueBase):
                    error = str(result.error)
                else:
                    value = result

                cur.execute("""
                    INSERT INTO result (calc_id, molecule_id, descriptor_id, value, error)
                    VALUES (?, ?, ?, ?, ?)
                    """, (self.calc_id, job.mol_id, desc_id, value, error))

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

            cur.execute(
                "UPDATE calc SET current = current + 1 WHERE id = ?",
                (self.calc_id, ), )

    def __next__(self):
        if len(self.mols) == 0:
            raise StopIteration
        (mol_id, mol), self.mols = self.mols[0], self.mols[1:]
        return CalcWorker(mol, mol_id, self.calc)


class CalcWorker(object):
    def __init__(self, mol, mol_id, calc):
        self.mol = mol
        self.mol_id = mol_id
        self.calc = calc

    def __call__(self):
        return self.calc(self.mol)


class CalcIdHandler(SSEHandler):
    def post(self, file_text_id):
        with self.transaction() as cur:
            cur.execute(
                "SELECT id, name, total FROM file WHERE text_id = ? LIMIT 1",
                (file_text_id, ), )
            result = cur.fetchone()
            if result is None:
                self.fail(404, "no id")

            file_id, file_name, total = result

            calc_text_id = issue_text_id()

            cur.execute("""
            INSERT INTO calc (file_id, text_id, created_at, current, done)
            VALUES (?, ?, ?, 0, 0)""", (file_id, calc_text_id,
                                        int(time.time())))

            calc_id = cur.lastrowid

        disabled = set(self.get_arguments("disabled"))
        task = PrepareTask(
            calc_id=calc_id,
            file_id=file_id,
            total=total,
            disabled=disabled,
            conn=self.db,
            calc_timeout=self.application.calc_timeout, )
        self.put(task)

        self.json(id=calc_text_id)

    def get(self, calc_text_id):
        with self.transaction() as cur:
            cur.execute(
                "SELECT id, file_id FROM calc WHERE text_id = ? LIMIT 1",
                (calc_text_id, ))
            result = cur.fetchone()
            if result is None:
                self.fail(404, "no id")

            self.calc_id, self.file_id = result

            cur.execute(
                "SELECT name, total, text_id FROM file WHERE id = ? LIMIT 1",
                (self.file_id, ), )
            self.file_name, self.total, file_text_id = cur.fetchone()

        accept, _ = parse_header(self.request.headers["Accept"])

        if accept == "text/event-stream":
            return self.get_sse()
        else:
            return self.get_json()

    @gen.coroutine
    def get_sse(self):
        self.init_sse()
        while True:
            with self.transaction() as cur:
                cur.execute(
                    "SELECT done, current FROM calc WHERE id = ? LIMIT 1",
                    (self.calc_id, ), )

                done, current = cur.fetchone()

            yield self.publish(
                total=self.total,
                name=self.file_name,
                done=bool(done),
                current=current, )

            if done:
                raise web.Finish
            yield gen.sleep(0.5)

    def get_json(self):
        with self.transaction() as cur:
            cur.execute(
                "SELECT name, text_id FROM file WHERE id = ? LIMIT 1",
                (self.file_id, ), )

            result = cur.fetchone()
            if result is None:
                self.fail(404, "no id")

            cur.execute("""
                SELECT molecule.nth, molecule.name, calc_error.error
                FROM calc_error LEFT OUTER JOIN molecule
                    ON calc_error.molecule_id = molecule.id
                WHERE calc_error.calc_id = ?
                ORDER BY molecule.nth
            """, (self.calc_id, ))

            errors = [{
                "error": error,
                "name": name,
                "nth": nth,
            } for nth, name, error in cur.fetchall()]

            cur.execute("""
                SELECT name, max, min, mean, std
                FROM descriptor
                WHERE calc_id = ?
                ORDER BY id
            """, (self.calc_id, ))

            descs = [{
                "max": vmax,
                "mean": mean,
                "min": vmin,
                "name": name,
                "std": std,
            } for name, vmax, vmin, mean, std in cur.fetchall()]

            file_name, file_text_id = result

            self.json(
                file_name=file_name,
                file_id=file_text_id,
                errors=errors,
                descriptors=descs, )


class CalcIdExtHandler(RequestHandler):
    EXTS = {"csv", "xlsx", "txt"}

    def get(self, calc_text_id, ext):
        ext = ext.lower()
        if ext not in self.EXTS:
            self.fail(400, "unknown extension")

        with self.transaction() as cur:
            cur.execute(
                "SELECT id, file_id FROM calc WHERE text_id = ? LIMIT 1",
                (calc_text_id, ))
            result = cur.fetchone()
            if result is None:
                self.fail(404, "no id")

            self.calc_id, self.file_id = result

            cur.execute(
                "SELECT id, name FROM molecule WHERE file_id = ? ORDER BY nth",
                (self.file_id, ), )
            self.molecules = cur.fetchall()

            cur.execute(
                "SELECT name FROM descriptor WHERE calc_id = ? ORDER BY id",
                (self.calc_id, ), )
            self.descriptors = [d for d, in cur.fetchall()]

            if ext == "csv":
                return self.get_csv(cur)
            elif ext == "xlsx":
                return self.get_xlsx(cur)
            elif ext == "txt":
                return self.get_error_log(cur)

    def get_error_log(self, cur):
        self.set_header("content-type", "text/plain")

        for mol_id, name in self.molecules:
            cur.execute("""
                SELECT error
                FROM calc_error
                WHERE calc_id = ? AND molecule_id = ?
                ORDER BY id
            """, (self.calc_id, mol_id))

            for e, in cur.fetchall():
                self.write("{}: {}\n".format(name, e))

            cur.execute("""
                SELECT descriptor.name, result.error
                FROM result JOIN descriptor ON result.descriptor_id = descriptor.id
                WHERE result.error IS NOT NULL AND result.calc_id = ? AND result.molecule_id = ?
                ORDER BY descriptor_id
            """, (self.calc_id, mol_id))

            for n, e in cur.fetchall():
                self.write('{}:{}: {}\n'.format(name, n, e))

    def _get_value_by_mol_id(self, cur, mol_id):
        cur.execute("""
            SELECT value
            FROM result
            WHERE calc_id = ? AND molecule_id = ?
            ORDER BY descriptor_id
            """, (self.calc_id, mol_id))
        return cur.fetchall()

    def get_csv(self, cur):
        self.set_header("content-type", "text/csv")
        self.write("name,")
        self.write(",".join(self.descriptors))
        self.write("\n")

        for mol_id, name in self.molecules:
            self.write(name + ",")
            result = self._get_value_by_mol_id(cur, mol_id)
            self.write(",".join(("" if v is None else str(v)) for v, in result))
            self.write("\n")

    def get_xlsx(self, cur):
        self.set_header(
            "content-type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.append(["name"] + self.descriptors)

        for mol_id, name in self.molecules:
            ws.append([name] + [v for v, in self._get_value_by_mol_id(cur, mol_id)])

        self.write(openpyxl.writer.excel.save_virtual_workbook(wb))
