const { Telegraf, Markup, Scenes, session } = require('telegraf');
const express = require('express');
const app = express();

// Dados em memória (substitui DB)
const data = {
  configs: { supportLink: 't.me/suporte', logsDestination: 't.me/logs', separator: '===', maintenance: false, searchEnabled: true, bonusRegistro: 0 },
  admins: [8206910765], // Você é admin master
  users: {}, // { id: { balance, affiliates, points, purchases, username } }
  products: [], // { name, price, description, email, password, duration, stock, alerts }
  transactions: [], // { userId, type, amount, date, name? }
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
  ctx.scene.enter('config_geral');
});

// Configurar Admins
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
  ctx.scene.enter('config_admins');
});

// Configurar Afiliados
const configAfiliadosScene = new Scenes.BaseScene('config_afiliados');
configAfiliadosScene.enter((ctx) => ctx.editMessageText(
  `🔻 PONTOS MÍNIMO PARA SALDO: ${data.affiliateConfig.minPointsToConvert}\n✖️ MULTIPLICADOR: ${data.affiliateConfig.multiplier}\n\n👥 SISTEMA DE INDICAÇÃO: ${data.affiliateConfig.enabled ? '🟢 On' : '🔴 Off'}`,
  Markup.inlineKeyboard([
    [Markup.button.callback(`🟢 SISTEMA DE INDICAÇÃO (${data.affiliateConfig.enabled ? 'on' : 'off'})`, 'toggle_afiliados')],
    [Markup.button.callback('🗞️ PONTOS POR RECARGA', 'pontos_recarga')],
    [Markup.button.callback('🔻 PONTOS MÍNIMO PARA CONVERTER', 'min_convert')],
    [Markup.button.callback('✖️ MULTIPLICADOR PARA CONVERTER', 'multiplicador')],
    [Markup.button.callback('↩️ VOLTAR', 'voltar')]
  ]).extra({ parse_mode: 'Markdown' })
));
configAfiliadosScene.action('toggle_afiliados', (ctx) => {
  data.affiliateConfig.enabled = !data.affiliateConfig.enabled;
  ctx.editMessageText(`Sistema de indicação ${data.affiliateConfig.enabled ? 'ativado' : 'desativado'}! ✅`);
});
configAfiliadosScene.action('pontos_recarga', (ctx) => {
  ctx.session.state = 'waiting_pontos_recarga';
  ctx.reply('Envie a quantidade de pontos por recarga:');
});
configAfiliadosScene.action('min_convert', (ctx) => {
  ctx.session.state = 'waiting_min_convert';
  ctx.reply('Envie o mínimo de pontos para converter:');
});
configAfiliadosScene.action('multiplicador', (ctx) => {
  ctx.session.state = 'waiting_multiplicador';
  ctx.reply('Envie o novo multiplicador:');
});
configAfiliadosScene.on('text', (ctx) => {
  if (ctx.session.state === 'waiting_pontos_recarga') {
    data.affiliateConfig.pointsPerRecharge = parseInt(ctx.message.text);
    ctx.reply('Pontos por recarga atualizados! ✅');
  } else if (ctx.session.state === 'waiting_min_convert') {
    data.affiliateConfig.minPointsToConvert = parseInt(ctx.message.text);
    ctx.reply('Mínimo para converter atualizado! ✅');
  } else if (ctx.session.state === 'waiting_multiplicador') {
    data.affiliateConfig.multiplier = parseFloat(ctx.message.text);
    ctx.reply('Multiplicador atualizado! ✅');
  }
  delete ctx.session.state;
  ctx.scene.enter('config_afiliados');
});

