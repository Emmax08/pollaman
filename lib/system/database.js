import path from 'path'
import _ from 'lodash'
import yargs from 'yargs/yargs'
import Database from 'better-sqlite3'

global.opts = Object(yargs(process.argv.slice(2)).exitProcess(false).parse())
const dbPath = path.join(process.cwd(), 'lib', 'database.db')
const conn = new Database(dbPath, { fileMustExist: false, timeout: 10000 })
conn.pragma('journal_mode = WAL')
conn.pragma('synchronous = NORMAL')
conn.pragma('cache_size = -32000')
conn.pragma('temp_store = MEMORY')
conn.pragma('mmap_size = 268435456')
conn.pragma('wal_autocheckpoint = 1000')
conn.pragma('busy_timeout = 5000')

const stmts = {}
function stmt(sql) {
  if (!stmts[sql]) stmts[sql] = conn.prepare(sql)
  return stmts[sql]
}

conn.exec(`
  CREATE TABLE IF NOT EXISTS usuarios (
    key TEXT PRIMARY KEY,
    data TEXT
  );
  CREATE TABLE IF NOT EXISTS chats (
    id TEXT PRIMARY KEY,
    contenido TEXT
  );
  CREATE TABLE IF NOT EXISTS settings (
    clave TEXT PRIMARY KEY,
    valor TEXT
  );
  CREATE TABLE IF NOT EXISTS characters (
    clave TEXT PRIMARY KEY,
    valor TEXT
  );
  CREATE TABLE IF NOT EXISTS stickerspack (
    clave TEXT PRIMARY KEY,
    valor TEXT
  );
`)

const memCache = new Map()
const TTL = { user: 600000, chat: 600000, set: 300000, char: 600000, spack: 600000 }
setInterval(() => {
  const now = Date.now()
  for (const [key, val] of memCache) {
    const type = key.split(':')[0]
    if (now - val.ts > (TTL[type] ?? 600000)) memCache.delete(key)
  }
}, 120000)

function delFromCache(type, id) {
  memCache.delete(`${type}:${id}`)
}

global.db = {
  conn,
  data: {
    users:        {},
    chats:        {},
    settings:     {},
    characters:   {},
    stickerspack: {}
  },
  chain: null,
  READ: false,
  _snapshot: {
    users:        '{}',
    chats:        '{}',
    settings:     '{}',
    characters:   '{}',
    stickerspack: '{}'
  }
}

global.DATABASE = global.db
global.loadDatabase = function loadDatabase() {
  if (global.db.READ) return global.db.data
  global.db.READ = tru
  for (const row of stmt('SELECT key, data FROM usuarios').all())
    try { global.db.data.users[row.key] = JSON.parse(row.data) } catch {}
  for (const row of stmt('SELECT id, contenido FROM chats').all())
    try { global.db.data.chats[row.id] = JSON.parse(row.contenido) } catch {}
  for (const row of stmt('SELECT clave, valor FROM settings').all())
    try { global.db.data.settings[row.clave] = JSON.parse(row.valor) } catch {}
  for (const row of stmt('SELECT clave, valor FROM characters').all())
    try { global.db.data.characters[row.clave] = JSON.parse(row.valor) } catch {}
  for (const row of stmt('SELECT clave, valor FROM stickerspack').all())
    try { global.db.data.stickerspack[row.clave] = JSON.parse(row.valor) } catch {}
  global.db.chain = _.chain(global.db.data)
  global.db.READ = false
  const snap = global.db._snapshot
  snap.users = JSON.stringify(global.db.data.users)
  snap.chats = JSON.stringify(global.db.data.chats)
  snap.settings = JSON.stringify(global.db.data.settings)
  snap.characters = JSON.stringify(global.db.data.characters)
  snap.stickerspack = JSON.stringify(global.db.data.stickerspack)
  return global.db.data
}

function hasPendingChanges() {
  const { users, chats, settings, characters, stickerspack } = global.db.data
  const snap = global.db._snapshot
  return (snap.users !== JSON.stringify(users) || snap.chats !== JSON.stringify(chats) || snap.settings !== JSON.stringify(settings) || snap.characters   !== JSON.stringify(characters)   ||
    snap.stickerspack !== JSON.stringify(stickerspack)
  )
}

