const axios = require('axios');
const http = require('http');

// CONFIGURAÇÃO
const GROUP_ID = 34914689;
const COOKIE = process.env.COOKIE;
const WEBHOOK = process.env.WEBHOOK_URL;

// Servidor fake para o Render/Koyeb não dar erro
http.createServer((req, res) => res.end("Vigilante Ativo")).listen(process.env.PORT || 3000);

let lastLogId = 0;

async function checkLogs() {
    try {
        const response = await axios.get(
            `https://groups.roblox.com/v1/groups/${GROUP_ID}/audit-log?limit=10`,
            { headers: { Cookie: `.ROBLOSECURITY=${COOKIE}` } }
        );

        const logs = response.data.data;
        if (lastLogId === 0) {
            lastLogId = logs[0]?.id || 0;
            console.log("Sistema iniciado. Monitorando...");
            return;
        }

        for (const log of logs) {
            if (log.id > lastLogId) {
                console.log(`Novo evento: ${log.actionType}`);
                await axios.post(WEBHOOK, {
                    embeds: [{
                        title: "🚨 Alerta de Auditoria",
                        description: `**Ação:** ${log.actionType}\n**Usuário:** ${log.actor.user.username}`,
                        color: 3447003,
                        timestamp: new Date()
                    }]
                });
            }
        }
        if (logs.length > 0) lastLogId = logs[0].id;

    } catch (err) {
        console.error("Erro na requisição:", err.response?.status || err.message);
    }
}

// Verifica a cada 40 segundos
setInterval(checkLogs, 40000);