// Configurar Usuários
const configUsersScene = new Scenes.BaseScene('config_users');
configUsersScene.enter((ctx) => ctx.editMessageText(
  `📭 TRANSMITIR A TODOS\n🔎 PESQUISAR USUÁRIO\n🎁 BÔNUS DE REGISTRO: R$${data.configs.bonusRegistro}`,
  Markup.inlineKeyboard([
    [Markup.button.callback('📭 TRANSMITIR A TODOS', 'transmitir')],
    [Markup.button.callback('🔎 PESQUISAR USUARIO', 'pesquisar_user')],
    [Markup.button.callback('🎁 BONUS DE REGISTRO', 'bonus_registro')],
    [Markup.button.callback('↩️ VOLTAR', 'voltar')]
  ]).extra({ parse_mode: 'Markdown' })
));
configUsersScene.action('transmitir', (ctx) => {
  ctx.session.state = 'waiting_transmitir';
  ctx.reply('Envie a mensagem ou foto para transmitir:');
});
configUsersScene.action('pesquisar_user', (ctx) => {
  ctx.session.state = 'waiting_pesquisar_user';
  ctx.reply('Envie o ID do usuário:');
});
configUsersScene.action('bonus_registro', (ctx) => {
  ctx.session.state = 'waiting_bonus_registro';
  ctx.reply('Envie o valor do bônus de registro:');
});
configUsersScene.on('text', (ctx) => {
  if (ctx.session.state === 'waiting_transmitir') {
    ctx.reply('Mensagem transmitida a todos! ✅');
  } else if (ctx.session.state === 'waiting_pesquisar_user') {
    const user = data.users[ctx.message.text];
    if (user) ctx.reply(`Usuário: ${ctx.message.text}\nSaldo: R$${user.balance}\nCompras: ${user.purchases.length}`);
    else ctx.reply('Usuário não encontrado!');
  } else if (ctx.session.state === 'waiting_bonus_registro') {
    data.configs.bonusRegistro = parseFloat(ctx.message.text);
    ctx.reply('Bônus de registro atualizado! ✅');
  }
  delete ctx.session.state;
  ctx.scene.enter('config_users');
});
configUsersScene.on('photo', (ctx) => {
  if (ctx.session.state === 'waiting_transmitir') {
    ctx.reply('Foto transmitida a todos! ✅');
    delete ctx.session.state;
    ctx.scene.enter('config_users');
  }
});

// Configurar PIX
const configPixScene = new Scenes.BaseScene('config_pix');
configPixScene.enter((ctx) => ctx.editMessageText(
  `🔑 TOKEN MERCADO PAGO: ${data.pixConfig.mpToken || 'Não configurado'}\n🔻 DEPÓSITO MÍNIMO: R$${data.pixConfig.minDeposit}\n❗️ DEPÓSITO MÁXIMO: R$${data.pixConfig.maxDeposit}\n⏰ TEMPO DE EXPIRAÇÃO: ${data.pixConfig.expiration}\n🔶 BÔNUS DE DEPÓSITO: ${data.pixConfig.bonus}\n🔷 DEPÓSITO MÍNIMO PARA BÔNUS: R$${data.pixConfig.minBonus}`,
  Markup.inlineKeyboard([
    [Markup.button.callback('🔴 PIX MANUAL', 'pix_manual')],
    [Markup.button.callback('🟢 PIX AUTOMATICO', 'pix_auto')],
    [Markup.button.callback('🔑 MUDAR TOKEN', 'mudar_token')],
    [Markup.button.callback('🔻 MUDAR DEPOSITO MIN', 'min_deposito')],
    [Markup.button.callback('❗️ MUDAR DEPOSITO MAX', 'max_deposito')],
    [Markup.button.callback('⏰ MUDAR TEMPO DE EXPIRAÇÃO', 'expiracao')],
    [Markup.button.callback('🔶 MUDAR BÔNUS', 'bonus_deposito')],
    [Markup.button.callback('🔷 MUDAR MIN PARA BÔNUS', 'min_bonus')],
    [Markup.button.callback('↩️ VOLTAR', 'voltar')]
  ]).extra({ parse_mode: 'Markdown' })
));
configPixScene.action('pix_manual', (ctx) => ctx.reply('PIX manual ativado! ✅ (Placeholder)'));
configPixScene.action('pix_auto', (ctx) => ctx.reply('PIX automático ativado! ✅ (Placeholder para Mercado Pago)'));
configPixScene.action('mudar_token', (ctx) => {
  ctx.session.state = 'waiting_token';
  ctx.reply('Envie o token do Mercado Pago:');
});
configPixScene.action('min_deposito', (ctx) => {
  ctx.session.state = 'waiting_min_deposito';
  ctx.reply('Envie o depósito mínimo:');
});
configPixScene.action('max_deposito', (ctx) => {
  ctx.session.state = 'waiting_max_deposito';
  ctx.reply('Envie o depósito máximo:');
});
configPixScene.action('expiracao', (ctx) => {
  ctx.session.state = 'waiting_expiracao';
  ctx.reply('Envie o tempo de expiração:');
});
configPixScene.action('bonus_deposito', (ctx) => {
  ctx.session.state = 'waiting_bonus_deposito';
  ctx.reply('Envie o bônus de depósito:');
});
configPixScene.action('min_bonus', (ctx) => {
  ctx.session.state = 'waiting_min_bonus';
  ctx.reply('Envie o mínimo para bônus:');
});
configPixScene.on('text', (ctx) => {
  if (ctx.session.state === 'waiting_token') {
    data.pixConfig.mpToken = ctx.message.text;
    ctx.reply('Token atualizado! ✅');
  } else if (ctx.session.state === 'waiting_min_deposito') {
    data.pixConfig.minDeposit = parseFloat(ctx.message.text);
    ctx.reply('Depósito mínimo atualizado! ✅');
  } else if (ctx.session.state === 'waiting_max_deposito') {
    data.pixConfig.maxDeposit = parseFloat(ctx.message.text);
    ctx.reply('Depósito máximo atualizado! ✅');
  } else if (ctx.session.state === 'waiting_expiracao') {
    data.pixConfig.expiration = ctx.message.text;
    ctx.reply('Tempo de expiração atualizado! ✅');
  } else if (ctx.session.state === 'waiting_bonus_deposito') {
    data.pixConfig.bonus = parseFloat(ctx.message.text);
    ctx.reply('Bônus de depósito atualizado! ✅');
  } else if (ctx.session.state === 'waiting_min_bonus') {
    data.pixConfig.minBonus = parseFloat(ctx.message.text);
    ctx.reply('Mínimo para bônus atualizado! ✅');
  }
  delete ctx.session.state;
  ctx.scene.enter('config_pix');
});

