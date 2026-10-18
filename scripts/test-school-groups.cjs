const test = require('node:test');
const assert = require('node:assert/strict');
const { DatabaseSync } = require('node:sqlite');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const root = process.cwd();
const source = readFileSync(join(root, 'electron/main.js'), 'utf8');
test('Secundaria: migrar escuela conserva grupos y permite secciones paralelas', () => {
  assert.match(source, /ALTER TABLE grupos_maestro ADD COLUMN escuela TEXT/);
  assert.match(source, /update-grupo/);
  const db = new DatabaseSync(':memory:');
  try {
    db.exec('CREATE TABLE grupos_maestro (id INTEGER PRIMARY KEY AUTOINCREMENT, grado INTEGER, seccion TEXT, disciplina_id INTEGER, tipo TEXT, ciclo_escolar TEXT)');
    db.prepare('INSERT INTO grupos_maestro (grado,seccion,disciplina_id,tipo,ciclo_escolar) VALUES (?,?,?,?,?)').run(1,'A',10,'Materia Regular','2026-2027');
    db.exec('ALTER TABLE grupos_maestro ADD COLUMN escuela TEXT');
    assert.equal(db.prepare('SELECT escuela FROM grupos_maestro WHERE id=1').get().escuela, null);
    db.prepare('UPDATE grupos_maestro SET seccion=?, escuela=? WHERE id=?').run('B','Secundaria Norte',1);
    db.prepare('INSERT INTO grupos_maestro (grado,seccion,disciplina_id,tipo,ciclo_escolar,escuela) VALUES (?,?,?,?,?,?)').run(1,'A',10,'Materia Regular','2026-2027','Secundaria Sur');
    assert.deepEqual(JSON.parse(JSON.stringify(db.prepare('SELECT seccion,escuela FROM grupos_maestro ORDER BY id').all())), [{seccion:'B',escuela:'Secundaria Norte'},{seccion:'A',escuela:'Secundaria Sur'}]);
  } finally { db.close(); }
});
