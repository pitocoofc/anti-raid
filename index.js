const noblox = require('noblox.js');
const axios = require('axios');

// --- CONFIGURAÇÕES ---
const GROUP_ID = 34914689; // ID do seu grupo já fixado
const COOKIE = process.env.COOKIE; // Pega da variável do Railway
const WEBHOOK_URL = process.env.WEBHOOK_URL; // Pega da variável do Railway
const CHECK_INTERVAL = 30000; // Checa a cada 30 segundos

let lastLogId = null;

async function sendDiscordMsg(embed) {
    try {
        await axios.post(WEBHOOK_URL, { embeds: [embed] });
    } catch (err) {
        console.error("Erro no Webhook:", err.message);
    }
}

async function startBot() {
    try {
        const user = await noblox.setCookie(COOKIE);
        console.log(`✅ Porteiro Kalashi Online: ${user.UserName}`);

        // Pega o ID do último evento para não repetir avisos antigos
        const initialLog = await noblox.getAuditLog(GROUP_ID, { limit: 1 });
        if (initialLog.data.length > 0) {
            lastLogId = initialLog.data[0].id;
        }

        setInterval(async () => {
            try {
                const logs = await noblox.getAuditLog(GROUP_ID, { limit: 5 });
                const newLogs = logs.data.filter(log => log.id > lastLogId).reverse();

                for (const log of newLogs) {
                    let title = "🛠️ ALTERAÇÃO NO GRUPO";
                    let description = `**Ação:** ${log.action}\n**Por:** ${log.actor.user.username}`;
                    let color = 3447003; 

                    if (log.action === "Invite Player" || log.action === "Accept Join Request") {
                        title = "🚀 NOVO MEMBRO";
                        description = `**${log.description.TargetName}** entrou no grupo!`;
                        color = 65280; 
                    } else if (log.action === "Change Rank") {
                        title = "⬆️ CARGO ALTERADO";
                        description = `**${log.description.TargetName}** subiu para **${log.description.NewRoleName}**`;
                        color = 16776960;
                    } else if (log.action === "Remove Member") {
                        title = "❌ REMOÇÃO";
                        description = `**${log.description.TargetName}** foi removido.`;
                        color = 16711680;
                    }

                    await sendDiscordMsg({
                        title: title,
                        description: description,
                        color: color,
                        timestamp: new Date(),
                        footer: { text: "Sistema de Vigilância Kalashi" }
                    });

                    lastLogId = log.id;
                }
            } catch (e) {
                console.log("Aguardando novos eventos...");
            }
        }, CHECK_INTERVAL);

    } catch (err) {
        console.error("❌ Erro de Login (Verifique o Cookie):", err.message);
    }
}

startBot();