// Configurar Logins
const configLoginsScene = new Scenes.BaseScene('config_logins');
configLoginsScene.enter((ctx) => ctx.editMessageText(
  `📦 LOGINS NO ESTOQUE: ${data.products.length}`,
  Markup.inlineKeyboard([
    [Markup.button.callback('📮 ADICIONAR LOGIN', 'add_login')],
    [Markup.button.callback('🥾 REMOVER LOGIN', 'remove_login')],
    [Markup.button.callback('❌ REMOVER POR PLATAFORMA', 'remove_plataforma')],
    [Markup.button.callback('📦 ESTOQUE DETALHADO', 'estoque_detalhado')],
    [Markup.button.callback('🗑️ ZERAR ESTOQUE', 'zerar_estoque')],
    [Markup.button.callback('💸 MUDAR VALOR DO SERVIÇO', 'mudar_valor')],
    [Markup.button.callback('🪪 MUDAR VALOR DE TODOS', 'mudar_valor_todos')],
    [Markup.button.callback('↩️ VOLTAR', 'voltar')]
  ]).extra({ parse_mode: 'Markdown' })
));
configLoginsScene.action('add_login', (ctx) => {
  ctx.session.state = 'waiting_add_login';
  ctx.reply(`Envie os logins no formato:\nNOME${data.configs.separator}VALOR${data.configs.separator}DESCRICAO${data.configs.separator}EMAIL${data.configs.separator}SENHA${data.configs.separator}DURACAO`);
});
configLoginsScene.action('remove_login', (ctx) => {
  ctx.session.state = 'waiting_remove_login';
  ctx.reply(`Envie o serviço e email no formato: SERVICO${data.configs.separator}EMAIL`);
});
configLoginsScene.action('remove_plataforma', (ctx) => {
  ctx.session.state = 'waiting_remove_plataforma';
  ctx.reply('Envie o nome da plataforma:');
});
configLoginsScene.action('estoque_detalhado', (ctx) => {
  ctx.reply(data.products.map(p => `${p.name}: R$${p.price}, Estoque: ${p.stock}`).join('\n') || 'Estoque vazio');
});
configLoginsScene.action('zerar_estoque', (ctx) => {
  data.products = [];
  ctx.reply('Estoque zerado! ✅');
});
configLoginsScene.action('mudar_valor', (ctx) => {
  ctx.session.state = 'waiting_mudar_valor';
  ctx.reply(`Envie o serviço e valor no formato: SERVICO${data.configs.separator}VALOR`);
});
configLoginsScene.action('mudar_valor_todos', (ctx) => {
  ctx.session.state = 'waiting_mudar_valor_todos';
  ctx.reply('Envie o novo valor para todos:');
});
configLoginsScene.on('text', (ctx) => {
  if (ctx.session.state === 'waiting_add_login') {
    const [name, price, description, email, password, duration] = ctx.message.text.split(data.configs.separator);
    data.products.push({ name, price: parseFloat(price), description, email, password, duration, stock: 1, alerts: false });
    if (data.products.find(p => p.name === name && p.alerts)) lojaBot.telegram.sendMessage(ctx.chat.id, `🤖 ${name} ABASTECIDO NO BOT`);
    ctx.reply('Login adicionado! ✅');
  } else if (ctx.session.state === 'waiting_remove_login') {
    const [name, email] = ctx.message.text.split(data.configs.separator);
    data.products = data.products.filter(p => !(p.name === name && p.email === email));
    ctx.reply('Login removido! ✅');
  } else if (ctx.session.state === 'waiting_remove_plataforma') {
    data.products = data.products.filter(p => p.name !== ctx.message.text);
    ctx.reply('Plataforma removida! ✅');
  } else if (ctx.session.state === 'waiting_mudar_valor') {
    const [name, price] = ctx.message.text.split(data.configs.separator);
    data.products = data.products.map(p => p.name === name ? { ...p, price: parseFloat(price) } : p);
    ctx.reply('Valor atualizado! ✅');
  } else if (ctx.session.state === 'waiting_mudar_valor_todos') {
    const price = parseFloat(ctx.message.text);
    data.products = data.products.map(p => ({ ...p, price }));
    ctx.reply('Valores atualizados! ✅');
  }
  delete ctx.session.state;
  ctx.scene.enter('config_logins');
});

