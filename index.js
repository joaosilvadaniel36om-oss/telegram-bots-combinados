const { Telegraf, Markup, Scenes, session } = require('telegraf');
const express = require('express');
const app = express();

// Dados compartilhados em memória (users, products, etc.)
const data = {
  configs: { supportLink: 't.me/suporte', logsDestination: 't.me/logs', separator: '===', maintenance: false, searchEnabled: true, bonusRegistro: 0 },
  admins: [8206910765],
  users: {}, // { id: { balance: 0, affiliates: [], points: 0, purchases: [], username: '' } }
  products: [], // { name, price, description, email, password, duration, stock: 1, alerts: false }
  transactions: [], // { userId, type: 'compra'|'recarga', amount, date, name? }
  affiliateConfig: { enabled: true, pointsPerRecharge: 10, minPointsToConvert: 400, multiplier: 0.01 },
  pixConfig: { minDeposit: 1, maxDeposit: 1000, expiration: '30m', bonus: 0, minBonus: 0, mpToken: '' },
  searchImages: []
};

// Bot Admin
const adminBot = new Telegraf('8322262425:AAH3k6l9X6u1M4_FHNzG5HHLmELnfO6xqkM');
adminBot.use(session());
const adminStage = new Scenes.Stage();

// Bot Loja
const lojaBot = new Telegraf('8302274864:AAFqZ4_xVg1pfDIfY8P6s60m85cA_KkFsEw');
lojaBot.use(session());
const lojaStage = new Scenes.Stage();

// --- Scenes para Admin ---

// Configurações Gerais
const configGeralScene = new Scenes.BaseScene('config_geral');
configGeralScene.enter((ctx) => ctx.editMessageText(
  `🔧 CONFIGURAÇÕES GERAIS\n📭 DESTINO DAS LOG'S: ${data.configs.logsDestination}\n👤 LINK DO SUPORTE ATUAL: ${data.configs.supportLink}\n✂️ SEPARADOR: ${data.configs.separator}`,
  Markup.inlineKeyboard([
    [Markup.button.callback('♻️ RENOVAR PLANO ♻️', 'renovar_plano')],
    [Markup.button.callback('🤖 REINICIAR BOT 🤖', 'reiniciar_bot')],
    [Markup.button.callback(`🔴 MANUTENÇÃO (${data.configs.maintenance ? 'on' : 'off'})`, 'toggle_manutencao')],
    [Markup.button.callback('🎧 MUDAR SUPORTE', 'mudar_suporte')],
    [Markup.button.callback('✂️ MUDAR SEPARADOR', 'mudar_separador')],
    [Markup.button.callback('📭 MUDAR DESTINO LOG', 'mudar_log')],
    [Markup.button.callback('↩️ VOLTAR', 'voltar')]
  ]).extra({ parse_mode: 'Markdown' })
));
configGeralScene.action('renovar_plano', (ctx) => ctx.reply('Plano renovado! ✅ (Placeholder)'));
configGeralScene.action('reiniciar_bot', (ctx) => ctx.reply('Bot reiniciado! ✅ (Placeholder)'));
configGeralScene.action('toggle_manutencao', (ctx) => {
  data.configs.maintenance = !data.configs.maintenance;
  ctx.editMessageText(`Manutenção ${data.configs.maintenance ? 'ativada' : 'desativada'}! ✅`);
});
configGeralScene.action('mudar_suporte', (ctx) => {
  ctx.session.state = 'waiting_suporte';
  ctx.reply('Envie o novo link de suporte:');
});
configGeralScene.action('mudar_separador', (ctx) => {
  ctx.session.state = 'waiting_separador';
  ctx.reply('Envie o novo separador:');
});
configGeralScene.action('mudar_log', (ctx) => {
  ctx.session.state = 'waiting_log';
  ctx.reply('Envie o novo destino de logs:');
});
configGeralScene.on('text', (ctx) => {
  if (ctx.session.state === 'waiting_suporte') {
    data.configs.supportLink = ctx.message.text;
    ctx.reply('Suporte atualizado! ✅');
  } else if (ctx.session.state === 'waiting_separador') {
    data.configs.separator = ctx.message.text;
    ctx.reply('Separador atualizado! ✅');
  } else if (ctx.session.state === 'waiting_log') {
    data.configs.logsDestination = ctx.message.text;
    ctx.reply('Destino de logs atualizado! ✅');
  }
  delete ctx.session.state;
});

// Outras scenes para admin seguem o mesmo padrão (action define state, on('text') processa baseado em state)

