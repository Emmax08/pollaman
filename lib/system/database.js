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
  CREATE TABLE IF NOT EXISTS usuarios(key TEXT PRIMARY KEY, data     TEXT);
  CREATE TABLE IF NOT EXISTS chats(id TEXT PRIMARY KEY, contenido TEXT);
  CREATE TABLE IF NOT EXISTS settings(clave TEXT PRIMARY KEY, valor    TEXT);
  CREATE TABLE IF NOT EXISTS characters(clave TEXT PRIMARY KEY, valor TEXT);
  CREATE TABLE IF NOT EXISTS stickerspack(clave TEXT PRIMARY KEY, valor TEXT);
`)

const SCHEMA = {
  user: {
    name: '', exp: 0, level: 0, usedcommands: 0,
    pasatiempo: '', description: '', marry: '', genre: '', birth: '',
    metadatos: null, metadatos2: null
  },
  chatUser: {
    stats: {}, usedTime: null, lastCmd: 0,
    coins: 0, bank: 0, afk: -1, afkReason: '', characters: []
  },
  chat: {
    users: {}, isBanned: false, isMute: false,
    welcome: false, goodbye: false,
    sWelcome: '', sGoodbye: '', nsfw: false, alerts: true, gacha: true,
    economy: true, adminonly: false, primaryBot: null, antilinks: true
  },
  settings: {
    self: false, prefix: ['/', '!', '.', '#'], commandsejecut: 0,
    id: '120363401893800327@newsletter',
    nameid: "'ೃ࿔ mᥲríᥲ k᥆ȷᥙ᥆ ᑲ᥆𝗍 md .ೃ࿐",
    type: 'Owner', link: 'https://whatsapp.com/channel/0029Vb60E6xLo4hbOoM0NG3D',
    banner: 'https://files.catbox.moe/d2g7zb.mp4',
    icon: 'https://cdn.apicausas.xyz/v/avatar_test_1774801927332.jpg',
    currency: 'MashaCoins', namebot: 'Masha',
    botname: 'Maria Mikhailovna Kujou', owner: ''
  }
}

function schema(name) {
  return JSON.parse(JSON.stringify(SCHEMA[name]))
}

function hydrate(name, saved) {
  return Object.assign(schema(name), saved)
}

const isNum = (x) => typeof x === 'number' && !isNaN(x)

function fixNumbers(obj, defaults) {
  for (const [k, v] of Object.entries(defaults)) {
    if (typeof v === 'number' && !isNum(obj[k])) obj[k] = v
  }
}

global.db = {
  conn,
  data: { users: {}, chats: {}, settings: {}, characters: {}, stickerspack: {} },
  chain: null,
  READ: false,
  _snapshot: { users: '{}', chats: '{}', settings: '{}', characters: '{}', stickerspack: '{}' }
}

global.DATABASE = global.db

global.loadDatabase = function loadDatabase() {
  if (global.db.READ) return global.db.data
  global.db.READ = true

  for (const row of stmt('SELECT key, data FROM usuarios').all()) {
    try {
      const u = hydrate('user', JSON.parse(row.data))
      fixNumbers(u, SCHEMA.user)
      global.db.data.users[row.key] = u
    } catch {}
  }

  for (const row of stmt('SELECT id, contenido FROM chats').all()) {
    try {
      const parsed = JSON.parse(row.contenido)
      const chatUsers = {}
      for (const [uid, cu] of Object.entries(parsed.users || {})) {
        const hydrated = hydrate('chatUser', cu)
        fixNumbers(hydrated, SCHEMA.chatUser)
        if (typeof hydrated.stats !== 'object' || hydrated.stats === null) hydrated.stats = {}
        if (!Array.isArray(hydrated.characters)) hydrated.characters = []
        chatUsers[uid] = hydrated
      }
      const c = hydrate('chat', { ...parsed, users: chatUsers })
      global.db.data.chats[row.id] = c
    } catch {}
  }

  for (const row of stmt('SELECT clave, valor FROM settings').all()) {
    try {
      const s = hydrate('settings', JSON.parse(row.valor))
      fixNumbers(s, SCHEMA.settings)
      global.db.data.settings[row.clave] = s
    } catch {}
  }

  for (const row of stmt('SELECT clave, valor FROM characters').all()) {
    try { global.db.data.characters[row.clave] = JSON.parse(row.valor) } catch {}
  }

  for (const row of stmt('SELECT clave, valor FROM stickerspack').all()) {
    try { global.db.data.stickerspack[row.clave] = JSON.parse(row.valor) } catch {}
  }

  global.db.chain = _.chain(global.db.data)
  global.db.READ = false
  _updateSnapshot()
  return global.db.data
}

function _updateSnapshot() {
  const snap = global.db._snapshot
  const { users, chats, settings, characters, stickerspack } = global.db.data
  snap.users = JSON.stringify(users)
  snap.chats = JSON.stringify(chats)
  snap.settings = JSON.stringify(settings)
  snap.characters = JSON.stringify(characters)
  snap.stickerspack = JSON.stringify(stickerspack)
}

function hasPendingChanges() {
  const snap = global.db._snapshot
  const { users, chats, settings, characters, stickerspack } = global.db.data
  return (
    snap.users !== JSON.stringify(users) ||
    snap.chats !== JSON.stringify(chats) ||
    snap.settings !== JSON.stringify(settings) ||
    snap.characters !== JSON.stringify(characters) ||
    snap.stickerspack !== JSON.stringify(stickerspack)
  )
}

global.saveDatabase = function saveDatabase() {
  if (!hasPendingChanges()) return
  const { users, chats, settings, characters, stickerspack } = global.db.data

  try {
    conn.transaction(() => {
      const sUser = stmt('REPLACE INTO usuarios (key, data) VALUES (?, ?)')
      const sChat = stmt('REPLACE INTO chats (id, contenido) VALUES (?, ?)')
      const sSet = stmt('REPLACE INTO settings (clave, valor) VALUES (?, ?)')
      const sChar = stmt('REPLACE INTO characters (clave, valor) VALUES (?, ?)')
      const sSpack = stmt('REPLACE INTO stickerspack (clave, valor) VALUES (?, ?)')

      for (const [k, v] of Object.entries(users)) sUser.run(k, JSON.stringify(v))
      for (const [k, v] of Object.entries(chats)) sChat.run(k, JSON.stringify(v))
      for (const [k, v] of Object.entries(settings)) sSet.run(k, JSON.stringify(v))
      for (const [k, v] of Object.entries(characters)) sChar.run(k, JSON.stringify(v))
      for (const [k, v] of Object.entries(stickerspack)) sSpack.run(k, JSON.stringify(v))
    })()

    _updateSnapshot()
  } catch (err) {
    console.error('[DB] Error al guardar:', err)
  }
}

let lastSave = Date.now()
setInterval(() => {
  const now = Date.now()
  if (now - lastSave >= 1000 && hasPendingChanges()) {
    global.saveDatabase()
    lastSave = now
  }
}, 500).unref()

export function initDB(m, client) {
  if (!m?.sender || !m?.chat) return

  const jid = client.user.id.split(':')[0] + '@s.whatsapp.net'
  const data = global.db.data

  if (!data.settings[jid]) data.settings[jid] = schema('settings')
  const settings = data.settings[jid]
  fixNumbers(settings, SCHEMA.settings)
  for (const [k, v] of Object.entries(SCHEMA.settings)) {
    if (settings[k] === undefined || settings[k] === null && v !== null) settings[k] ??= v
  }

  if (!data.users[m.sender]) data.users[m.sender] = schema('user')
  const user = data.users[m.sender]
  if (!user.name) user.name = m.pushName || ''
  fixNumbers(user, SCHEMA.user)
  for (const [k, v] of Object.entries(SCHEMA.user)) { user[k] ??= v }

  if (!data.chats[m.chat]) data.chats[m.chat] = schema('chat')
  const chat = data.chats[m.chat]
  for (const [k, v] of Object.entries(SCHEMA.chat)) { if (k !== 'users') chat[k] ??= v }
  if (!chat.users || typeof chat.users !== 'object') chat.users = {}

  if (!chat.users[m.sender]) chat.users[m.sender] = schema('chatUser')
  const cu = chat.users[m.sender]
  fixNumbers(cu, SCHEMA.chatUser)
  for (const [k, v] of Object.entries(SCHEMA.chatUser)) { cu[k] ??= v }
  if (typeof cu.stats !== 'object' || cu.stats === null) cu.stats = {}
  if (!Array.isArray(cu.characters)) cu.characters = []
}

export { SCHEMA }
export default global.db