// Configurar Pesquisa
const configPesquisaScene = new Scenes.BaseScene('config_pesquisa');
configPesquisaScene.enter((ctx) => ctx.editMessageText(
  `🔎 PAINEL DE CONFIGURAÇÃO DA PESQUISA DE SERVIÇOS\n📸 IMAGENS SALVAS: ${data.searchImages.length}`,
  Markup.inlineKeyboard([
    [Markup.button.callback(`🟢 SISTEMA PESQUISA (${data.configs.searchEnabled ? 'on' : 'off'})`, 'toggle_pesquisa')],
    [Markup.button.callback('➕ ADICIONAR IMAGEM', 'add_imagem')],
    [Markup.button.callback('🚮 REMOVER IMAGEM', 'remove_imagem')],
    [Markup.button.callback('↩️ VOLTAR', 'voltar')]
  ]).extra({ parse_mode: 'Markdown' })
));
configPesquisaScene.action('toggle_pesquisa', (ctx) => {
  data.configs.searchEnabled = !data.configs.searchEnabled;
  ctx.editMessageText(`Sistema de pesquisa ${data.configs.searchEnabled ? 'ativado' : 'desativado'}! ✅`);
});
configPesquisaScene.action('add_imagem', (ctx) => {
  ctx.session.state = 'waiting_add_imagem';
  ctx.reply('Envie a imagem:');
});
configPesquisaScene.action('remove_imagem', (ctx) => {
  ctx.session.state = 'waiting_remove_imagem';
  ctx.reply('Envie o índice da imagem a remover:');
});
configPesquisaScene.on('photo', (ctx) => {
  if (ctx.session.state === 'waiting_add_imagem') {
    data.searchImages.push(ctx.message.photo[0].file_id);
    ctx.reply('Imagem adicionada! ✅');
    delete ctx.session.state;
    ctx.scene.enter('config_pesquisa');
  }
});
configPesquisaScene.on('text', (ctx) => {
  if (ctx.session.state === 'waiting_remove_imagem') {
    data.searchImages.splice(parseInt(ctx.message.text), 1);
    ctx.reply('Imagem removida! ✅');
    delete ctx.session.state;
    ctx.scene.enter('config_pesquisa');
  }
});

