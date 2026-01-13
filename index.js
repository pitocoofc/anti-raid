const axios = require('axios');
const http = require('http');

// --- CONFIGURAÇÃO ---
const GROUP_ID = 34914689;
const COOKIE = process.env.COOKIE;
const WEBHOOK = process.env.WEBHOOK_URL;

// Servidor para evitar que o host derrube o bot por inatividade
http.createServer((req, res) => {
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.end("Vigilante Kalashi Ativo");
}).listen(process.env.PORT || 3000);

let lastLogId = 0;

// Função para enviar as mensagens ao Discord
async function sendWebhook(msg) {
    try {
        await axios.post(WEBHOOK, {
            embeds: [{
                title: msg.title || "📢 Sistema Kalashi",
                description: msg.desc,
                color: msg.color || 3447003,
                timestamp: new Date(),
                footer: { text: "Monitoramento de Elite" }
            }]
        });
    } catch (err) {
        console.error("Erro no Webhook:", err.message);
    }
}

async function checkLogs() {
    try {
        // Requisição direta para a API do Roblox usando o seu Cookie
        const response = await axios.get(
            `https://groups.roblox.com/v1/groups/${GROUP_ID}/audit-log?limit=10`,
            { headers: { Cookie: `.ROBLOSECURITY=${COOKIE}` } }
        );

        const logs = response.data.data;

        // Primeira execução: registra o ID atual para não repetir eventos passados
        if (lastLogId === 0) {
            lastLogId = logs[0]?.id || 0;
            await sendWebhook({
                title: "✅ Bot Online e Vigiando!",
                desc: `O Porteiro Kalashi iniciou com sucesso no Grupo **${GROUP_ID}**.`,
                color: 65280 // Verde
            });
            console.log("Sistema iniciado com sucesso.");
            return;
        }

        // Loop pelos logs do mais antigo para o mais novo
        for (const log of logs.reverse()) {
            if (log.id > lastLogId) {
                let titulo = "🛠️ Alteração Detectada";
                let descricao = `**Ação:** ${log.actionType}\n**Por:** ${log.actor.user.username}`;
                let cor = 3447003; // Azul

                // Lógica para Aceitar no Grupo
                if (log.actionType === "Accept Join Request" || log.actionType === "Invite Player") {
                    titulo = "🚀 NOVO MEMBRO";
                    const alvo = log.description?.TargetName || "Membro Desconhecido";
                    descricao = `**${alvo}** entrou no grupo!\n**Aprovado por:** ${log.actor.user.username}`;
                    cor = 65280; // Verde
                } 
                // Lógica para Troca de Cargo (Subir/Rebaixar)
                else if (log.actionType === "Change Rank") {
                    titulo = "⬆️⬇️ CARGO ALTERADO";
                    const alvo = log.description?.TargetName || "Alvo Desconhecido";
                    const novoCargo = log.description?.NewRoleName || "N/A";
                    descricao = `**Membro:** ${alvo}\n**Novo Cargo:** ${novoCargo}\n**Feito por:** ${log.actor.user.username}`;
                    cor = 16776960; // Amarelo
                }
                // Lógica para Expulsão
                else if (log.actionType === "Remove Member") {
                    titulo = "❌ MEMBRO EXPULSO";
                    const alvo = log.description?.TargetName || "Alvo Desconhecido";
                    descricao = `O usuário **${alvo}** foi removido do grupo.\n**Autor:** ${log.actor.user.username}`;
                    cor = 16711680; // Vermelho
                }

                await sendWebhook({
                    title: titulo,
                    desc: descricao,
                    color: cor
                });

                lastLogId = log.id; // Atualiza para não repetir
            }
        }

    } catch (err) {
        if (err.response?.status === 401) {
            console.error("❌ Cookie Inválido ou Expirado!");
        } else {
            console.error("Erro na checagem:", err.message);
        }
    }
}

// Verifica a cada 40 segundos para evitar Rate Limit
setInterval(checkLogs, 40000);
