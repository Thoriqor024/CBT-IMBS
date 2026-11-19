import { matchBankGrade, normalizeRoomQuotas } from './examRooms.js';

const httpError = (message, status = 400) => Object.assign(new Error(message), { status });

export function createExamRoomApi({ pool, audit, pickExamQuestions }) {
  if (!pool || typeof pool.query !== 'function') throw new TypeError('A database pool is required.');
  if (typeof audit !== 'function') throw new TypeError('audit is required.');
  if (typeof pickExamQuestions !== 'function') throw new TypeError('pickExamQuestions is required.');

  async function roomClasses(client) {
    const settings = await client.query('SELECT classes FROM school_settings WHERE id=1');
    return settings.rows[0]?.classes || [];
  }

  // Ambil siswa per kelas yang belum masuk ruang mana pun, sesuai kuota.
  async function plotRoomStudents(client, roomId, quotas) {
    const allocation = [];
    for (const quota of quotas) {
      const inserted = quota.count > 0
        ? await client.query(`INSERT INTO exam_room_students(room_id,student_id,class_name)
            SELECT $1,u.id,u.class_name FROM users u
            WHERE u.role='student' AND u.active=TRUE AND u.class_name=$2
              AND NOT EXISTS(SELECT 1 FROM exam_room_students ers WHERE ers.student_id=u.id)
            ORDER BY u.full_name,u.id LIMIT $3 ON CONFLICT DO NOTHING RETURNING student_id`,
          [roomId, quota.className, quota.count])
        : { rowCount: 0 };
      allocation.push({ className: quota.className, requested: quota.count, allocated: inserted.rowCount });
    }
    return allocation;
  }

  async function listRooms(_req, res) {
    const rooms = await pool.query(`SELECT er.id,er.name,er.quotas,er.created_at AS "createdAt",
      (SELECT count(*)::int FROM exam_room_students ers WHERE ers.room_id=er.id) AS "studentCount",
      COALESCE((SELECT jsonb_agg(x ORDER BY x."className") FROM (
        SELECT ers.class_name AS "className",count(*)::int AS count
        FROM exam_room_students ers WHERE ers.room_id=er.id GROUP BY ers.class_name) x),'[]'::jsonb) AS "classCounts"
      FROM exam_rooms er ORDER BY er.name`);
    const unassigned = await pool.query(`SELECT u.class_name AS "className",count(*)::int AS count
      FROM users u WHERE u.role='student' AND u.active=TRUE
        AND NOT EXISTS(SELECT 1 FROM exam_room_students ers WHERE ers.student_id=u.id)
      GROUP BY u.class_name ORDER BY u.class_name`);
    res.json({ rooms: rooms.rows, unassigned: unassigned.rows });
  }

  async function getRoom(req, res) {
    const room = await pool.query('SELECT id,name,quotas,created_at AS "createdAt" FROM exam_rooms WHERE id=$1', [req.params.id]);
    if (!room.rowCount) return res.status(404).json({ error: 'Ruang ujian tidak ditemukan.' });
    const students = await pool.query(`SELECT u.id,u.full_name AS name,u.username,ers.class_name AS "className"
      FROM exam_room_students ers JOIN users u ON u.id=ers.student_id
      WHERE ers.room_id=$1 ORDER BY ers.class_name,u.full_name`, [req.params.id]);
    res.json({ ...room.rows[0], students: students.rows });
  }

  async function createRoom(req, res) {
    const name = String(req.body?.name || '').trim();
    if (!name || name.length > 60) throw httpError('Nama ruang ujian wajib diisi dan maksimal 60 karakter.');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const quotas = normalizeRoomQuotas(req.body?.quotas, await roomClasses(client));
      const room = await client.query(
        'INSERT INTO exam_rooms(name,quotas,created_by) VALUES($1,$2::jsonb,$3) RETURNING id,name,quotas',
        [name, JSON.stringify(quotas), req.session.user.id],
      );
      const allocation = await plotRoomStudents(client, room.rows[0].id, quotas);
      await audit(client, req.session.user.id, 'room.create', { roomId: room.rows[0].id, name, quotas, allocation });
      await client.query('COMMIT');
      res.status(201).json({ ...room.rows[0], allocation, totalAllocated: allocation.reduce((total, item) => total + item.allocated, 0) });
    } catch (error) {
      await client.query('ROLLBACK');
      if (error.code === '23505') throw httpError('Nama ruang ujian sudah digunakan.', 409);
      throw error;
    } finally {
      client.release();
    }
  }

  async function updateRoom(req, res) {
    const name = String(req.body?.name || '').trim();
    if (!name || name.length > 60) throw httpError('Nama ruang ujian wajib diisi dan maksimal 60 karakter.');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const existing = await client.query('SELECT id,name FROM exam_rooms WHERE id=$1 FOR UPDATE', [req.params.id]);
      if (!existing.rowCount) throw httpError('Ruang ujian tidak ditemukan.', 404);
      const active = await client.query(`SELECT 1 FROM exam_room_links erl JOIN exams e ON e.id=erl.exam_id
        WHERE erl.room_id=$1 AND e.status='active' LIMIT 1`, [req.params.id]);
      if (active.rowCount) throw httpError('Ruang ujian sedang dipakai ujian aktif. Akhiri ujian sebelum mengubah plotting.', 409);
      const quotas = normalizeRoomQuotas(req.body?.quotas, await roomClasses(client));
      await client.query('UPDATE exam_rooms SET name=$2,quotas=$3::jsonb WHERE id=$1', [req.params.id, name, JSON.stringify(quotas)]);
      await client.query('DELETE FROM exam_room_students WHERE room_id=$1', [req.params.id]);
      const allocation = await plotRoomStudents(client, req.params.id, quotas);
      await audit(client, req.session.user.id, 'room.update', { roomId: Number(req.params.id), name, quotas, allocation });
      await client.query('COMMIT');
      res.json({ id: Number(req.params.id), name, quotas, allocation, totalAllocated: allocation.reduce((total, item) => total + item.allocated, 0) });
    } catch (error) {
      await client.query('ROLLBACK');
      if (error.code === '23505') throw httpError('Nama ruang ujian sudah digunakan.', 409);
      throw error;
    } finally {
      client.release();
    }
  }

  async function deleteRoom(req, res) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const room = await client.query('SELECT id,name FROM exam_rooms WHERE id=$1 FOR UPDATE', [req.params.id]);
      if (!room.rowCount) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Ruang ujian tidak ditemukan.' });
      }
      const active = await client.query(`SELECT 1 FROM exam_room_links erl JOIN exams e ON e.id=erl.exam_id
        WHERE erl.room_id=$1 AND e.status='active' LIMIT 1`, [req.params.id]);
      if (active.rowCount) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'Ruang ujian sedang dipakai ujian aktif. Akhiri ujian sebelum menghapus ruang.' });
      }
      await client.query('DELETE FROM exam_rooms WHERE id=$1', [req.params.id]);
      await audit(client, req.session.user.id, 'room.delete', { roomId: Number(req.params.id), name: room.rows[0].name });
      await client.query('COMMIT');
      res.json({ ok: true });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Buat ujian dari bank soal + ruang ujian. Peserta diambil dari plotting ruang.
  async function createRoomBasedExam(req, res) {
    const title = String(req.body?.title || '').trim();
    const bankIds = [...new Set((Array.isArray(req.body?.bankIds) ? req.body.bankIds : []).map(Number))];
    const subjectIds = [...new Set((Array.isArray(req.body?.subjectIds) ? req.body.subjectIds : []).map(Number))];
    const roomIds = [...new Set((Array.isArray(req.body?.roomIds) ? req.body.roomIds : []).map(Number))];
    const mc = Number(req.body?.mcCount);
    const essay = Number(req.body?.essayCount);
    const duration = Number(req.body?.durationMinutes);
    if (!title || title.length > 160
      || (!bankIds.length && !subjectIds.length)
      || bankIds.some(id => !Number.isSafeInteger(id) || id < 1)
      || subjectIds.some(id => !Number.isSafeInteger(id) || id < 1)
      || !roomIds.length || roomIds.some(id => !Number.isSafeInteger(id) || id < 1)
      || !Number.isInteger(mc) || !Number.isInteger(essay) || mc < 0 || essay < 0 || mc + essay < 1
      || !Number.isInteger(duration) || duration < 1) {
      throw httpError('Lengkapi nama ujian, bank soal, ruang ujian, jumlah soal, dan durasi.');
    }
    if (req.session.user.role === 'teacher' && !bankIds.length) throw httpError('Pilih bank soal untuk rancangan ujian.');

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const banks = bankIds.length
        ? await client.query('SELECT id,subject_id,grade FROM question_banks WHERE id=ANY($1::bigint[]) ORDER BY id', [bankIds])
        : await client.query('SELECT id,subject_id,grade FROM question_banks WHERE subject_id=ANY($1::bigint[]) ORDER BY id', [subjectIds]);
      if (bankIds.length && banks.rowCount !== bankIds.length) throw httpError('Salah satu bank soal tidak ditemukan.', 404);
      if (!banks.rowCount) throw httpError('Bank soal untuk pilihan tersebut belum tersedia.');

      const participants = await client.query(`SELECT ers.student_id AS "studentId",ers.room_id AS "roomId",ers.class_name AS "className"
        FROM exam_room_students ers JOIN users u ON u.id=ers.student_id AND u.active=TRUE
        WHERE ers.room_id=ANY($1::bigint[]) ORDER BY ers.class_name,u.full_name`, [roomIds]);
      if (!participants.rowCount) throw httpError('Ruang ujian terpilih belum memiliki siswa. Atur plotting ruang terlebih dahulu.');

      const bankGrades = [...new Set(banks.rows.map(bank => bank.grade))];
      const students = participants.rows.map(row => ({ ...row, grade: matchBankGrade(row.className, bankGrades) }));
      const unmatched = students.find(student => !student.grade);
      if (unmatched) throw httpError(`Kelas "${unmatched.className}" tidak cocok dengan tingkat bank soal terpilih (${bankGrades.join(', ')}). Pilih bank yang sesuai tingkat kelas tersebut.`);

      const examSubjectIds = [...new Set(banks.rows.map(bank => Number(bank.subject_id)))];
      if (req.session.user.role === 'teacher') {
        const accessibleBanks = await client.query(`SELECT b.id FROM question_banks b WHERE b.id=ANY($1::bigint[]) AND (
          EXISTS(SELECT 1 FROM question_bank_teachers qbt WHERE qbt.bank_id=b.id AND qbt.teacher_id=$2 AND qbt.source IN ('auto','manual'))
          OR (EXISTS(SELECT 1 FROM teacher_access ta WHERE ta.teacher_id=$2 AND ta.subject_id=b.subject_id AND class_grade_matches(ta.class_name,b.grade))
            AND NOT EXISTS(SELECT 1 FROM question_bank_teachers qbt WHERE qbt.bank_id=b.id AND qbt.teacher_id=$2 AND qbt.source='excluded')))`,[banks.rows.map(bank => bank.id), req.session.user.id]);
        if (accessibleBanks.rowCount !== banks.rowCount) throw httpError('Anda tidak memiliki akses ke salah satu bank soal terpilih.', 403);
        const access = await client.query('SELECT subject_id AS "subjectId",class_name AS "className" FROM teacher_access WHERE teacher_id=$1', [req.session.user.id]);
        const pairs = new Set(access.rows.map(row => `${Number(row.subjectId)}:${row.className}`));
        const examClasses = [...new Set(students.map(student => student.className))];
        for (const subjectId of examSubjectIds) {
          const blockedClass = examClasses.find(className => !pairs.has(`${subjectId}:${className}`));
          if (blockedClass) throw httpError(`Anda tidak memiliki akses mata pelajaran terpilih untuk kelas "${blockedClass}". Hubungi admin untuk menyesuaikan akses guru.`, 403);
        }
      }

      for (const grade of new Set(students.map(student => student.grade))) {
        const gradeBankIds = banks.rows.filter(bank => bank.grade === grade).map(bank => bank.id);
        const stock = await client.query(`SELECT count(*) FILTER(WHERE type IN ('mc','complex_mc'))::int AS mc,
          count(*) FILTER(WHERE type='essay')::int AS essay FROM questions WHERE bank_id=ANY($1)`, [gradeBankIds]);
        if (mc > stock.rows[0].mc || essay > stock.rows[0].essay) {
          throw httpError(`Stok soal tingkat ${grade} tidak cukup. Tersedia ${stock.rows[0].mc} pilihan ganda dan ${stock.rows[0].essay} essay.`);
        }
      }

      const classNames = [...new Set(students.map(student => student.className))];
      const exam = await client.query(`INSERT INTO exams(title,bank_id,class_name,mc_count,essay_count,duration_minutes,created_by)
        VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [title, banks.rows[0].id, classNames.join(', '), mc, essay, duration, req.session.user.id]);
      const examId = exam.rows[0].id;

      for (let index = 0; index < examSubjectIds.length; index++)
        await client.query('INSERT INTO exam_subjects(exam_id,subject_id,position) VALUES($1,$2,$3)', [examId, examSubjectIds[index], index + 1]);
      for (const roomId of roomIds)
        await client.query('INSERT INTO exam_room_links(exam_id,room_id) VALUES($1,$2)', [examId, roomId]);

      for (const student of students) {
        const gradeBankIds = banks.rows.filter(bank => bank.grade === student.grade).map(bank => bank.id);
        const sessionRow = await client.query('INSERT INTO exam_sessions(exam_id,student_id,room_id) VALUES($1,$2,$3) RETURNING id',
          [examId, student.studentId, student.roomId]);
        const picks = await pickExamQuestions(client, gradeBankIds, mc, essay);
        for (let index = 0; index < picks.length; index++)
          await client.query('INSERT INTO exam_questions(session_id,question_id,position) VALUES($1,$2,$3)',
            [sessionRow.rows[0].id, picks[index].id, index + 1]);
      }

      await client.query('COMMIT');
      await audit(pool, req.session.user.id, 'exam.create', { examId, participants: students.length, rooms: roomIds.length, banks: banks.rowCount, subjects: examSubjectIds.length });
      res.status(201).json({ id: examId, participants: students.length, rooms: roomIds.length, banks: banks.rowCount, subjects: examSubjectIds.length });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  return { listRooms, getRoom, createRoom, updateRoom, deleteRoom, createRoomBasedExam };
}