// Menu Admin
const adminScene = new Scenes.BaseScene('admin');
adminScene.enter((ctx) => {
  if (ctx.from.id !== 8206910765 && !data.admins.includes(ctx.from.id)) return ctx.reply('Acesso negado!');
  const metrics = `📊 User: ${Object.keys(data.users).length}\n📈 Receita total: R$${data.transactions.reduce((sum, t) => sum + (t.type === 'recarga' ? t.amount : 0), 0).toFixed(2)}\n🗓️ Receita mensal: R$0\n💠 Receita de hoje: R$0\n🥇 Vendas total: ${data.transactions.filter(t => t.type === 'compra').length}\n🏆 Vendas hoje: 0`;
  ctx.editMessageText(`⚙️ DASHBOARD @AdminBot\n📅 Vencimento: Não definido\n👑 Vip: Não\n🤖 Software version: 1.0\n\n📔 Métrica do business\n${metrics}`, Markup.inlineKeyboard([
    [Markup.button.callback('🔧 CONFIGURAÇÕES', 'configs')],
    [Markup.button.callback('🔖 AÇÕES', 'acoes')],
    [Markup.button.callback('🔄 TRANSAÇÕES', 'transacoes')],
    [Markup.button.callback('↩️ VOLTAR', 'voltar')]
  ]).extra({ parse_mode: 'Markdown' })
));
adminScene.action('configs', (ctx) => ctx.scene.enter('configs_menu'));
adminScene.action('acoes', (ctx) => ctx.reply('Ações: Placeholder'));
adminScene.action('transacoes', (ctx) => ctx.reply('Transações: Placeholder'));

// Menu Configurações
const configsMenuScene = new Scenes.BaseScene('configs_menu');
configsMenuScene.enter((ctx) => ctx.editMessageText(
  `🔧 MENU DE CONFIGURAÇÕES DO BOT\n👮‍♀️ Admin: ${data.admins.join(', ')}\n💼 Dono: 8206910765`,
  Markup.inlineKeyboard([
    [Markup.button.callback('⚙️ CONFIGURAÇÕES GERAIS ⚙️', 'config_geral')],
    [Markup.button.callback('🕵️‍♀️ CONFIGURAR ADMINS', 'config_admins')],
    [Markup.button.callback('👥 CONFIGURAR AFILIADOS', 'config_afiliados')],
    [Markup.button.callback('👤 CONFIGURAR USUARIOS', 'config_users')],
    [Markup.button.callback('💠 CONFIGURAR PIX', 'config_pix')],
    [Markup.button.callback('🖥️ CONFIGURAR LOGINS', 'config_logins')],
    [Markup.button.callback('🔎 CONFIGURAR PESQUISA DE LOGIN', 'config_pesquisa')],
    [Markup.button.callback('↩️ VOLTAR', 'voltar')]
  ]).extra({ parse_mode: 'Markdown' })
));
configsMenuScene.action('config_geral', (ctx) => ctx.scene.enter('config_geral'));
configsMenuScene.action('config_admins', (ctx) => ctx.scene.enter('config_admins'));
configsMenuScene.action('config_afiliados', (ctx) => ctx.scene.enter('config_afiliados'));
configsMenuScene.action('config_users', (ctx) => ctx.scene.enter('config_users'));
configsMenuScene.action('config_pix', (ctx) => ctx.scene.enter('config_pix'));
configsMenuScene.action('config_logins', (ctx) => ctx.scene.enter('config_logins'));
configsMenuScene.action('config_pesquisa', (ctx) => ctx.scene.enter('config_pesquisa'));

// Voltar
adminStage.action('voltar', (ctx) => ctx.scene.enter('admin'));

adminStage.register(adminScene, configsMenuScene, configGeralScene, configAdminsScene, configAfiliadosScene, configUsersScene, configPixScene, configLoginsScene, configPesquisaScene);
adminBot.use(adminStage.middleware());

// Comandos Admin
adminBot.command('start', (ctx) => ctx.reply('Bem-vindo ao Admin Bot! Use /admin para acessar o painel.'));
adminBot.command('admin', (ctx) => ctx.scene.enter('admin'));

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
    // Adicione saldo manualmente via admin
    delete ctx.session.state;
    ctx.scene.enter('recarga');
  }
});

// Comprar
const comprarScene = new Scenes.BaseScene('comprar');
comprarScene.enter(async (ctx) => {
  const product = data.products.find(p => p.name === ctx.session.productName);
  if (!product || product.stock <= 0) return ctx.reply('Estoque vazio!');
  const user = data.users[ctx.from.id];
  if (user.balance < product.price) return ctx.reply(`Saldo insuficiente! Faltam R$${product.price - user.balance}. Faça uma recarga.`, Markup.inlineKeyboard([[Markup.button.callback('↩️ Voltar', 'voltar')]]).extra());
  user.balance -= product.price;
  product.stock -= 1;
  user.purchases.push({ name: product.name, price: product.price, date: new Date() });
  data.transactions.push({ userId: ctx.from.id, type: 'compra', amount: product.price, date: new Date(), name: product.name });
  ctx.reply(`Compra realizada!\nE-mail: ${product.email}\nSenha: ${product.password}\nDuração: ${product.duration}\n\n📄 Histórico salvo!`);
});

// Perfil
const perfilScene = new Scenes.BaseScene('perfil');
perfilScene.enter((ctx) => {
  const user = data.users[ctx.from.id] || { balance: 0, purchases: [], affiliates: [], points: 0, username: ctx.from.username || 'Anonimo' };
  ctx.editMessageText(
    `🙋‍♂️ Meu perfil\n\n🔎 Veja aqui os detalhes da sua conta:\n-👤 Informações:\n🆔 ID da Carteira: ${ctx.from.id}\n💰 Saldo Atual: R$${user.balance.toFixed(2)}\n\n📊 Suas movimentações:\n—🛒 Comprar Realizadas: ${user.purchases.length}\n—💠 Pix Inseridos: ${data.transactions.filter(t => t.userId === ctx.from.id && t.type === 'recarga').length}\n—🎁 Gifts Resgatados: R$0`,
    Markup.inlineKeyboard([
      [Markup.button.callback('🛍️ Historico De Compras', 'historico')],
      [Markup.button.callback('↩️ Voltar', 'voltar')]
    ]).extra({ parse_mode: 'Markdown' })
  );
});
perfilScene.action('historico', (ctx) => {
  const user = data.users[ctx.from.id];
  const txt = `HISTORICO DETALHADO\n@LojaBot\n_______________________\n\nCOMPRAS: ${user.purchases.map(p => `${p.name} - R$${p.price} - ${p.date.toISOString()}`).join('\n')}\n_______________________\n\nPAGAMENTOS: ${data.transactions.filter(t => t.userId === ctx.from.id && t.type === 'recarga').map(t => `R$${t.amount} - ${t.date.toISOString()}`).join('\n')}`;
  ctx.replyWithDocument({ source: Buffer.from(txt), filename: 'historico.txt' });
});