global.saveDatabase = function saveDatabase() {
  if (!hasPendingChanges()) return
  const { users, chats, settings, characters, stickerspack } = global.db.data
  conn.transaction(() => {
    const s = stmt('REPLACE INTO usuarios (key, data) VALUES (?, ?)')
    for (const [key, data] of Object.entries(users)) s.run(key, JSON.stringify(data))
  })()
  conn.transaction(() => {
    const s = stmt('REPLACE INTO chats (id, contenido) VALUES (?, ?)')
    for (const [id, contenido] of Object.entries(chats)) s.run(id, JSON.stringify(contenido))
  })()
  conn.transaction(() => {
    const s = stmt('REPLACE INTO settings (clave, valor) VALUES (?, ?)')
    for (const [clave, valor] of Object.entries(settings)) s.run(clave, JSON.stringify(valor))
  })()
  conn.transaction(() => {
    const s = stmt('REPLACE INTO characters (clave, valor) VALUES (?, ?)')
    for (const [clave, valor] of Object.entries(characters)) s.run(clave, JSON.stringify(valor))
  })()
  conn.transaction(() => {
    const s = stmt('REPLACE INTO stickerspack (clave, valor) VALUES (?, ?)')
    for (const [clave, valor] of Object.entries(stickerspack)) s.run(clave, JSON.stringify(valor))
  })()
  const snap = global.db._snapshot
  snap.users = JSON.stringify(users)
  snap.chats = JSON.stringify(chats)
  snap.settings = JSON.stringify(settings)
  snap.characters = JSON.stringify(characters)
  snap.stickerspack = JSON.stringify(stickerspack)
}

let lastSave = Date.now()
setInterval(() => {
  const now = Date.now()
  if (now - lastSave >= 1000 && hasPendingChanges()) {
    global.saveDatabase()
    lastSave = now
  }
}, 500)

const isNumber = (x) => typeof x === 'number' && !isNaN(x)
export function initDB(m, client) {
  const jid = client.user.id.split(':')[0] + '@s.whatsapp.net'
  const settings = global.db.data.settings[jid] ||= {}
  settings.self ??= false
  settings.prefix ??= ['/', '!', '.', '#']
  settings.commandsejecut ??= isNumber(settings.commandsejecut) ? settings.commandsejecut : 0
  settings.id ??= '120363401893800327@newsletter'
  settings.nameid ??= "'ೃ࿔ mᥲríᥲ k᥆ȷᥙ᥆ ᑲ᥆𝗍 md .ೃ࿐"
  settings.type ??= 'Owner'
  settings.link ??= 'https://whatsapp.com/channel/0029Vb60E6xLo4hbOoM0NG3D'
  settings.banner ??= 'https://files.catbox.moe/d2g7zb.mp4'
  settings.icon ??= 'https://cdn.apicausas.xyz/v/avatar_test_1774801927332.jpg'
  settings.currency ??= 'MashaCoins'
  settings.namebot ??= 'Masha'
  settings.botname ??= 'Maria Mikhailovna Kujou'
  settings.owner ??= ''
  const user = global.db.data.users[m.sender] ||= {}
  user.name ??= m.pushName
  user.exp = isNumber(user.exp) ? user.exp : 0
  user.level = isNumber(user.level) ? user.level : 0
  user.usedcommands = isNumber(user.usedcommands) ? user.usedcommands : 0
  user.pasatiempo ??= ''
  user.description ??= ''
  user.marry ??= ''
  user.genre ??= ''
  user.birth ??= ''
  user.metadatos ??= null
  user.metadatos2 ??= null
  const chat = global.db.data.chats[m.chat] ||= {}
  chat.users ||= {}
  chat.isBanned   ??= false
  chat.welcome ??= false
  chat.goodbye ??= false
  chat.sWelcome ??= ''
  chat.sGoodbye ??= ''
  chat.nsfw ??= false
  chat.alerts ??= true
  chat.gacha ??= true
  chat.economy ??= true
  chat.adminonly ??= false
  chat.primaryBot ??= null
  chat.antilinks ??= true
  const cu = chat.users[m.sender] ||= {}
  cu.stats ||= {}
  cu.usedTime ??= null
  cu.lastCmd = isNumber(cu.lastCmd) ? cu.lastCmd : 0
  cu.coins = isNumber(cu.coins) ? cu.coins : 0
  cu.bank = isNumber(cu.bank) ? cu.bank : 0
  cu.afk = isNumber(cu.afk) ? cu.afk : -1
  cu.afkReason ??= ''
  cu.characters = Array.isArray(cu.characters) ? cu.characters : []
  delFromCache('user', m.sender)
  delFromCache('chat', m.chat)
  delFromCache('set', jid)
}

export default global.db
