const
  path = require('path')

module.exports = {
  cliOptions: {
    'packt-email': ['e', 'Email address to sign in to Packt', 'string' ],
    'packt-password': ['p', 'Password to sign in to Packt', 'string' ],
    'pushbullet-key': ['k', 'Pushbullet API key, only required if you\'d like Pushbullet notifications', 'string' ],
    'pushbullet-target': ['t', 'Pushbullet target to send notifications to', 'string' ],
    'download-folder': ['d', 'Where to download to', 'path', path.join(__dirname, 'downloads')],
    'debug': ['x', 'Don\'t actually download, just barf debug info' ]
  },
  keys: {
    PACKT_EMAIL: 'packt-email',
    PACKT_PASSWORD: 'packt-password',
    PUSHBULLET_API_KEY: 'pushbullet-key',
    PUSHBULLET_TARGET: 'pushbullet-target',
    DOWNLOAD_FOLDER: 'download-folder',
    DEBUG: 'debug'
  }
}