// Ranking
const rankingScene = new Scenes.BaseScene('ranking');
rankingScene.enter((ctx) => ctx.editMessageText(
  '🏆 Escolha o ranking:',
  Markup.inlineKeyboard([
    [Markup.button.callback('🔝 Serviços', 'ranking_servicos')],
    [Markup.button.callback('💸 Recargas', 'ranking_recargas')],
    [Markup.button.callback('🛒 Compras', 'ranking_compras')],
    [Markup.button.callback('🎁 Gift Card', 'ranking_gift')],
    [Markup.button.callback('💰 Saldo', 'ranking_saldo')],
    [Markup.button.callback('↩️ Voltar', 'voltar')]
  ]).extra({ parse_mode: 'Markdown' })
));
rankingScene.action('ranking_servicos', (ctx) => {
  const services = data.products.map(p => ({ name: p.name, count: data.transactions.filter(t => t.type === 'compra' && t.name === p.name).length }))
    .sort((a, b) => b.count - a.count).slice(0, 10)
    .map((s, i) => `${i + 1}°) ${s.name} ${['🥇', '🥈', '🥉'][i] || ''} - Com ${s.count} pedidos`);
  ctx.editMessageText(`🏆 Ranking dos serviços mais vendidos (deste mês)\n${services.join('\n') || 'Nenhum dado'}`, Markup.inlineKeyboard([[Markup.button.callback('↩️ Voltar', 'voltar')]]).extra());
});
rankingScene.action('ranking_recargas', (ctx) => {
  const users = Object.entries(data.users).map(([id, u]) => ({ id, amount: data.transactions.filter(t => t.userId === parseInt(id) && t.type === 'recarga').reduce((sum, t) => sum + t.amount, 0) }))
    .sort((a, b) => b.amount - a.amount).slice(0, 10)
    .map((u, i) => `${i + 1}°) @${u.username || 'User' + u.id} ${['🥇', '🥈', '🥉'][i] || ''} - Com R$${u.amount.toFixed(2)} em recargas`);
  ctx.editMessageText(`🏆 Ranking dos usuários que mais recarregaram (deste mês)\n${users.join('\n') || 'Nenhum dado'}`, Markup.inlineKeyboard([[Markup.button.callback('↩️ Voltar', 'voltar')]]).extra());
});
rankingScene.action('ranking_compras', (ctx) => {
  const users = Object.entries(data.users).map(([id, u]) => ({ id, count: u.purchases.length }))
    .sort((a, b) => b.count - a.count).slice(0, 10)
    .map((u, i) => `${i + 1}°) @${u.username || 'User' + u.id} ${['🥇', '🥈', '🥉'][i] || ''} - Com ${u.count} compras`);
  ctx.editMessageText(`🏆 Ranking dos usuários que mais compraram (deste mês)\n${users.join('\n') || 'Nenhum dado'}`, Markup.inlineKeyboard([[Markup.button.callback('↩️ Voltar', 'voltar')]]).extra());
});
rankingScene.action('ranking_gift', (ctx) => ctx.reply('Gift Card ranking: Placeholder'));
rankingScene.action('ranking_saldo', (ctx) => {
  const users = Object.entries(data.users).map(([id, u]) => ({ id, balance: u.balance }))
    .sort((a, b) => b.balance - a.balance).slice(0, 10)
    .map((u, i) => `${i + 1}°) @${u.username || 'User' + u.id} ${['🥇', '🥈', '🥉'][i] || ''} - Com R$${u.balance.toFixed(2)}`);
  ctx.editMessageText(`🏆 Ranking dos usuários com mais saldo\n${users.join('\n') || 'Nenhum dado'}`, Markup.inlineKeyboard([[Markup.button.callback('↩️ Voltar', 'voltar')]]).extra());
});

// --- Loja Bot ---

