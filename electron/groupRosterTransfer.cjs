const fs = require('node:fs/promises');
const crypto = require('node:crypto');

const all = (db, sql, args = []) => new Promise((resolve, reject) => db.all(sql, args, (e, rows) => e ? reject(e) : resolve(rows || [])));
const run = (db, sql, args = []) => new Promise((resolve, reject) => db.run(sql, args, function (e) { e ? reject(e) : resolve({ id: this.lastID, changes: this.changes }); }));
const identifier = value => `"${String(value).replace(/"/g, '""')}"`;
const columns = async (db, table) => (await all(db, `PRAGMA table_info(${identifier(table)})`)).map(row => row.name);

function registerGroupRosterTransfer({ db, ipcMain, dialog, BrowserWindow }) {
  let busy = false;
  const guarded = fn => async (event, ...args) => {
    if (busy) throw new Error('Espera a que termine la transferencia actual.');
    busy = true;
    try { return await fn(event, ...args); } finally { busy = false; }
  };
  ipcMain.handle('grupo-exportar-lista', guarded(async (event, id) => {
    const groupId = Number(id);
    if (!Number.isSafeInteger(groupId) || groupId < 1) throw new Error('Selecciona un grupo válido.');
    const [group] = await all(db, 'SELECT id, grado, seccion, ciclo_escolar, escuela FROM grupos_maestro WHERE id = ?', [groupId]);
    if (!group) throw new Error('No se encontró el grupo seleccionado.');
    const students = await all(db, 'SELECT id, nombre FROM alumnos WHERE grupo_id = ? ORDER BY nombre COLLATE NOCASE, id', [groupId]);
    const profileColumns = (await columns(db, 'perfil_alumno')).filter(name => name !== 'alumno_id');
    const documentColumns = await columns(db, 'expediente_alumno');
    const entries = [];
    for (const student of students) {
      const [profile] = await all(db, 'SELECT * FROM perfil_alumno WHERE alumno_id = ?', [student.id]);
      const documents = documentColumns.length
        ? await all(db, 'SELECT categoria, nombre, mime, tamano, contenido, fecha FROM expediente_alumno WHERE alumno_id = ? ORDER BY id', [student.id])
        : [];
      entries.push({ nombre: student.nombre, perfil: profile ? Object.fromEntries(profileColumns.map(key => [key, profile[key] ?? null])) : {}, documentos: documents });
    }
    const payload = { format: 'elara-secondary-group-roster', version: 1, exportedAt: new Date().toISOString(), grupo: { grado: group.grado, seccion: group.seccion, ciclo_escolar: group.ciclo_escolar, escuela: group.escuela }, alumnos: entries };
    const filename = `Grupo-${group.grado}${group.seccion}-${new Date().toISOString().slice(0, 10)}.elara.json`;
    const selected = await dialog.showSaveDialog(BrowserWindow.fromWebContents(event.sender), { title: 'Exportar grupo y expedientes', defaultPath: filename, filters: [{ name: 'Grupo de Elara', extensions: ['json'] }] });
    if (selected.canceled) return { cancelled: true };
    const temp = `${selected.filePath}.${crypto.randomUUID()}.tmp`;
    try { await fs.writeFile(temp, JSON.stringify(payload), { flag: 'wx' }); await fs.rename(temp, selected.filePath); }
    catch (error) { await fs.unlink(temp).catch(() => {}); throw error; }
    return { success: true, count: entries.length };
  }));
  ipcMain.handle('grupo-importar-lista', guarded(async (event, id) => {
    const groupId = Number(id);
    if (!Number.isSafeInteger(groupId) || groupId < 1) throw new Error('Selecciona primero el grupo de destino.');
    const [target] = await all(db, 'SELECT id FROM grupos_maestro WHERE id = ?', [groupId]);
    if (!target) throw new Error('No se encontró el grupo de destino.');
    const selected = await dialog.showOpenDialog(BrowserWindow.fromWebContents(event.sender), { title: 'Importar lista y expedientes', properties: ['openFile'], filters: [{ name: 'Grupo de Elara', extensions: ['json'] }] });
    if (selected.canceled) return { cancelled: true };
    const stat = await fs.stat(selected.filePaths[0]);
    if (!stat.isFile() || stat.size > 512 * 1024 * 1024) throw new Error('El archivo del grupo supera el límite de 512 MB.');
    let payload;
    try { payload = JSON.parse(await fs.readFile(selected.filePaths[0], 'utf8')); } catch { throw new Error('No se pudo leer el archivo. Verifica que sea una exportación de grupo de Elara.'); }
    if (payload?.format !== 'elara-secondary-group-roster' || payload.version !== 1 || !Array.isArray(payload.alumnos) || payload.alumnos.length > 1000) throw new Error('El archivo no es una exportación compatible de grupo de Secundaria.');
    for (const student of payload.alumnos) {
      if (typeof student?.nombre !== 'string' || !student.nombre.trim() || student.nombre.length > 300 || !student.perfil || typeof student.perfil !== 'object' || !Array.isArray(student.documentos)) throw new Error('El archivo contiene datos de alumno inválidos.');
      if (student.perfil.foto_url && (!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(student.perfil.foto_url) || student.perfil.foto_url.length > 4 * 1024 * 1024)) throw new Error('El archivo contiene una foto de perfil no válida.');
      for (const doc of student.documentos) {
        if (typeof doc.contenido !== 'string' || !doc.contenido || doc.contenido.length % 4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(doc.contenido)) throw new Error('El archivo contiene un documento inválido.');
        const size = doc.contenido.length * 3 / 4 - (doc.contenido.endsWith('==') ? 2 : doc.contenido.endsWith('=') ? 1 : 0);
        if (size !== Number(doc.tamano) || size > 20 * 1024 * 1024) throw new Error('El archivo contiene un documento inválido.');
      }
    }
    const profileColumns = (await columns(db, 'perfil_alumno')).filter(name => name !== 'alumno_id');
    const hasDocuments = (await columns(db, 'expediente_alumno')).length > 0;
    await run(db, 'BEGIN IMMEDIATE');
    try {
      for (const student of payload.alumnos) {
        const inserted = await run(db, 'INSERT INTO alumnos (nombre, grupo_id) VALUES (?, ?)', [student.nombre.trim(), groupId]);
        const values = Object.fromEntries(Object.entries(student.perfil).filter(([key]) => profileColumns.includes(key)));
        if (Object.keys(values).length) {
          const names = Object.keys(values);
          await run(db, `INSERT INTO perfil_alumno (alumno_id, ${names.map(identifier).join(', ')}) VALUES (?, ${names.map(() => '?').join(', ')})`, [inserted.id, ...names.map(name => values[name] == null ? null : String(values[name]))]);
        }
        if (hasDocuments) for (const doc of student.documentos) {
          const size = Number(doc.tamano);
          const name = String(doc.nombre || '').split(/[\\/]/).pop().replace(/[\x00-\x1f]/g, '').slice(0, 180);
          if (!name || !Number.isSafeInteger(size) || size < 0 || size > 20 * 1024 * 1024 || !['Comprobante de domicilio','INE del tutor','Acta de nacimiento','CURP','Examen trimestral','Trabajo','Otro'].includes(doc.categoria)) throw new Error('El archivo contiene un documento inválido.');
          await run(db, 'INSERT INTO expediente_alumno (alumno_id,categoria,nombre,mime,tamano,contenido,fecha) VALUES (?,?,?,?,?,?,?)', [inserted.id, doc.categoria, name, String(doc.mime || 'application/octet-stream').slice(0, 120), size, doc.contenido, String(doc.fecha || new Date().toISOString())]);
        }
      }
      await run(db, 'COMMIT');
    } catch (error) { await run(db, 'ROLLBACK').catch(() => {}); throw error; }
    return { success: true, count: payload.alumnos.length };
  }));
}

module.exports = { registerGroupRosterTransfer };