const configAdminsScene = new Scenes.BaseScene('config_admins');
configAdminsScene.enter((ctx) => ctx.editMessageText(
  `🅰️ PAINEL CONFIGURAR ADMIN\n👮 Administradores: ${data.admins.join(', ')}`,
  Markup.inlineKeyboard([
    [Markup.button.callback('➕ ADICIONAR ADM', 'add_admin')],
    [Markup.button.callback('🚮 REMOVER ADM', 'remove_admin')],
    [Markup.button.callback('🗞️ LISTA DE ADM', 'list_admin')],
    [Markup.button.callback('↩️ VOLTAR', 'voltar')]
  ]).extra({ parse_mode: 'Markdown' })
));
configAdminsScene.action('add_admin', (ctx) => {
  ctx.session.state = 'waiting_add_admin';
  ctx.reply('Envie o ID do novo admin:');
});
configAdminsScene.action('remove_admin', (ctx) => {
  ctx.session.state = 'waiting_remove_admin';
  ctx.reply('Envie o ID do admin a remover:');
});
configAdminsScene.action('list_admin', (ctx) => ctx.reply(`Lista de admins: ${data.admins.join(', ')}`));
configAdminsScene.on('text', (ctx) => {
  const id = parseInt(ctx.message.text);
  if (ctx.session.state === 'waiting_add_admin') {
    if (!data.admins.includes(id)) data.admins.push(id);
    ctx.reply('Admin adicionado! ✅');
  } else if (ctx.session.state === 'waiting_remove_admin') {
    data.admins = data.admins.filter(a => a !== id);
    ctx.reply('Admin removido! ✅');
  }
  delete ctx.session.state;
});

// Adicione as outras scenes para afiliados, users, pix, logins, pesquisa, usando o mesmo padrão de state para inputs.

adminStage.register(configGeralScene, configAdminsScene /* adicione todas */);
adminBot.use(adminStage.middleware());

// Comando para admin
adminBot.command('admin', (ctx) => {
  if (ctx.from.id !== 8206910765 && !data.admins.includes(ctx.from.id)) return ctx.reply('Acesso negado!');
  ctx.scene.enter('admin');
});

// --- Scenes para Loja ---

// Recarga
const recargaScene = new Scenes.BaseScene('recarga');
recargaScene.enter((ctx) => ctx.editMessageText(
  `💼 ID da Carteira: ${ctx.from.id}\n💵 Saldo Disponível: R$${data.users[ctx.from.id]?.balance || 0}\n\n💡Selecione uma opção para recarregar:`,
  Markup.inlineKeyboard([
    [Markup.button.callback('PUSHIN PAY', 'pushin_pay')],
    [Markup.button.callback('↩️ Voltar', 'voltar')]
  ]).extra({ parse_mode: 'Markdown' })
));
recargaScene.action('pushin_pay', (ctx) => {
  ctx.session.state = 'waiting_valor_recarga';
  ctx.editMessageText('ℹ️ Informe o valor que deseja recarregar:\n🔻 Recarga mínima: R$1', Markup.removeKeyboard().extra());
});
recargaScene.on('text', (ctx) => {
  if (ctx.session.state === 'waiting_valor_recarga') {
    const amount = parseFloat(ctx.message.text);
    if (amount < data.pixConfig.minDeposit || amount > data.pixConfig.maxDeposit) return ctx.reply(`Valor inválido! Mínimo: R$${data.pixConfig.minDeposit}, Máximo: R$${data.pixConfig.maxDeposit}`);
    ctx.reply(`Gerando pagamento...\n💰 Comprar Saldo com Pix Manual:\n⏱️ Expira em: ${data.pixConfig.expiration}\n💵 Valor: R$${amount}\n✨ ID da Recarga: ${Date.now()}\n\n🗞️ Atenção: Envie o comprovante para o suporte: ${data.configs.supportLink}\n⏰ Aguardando Pagamento`);
    // Placeholder para Mercado Pago: adicione saldo manualmente
    delete ctx.session.state;
  }
});

// Adicione as outras scenes para loja (comprar, perfil, ranking) usando o mesmo padrão.

lojaStage.register(recargaScene /* adicione todas */);
lojaBot.use(lojaStage.middleware());

// Comando para loja
lojaBot.start((ctx) => {
  // Código de start da loja, com menu, como anterior
  data.users[ctx.from.id] = data.users[ctx.from.id] || { balance: data.configs.bonusRegistro, affiliates: [], points: 0, purchases: [], username: ctx.from.username || 'Anonimo' };
  // ... replyWithPhoto e menu
});

// Servidor para Render
app.get('/', (req, res) => res.send('Bots rodando!'));
app.listen(process.env.PORT || 3000, () => console.log('Servidor rodando'));

adminBot.launch();
lojaBot.launch();
process.once('SIGINT', () => {
  adminBot.stop('SIGINT');
  lojaBot.stop('SIGINT');
});
process.once('SIGTERM', () => {
  adminBot.stop('SIGTERM');
  lojaBot.stop('SIGTERM');
});