// Start
lojaBot.start((ctx) => {
  const payload = ctx.startPayload;
  if (payload.startsWith('ref_')) {
    const referrerId = parseInt(payload.slice(4));
    data.users[ctx.from.id] = data.users[ctx.from.id] || { balance: data.configs.bonusRegistro, affiliates: [referrerId], points: 0, purchases: [], username: ctx.from.username || 'Anonimo' };
  } else {
    data.users[ctx.from.id] = data.users[ctx.from.id] || { balance: data.configs.bonusRegistro, affiliates: [], points: 0, purchases: [], username: ctx.from.username || 'Anonimo' };
  }
  ctx.replyWithPhoto('https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSltpwF6kTey6ImHK0Z76OBq2AmdNgMsS7irFzm7Xv4Ji9whMxq-eD6PO2Y&s=10', {
    caption: `🥇Descubra como nosso bot pode transformar sua experiência de compras! ...\n\n👥Grupo De Clientes: Não definido\n👨‍💻 Link De Suporte: ${data.configs.supportLink}\n\nℹ️Seus Dados:\n🆔ID: ${ctx.from.id}\n💸Saldo Atual: R$${data.users[ctx.from.id].balance.toFixed(2)}\n🪪Usuário: @${ctx.from.username || 'N/A'}`,
    parse_mode: 'Markdown',
    reply_markup: Markup.inlineKeyboard([
      [Markup.button.callback('💎 Logins | Contas Premium', 'logins')],
      [Markup.button.callback('🪪 PERFIL', 'perfil'), Markup.button.callback('💰 RECARGA', 'recarga')],
      [Markup.button.callback('🎖️ Ranking', 'ranking')],
      [Markup.button.callback('👩‍💻 Suporte', 'suporte'), Markup.button.callback('ℹ️ Informações', 'info')],
      [Markup.button.callback('🔎 Pesquisar Serviços', 'pesquisar')]
    ]).extra()
  });
});

// Botões Loja
lojaBot.action('logins', (ctx) => {
  const buttons = data.products.map(p => [Markup.button.callback(p.name, 'produto_' + p.name)]);
  buttons.push([Markup.button.callback('↩️ Voltar', 'voltar')]);
  ctx.editMessageText(`🎟️ Logins Premium | Acesso Exclusivo\n🏦 Carteira\n💸 Saldo Atual: R$${data.users[ctx.from.id]?.balance.toFixed(2) || 0}`, Markup.inlineKeyboard(buttons).extra({ parse_mode: 'Markdown' }));
});
lojaBot.action(/^produto_/, (ctx) => {
  const name = ctx.match[0].slice(8);
  const product = data.products.find(p => p.name === name);
  ctx.editMessageText(
    `⚜️ACESSO: ${name}\n💵 Preço: R$${product.price}\n💼 Saldo Atual: R$${data.users[ctx.from.id]?.balance.toFixed(2) || 0}\n📥 Estoque Disponível: ${product.stock}\n🗒️ Descrição: ${product.description}\n♻️ Garantia: ${product.duration}`,
    Markup.inlineKeyboard([
      [Markup.button.callback('🛒 Comprar', 'comprar_' + name)],
      [Markup.button.callback('↩️ Voltar', 'voltar')]
    ]).extra({ parse_mode: 'Markdown' })
  );
  ctx.session.productName = name;
});
lojaBot.action(/^comprar_/, (ctx) => ctx.scene.enter('comprar'));
lojaBot.action('perfil', (ctx) => ctx.scene.enter('perfil'));
lojaBot.action('recarga', (ctx) => ctx.scene.enter('recarga'));
lojaBot.action('ranking', (ctx) => ctx.scene.enter('ranking'));
lojaBot.action('suporte', (ctx) => ctx.reply(`Entre em contato: ${data.configs.supportLink}`));
lojaBot.action('info', (ctx) => ctx.editMessageText(
  `ℹ️ SOFTWARE INFO:\n🤖BOT: @LojaBot\n🤖VERSION: 1.0\n\n🛠️ DEVELOPER INFO:\nO Desenvolvedor não possui responsabilidade...`,
  Markup.inlineKeyboard([[Markup.button.callback('↩️ Voltar', 'voltar')]]).extra({ parse_mode: 'Markdown' })
));
lojaBot.action('pesquisar', (ctx) => {
  ctx.reply(`Qual o nome do serviço? Ex: @LojaBot PROCURAR NETFLIX`, Markup.forceReply().extra());
});
lojaBot.on('text', (ctx) => {
  if (ctx.message.text.includes('PROCURAR')) {
    const query = ctx.message.text.split('PROCURAR')[1]?.trim();
    const results = data.products.filter(p => p.name.toLowerCase().includes(query.toLowerCase()))
      .map(p => `${p.name} R$${p.price}\nDescrição: ${p.description.slice(0, 50)}...`);
    ctx.reply(results.join('\n') || 'Nenhum resultado encontrado.');
  }
});

