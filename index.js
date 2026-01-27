const axios = require('axios');
const http = require('http');

// --- CONFIGURAÇÃO ---
const GROUP_ID = 34914689;
const API_KEY = process.env.ROBLOX_API_KEY; // Mude o nome da variável no seu Host
const WEBHOOK = process.env.WEBHOOK_URL;

// Servidor para evitar que o host derrube o bot por inatividade
http.createServer((req, res) => {
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.end("Vigilante Kalashi Ativo com API Key");
}).listen(process.env.PORT || 3000);

let lastLogId = "";

// Função para enviar as mensagens ao Discord
async function sendWebhook(msg) {
    try {
        await axios.post(WEBHOOK, {
            embeds: [{
                title: msg.title || "📢 Sistema Kalashi",
                description: msg.desc,
                color: msg.color || 3447003,
                timestamp: new Date(),
                footer: { text: "Monitoramento Open Cloud" }
            }]
        });
    } catch (err) {
        console.error("Erro no Webhook:", err.message);
    }
}

async function checkLogs() {
    try {
        // A API de Open Cloud usa este formato de URL e o header 'x-api-key'
        const response = await axios.get(
            `https://apis.roblox.com/cloud/v2/groups/${GROUP_ID}/audit-log?maxPageSize=10`,
            { 
                headers: { 
                    'x-api-key': API_KEY 
                } 
            }
        );

        // No Open Cloud, os logs vêm dentro de 'logs'
        const logs = response.data.logs;

        if (!logs || logs.length === 0) return;

        // Primeira execução
        if (lastLogId === "") {
            lastLogId = logs[0].path; // O Open Cloud usa caminhos/IDs únicos no 'path'
            await sendWebhook({
                title: "✅ Bot Online (Open Cloud)!",
                desc: `O Porteiro Kalashi iniciou usando API KEY no Grupo **${GROUP_ID}**.`,
                color: 65280
            });
            return;
        }

        // Os logs da Open Cloud costumam vir do mais novo para o mais antigo
        // Vamos filtrar os novos baseado no que ainda não vimos
        const newLogs = [];
        for (const log of logs) {
            if (log.path === lastLogId) break;
            newLogs.push(log);
        }

        for (const log of newLogs.reverse()) {
            let titulo = "🛠️ Alteração Detectada";
            let ator = log.actorUser || "Sistema/Desconhecido";
            let descricao = `**Ação:** ${log.actionType}\n**Por:** ${ator}`;
            let cor = 3447003;

            // Ajuste de termos (A API Cloud usa nomes levemente diferentes)
            if (log.actionType.includes("MemberJoined") || log.actionType.includes("Accept")) {
                titulo = "🚀 NOVO MEMBRO";
                cor = 65280;
            } else if (log.actionType.includes("MemberRankChanged")) {
                titulo = "⬆️⬇️ CARGO ALTERADO";
                cor = 16776960;
            } else if (log.actionType.includes("MemberRemoved")) {
                titulo = "❌ MEMBRO EXPULSO";
                cor = 16711680;
            }

            await sendWebhook({
                title: titulo,
                desc: descricao,
                color: cor
            });
        }

        lastLogId = logs[0].path;

    } catch (err) {
        console.error("Erro na checagem:", err.response?.data || err.message);
    }
}

// Verifica a cada 40 segundos
setInterval(checkLogs, 40000);
