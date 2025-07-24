const makeWASocket = require('@whiskeysockets/baileys').default;
const { useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const Boom = require('@hapi/boom');

async function startSock() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        logger: require('@whiskeysockets/baileys').defaultLogger({ level: 'info' }),
    });

    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) {
            console.log('Scan this QR with WhatsApp to pair the device.');
        }
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error?.output?.statusCode) !== DisconnectReason.loggedOut;
            console.log('connection closed due to ', lastDisconnect?.error, ', reconnecting ', shouldReconnect);
            if (shouldReconnect) startSock();
        } else if (connection === 'open') {
            console.log('opened connection');
        }
    });

    /**
     * Send a text message to the given JID
     * @param {string} jid - WhatsApp ID of the recipient
     * @param {string} text - Message text
     */
    async function sendMessage(jid, text) {
        try {
            await sock.sendMessage(jid, { text });
        } catch (err) {
            throw Boom.badImplementation('Failed to send message', err);
        }
    }

    return { sock, sendMessage };
}

startSock().catch(err => {
    console.error('Unexpected error', err);
});