// Comandos Loja
lojaBot.command('pix', (ctx) => {
  const amount = parseFloat(ctx.message.text.split(' ')[1]);
  if (isNaN(amount)) return ctx.reply('Formato incorreto. Ex: /pix 10');
  ctx.reply(`Gerando pagamento...\n💰 Comprar Saldo com Pix Manual:\n⏱️ Expira em: ${data.pixConfig.expiration}\n💵 Valor: R$${amount}\n✨ ID da Recarga: ${Date.now()}\n\n🗞️ Atenção: Envie o comprovante para ${data.configs.supportLink}\n⏰ Aguardando Pagamento`);
});
lojaBot.command('historico', (ctx) => {
  const user = data.users[ctx.from.id];
  const txt = `HISTORICO DETALHADO\n@LojaBot\n_______________________\n\nCOMPRAS: ${user.purchases.map(p => `${p.name} - R$${p.price} - ${p.date.toISOString()}`).join('\n')}\n_______________________\n\nPAGAMENTOS: ${data.transactions.filter(t => t.userId === ctx.from.id && t.type === 'recarga').map(t => `R$${t.amount} - ${t.date.toISOString()}`).join('\n')}`;
  ctx.replyWithDocument({ source: Buffer.from(txt), filename: 'historico.txt' });
});
lojaBot.command('afiliados', (ctx) => {
  const user = data.users[ctx.from.id] || { affiliates: [], points: 0, username: ctx.from.username || 'Anonimo' };
  const link = `t.me/LojaBot?start=ref_${ctx.from.id}`;
  ctx.reply(`ℹ️ Status: ${data.affiliateConfig.enabled ? '🟢 On' : '🔴 Off'}\n📊 Comissão por Indicação: ${data.affiliateConfig.pointsPerRecharge} pontos\n👥 Total de Afiliados: ${user.affiliates.length}\n🔗 Link para Indicar: ${link}\n\nComo Funciona? Copie seu link...`, Markup.inlineKeyboard([
    [Markup.button.callback('Converter Pontos', 'converter_pontos')]
  ]).extra({ parse_mode: 'Markdown' }));
});
lojaBot.action('converter_pontos', (ctx) => {
  const user = data.users[ctx.from.id];
  if (user.points < data.affiliateConfig.minPointsToConvert) return ctx.reply(`Você precisa de ${data.affiliateConfig.minPointsToConvert} pontos!`);
  const saldo = user.points * data.affiliateConfig.multiplier;
  user.balance += saldo;
  user.points = 0;
  ctx.reply(`Pontos convertidos! Saldo adicionado: R$${saldo.toFixed(2)} ✅`);
});
lojaBot.command('id', (ctx) => ctx.reply(`🆔 Seu id é: ${ctx.from.id}`));
lojaBot.command('ranking', (ctx) => ctx.scene.enter('ranking'));
lojaBot.command('alertas', (ctx) => {
  const buttons = data.products.map(p => [Markup.button.callback(`${p.name} ${p.alerts ? '✅' : ''}`, 'toggle_alert_' + p.name)]);
  ctx.reply('Ative/desative notificações:', Markup.inlineKeyboard(buttons).extra());
});
lojaBot.action(/^toggle_alert_/, (ctx) => {
  const name = ctx.match[0].slice(12);
  const product = data.products.find(p => p.name === name);
  product.alerts = !product.alerts;
  ctx.editMessageText(`${name} notificações ${product.alerts ? 'ativadas' : 'desativadas'}! ✅`);
});

// Voltar
lojaStage.action('voltar', (ctx) => ctx.replyWithPhoto('https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSltpwF6kTey6ImHK0Z76OBq2AmdNgMsS7irFzm7Xv4Ji9whMxq-eD6PO2Y&s=10', {
  caption: `🥇Descubra como nosso bot pode transformar sua experiência de compras! ...\n\n👥Grupo De Clientes: Não definido\n👨‍💻 Link De Suporte: ${data.configs.supportLink}\n\nℹ️Seus Dados:\n🆔ID: ${ctx.from.id}\n💸Saldo Atual: R$${data.users[ctx.from.id]?.balance.toFixed(2) || 0}\n🪪Usuário: @${ctx.from.username || 'N/A'}`,
  parse_mode: 'Markdown',
  reply_markup: Markup.inlineKeyboard([
    [Markup.button.callback('💎 Logins | Contas Premium', 'logins')],
    [Markup.button.callback('🪪 PERFIL', 'perfil'), Markup.button.callback('💰 RECARGA', 'recarga')],
    [Markup.button.callback('🎖️ Ranking', 'ranking')],
    [Markup.button.callback('👩‍💻 Suporte', 'suporte'), Markup.button.callback('ℹ️ Informações', 'info')],
    [Markup.button.callback('🔎 Pesquisar Serviços', 'pesquisar')]
  ]).extra()
}));

lojaStage.register(recargaScene, comprarScene, perfilScene, rankingScene);
lojaBot.use(lojaStage.middleware());

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
