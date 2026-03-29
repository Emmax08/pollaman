import fs from 'fs';
import { watchFile, unwatchFile } from 'fs'
import { fileURLToPath } from 'url'

global.owner = ['573196588149', '18493873691', '12892581751‬', '18294868853', '573135180876', '573114910796']
global.botNumber = ''

global.sessionName = 'Sessions/Owner'
global.version = '^2.0 - Latest'
global.dev = "© ⍴᥆ᥕᥱrᥱძ ᑲᥡ Emmax-kun"
global.links = {
api: 'https://api.yuki-wabot.my.id',
channel: "https://whatsapp.com/channel/0029Vb60E6xLo4hbOoM0NG3D",
}

global.my = {
ch1: '120363401893800327@newsletter',
name1: 'ೃ࿔ mᥲríᥲ-k᥆ȷᥙ᥆-ᑲ᥆𝗍-md .ೃ࿐',
ch2: '120363401404146384@newsletter',
name2: 'ೃ࿔ ყµҡเ ωαɓσƭร - σƒƒเ૮เαℓ ૮ɦαɳɳεℓ .ೃ࿐'
}

global.mess = {
socket: '《✧》 Este comando solo puede ser ejecutado por un Socket.',
admin: '《✧》 Este comando solo puede ser ejecutado por los Administradores del Grupo.',
botAdmin: '《✧》 Este comando solo puede ser ejecutado si el Socket es Administrador del Grupo.'
}

global.APIs = {
yuki: { url: "https://api.yuki-wabot.my.id", key: "YukiWaBot" },
ootaizumi: { url: "https://api.ootaizumi.web.id", key: null },
delirius: { url: "https://api.delirius.store", key: null },
axi: { url: "https://apiaxi.i11.eu", key: null },
vreden: { url: "https://api.vreden.web.id", key: null }
}

let file = fileURLToPath(import.meta.url)
watchFile(file, () => {
  unwatchFile(file)
  import(`${file}?update=${Date.now()}`)
})
