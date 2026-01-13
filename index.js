const axios = require('axios');
const http = require('http');

// CONFIGURAÇÃO
const GROUP_ID = 34914689;
const COOKIE = process.env.COOKIE;
const WEBHOOK = process.env.WEBHOOK_URL;

// Servidor para o host não derrubar o bot
http.createServer((req, res) => res.end("Vigilante Kalashi Ativo")).listen(process.env.PORT || 3000);

let lastLogId = 0;

async function sendWebhook(msg) {
    try {
        await axios.post(WEBHOOK, {
            embeds: [{
                title: msg.title || "📢 Sistema Kalashi",
                description: msg.desc,
                color: msg.color || 3447003,
                timestamp: new Date()
            }]
        });
    } catch (err) {
        console.error("Erro no Webhook:", err.message);
    }
}

async function checkLogs() {
    try {
        const response = await axios.get(
            `https://groups.roblox.com/v1/groups/${GROUP_ID}/audit-log?limit=10`,
            { headers: { Cookie: `.ROBLOSECURITY=${COOKIE}` } }
        );

        const logs = response.data.data;

        // Na primeira rodada, só marca o ID do último log
        if (lastLogId === 0) {
            lastLogId = logs[0]?.id || 0;
            // AVISO QUE VOCÊ PEDIU:
            await sendWebhook({
                title: "✅ Bot Online!",
                desc: "O Porteiro Kalashi acabou de ligar e já está vigiando o grupo.",
                color: 65280 // Verde
            });
            console.log("Monitorando...");
            return;
        }

        // Checa se há logs novos
        for (const log of logs) {
            if (log.id > lastLogId) {
                await sendWebhook({
                    title: "🚨 Nova Ação Detectada",
                    desc: `**Ação:** ${log.actionType}\n**Usuário:** ${log.actor.user.username}`,
                    color: 16776960 // Amarelo
                });
            }
        }
        
        if (logs.length > 0) lastLogId = logs[0].id;

    } catch (err) {
        // Se der erro 401, o Cookie expirou ou é inválido
        if (err.response?.status === 401) {
            console.error("❌ Erro: Cookie Inválido!");
        }
    }
}

// Inicia e verifica a cada 40 segundos
setInterval(checkLogs, 40000);
