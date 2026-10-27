// =========================================================================
// SCRIPT 5 - NOVO MOTOR DE GERAÇÃO DE PDF VIA IMPRESSÃO HTML NATIVA
// - Desconverte miniaturas para imagens originais em tamanho real e nítido
// - Cada endereço de pasta sai em sua própria linha (bloco) em verde itálico
// - Links de sites mantêm a palavra "LINK" em azul discreto e clicável
// - Veículo Principal: Títulos de capítulos grifados em VERDE (#d4ffd6)
// - Veículos Aplicáveis: Títulos de capítulos grifados em AMARELO (#fae743)
//   e com todos os formulários/campos completos idênticos ao script4.js
// =========================================================================

function gerarPDFHtmlPrint(options = null) {
	const erros = validarFormularioGlobal();
	if (erros.length > 0) {
		const lista = document.getElementById('lista-campos-faltando');
		if (lista) {
			lista.innerHTML = '';
			erros.forEach(erro => {
				const li = document.createElement('li');
				li.textContent = erro;
				lista.appendChild(li);
			});
		}
		const modal = document.getElementById('validation-modal');
		if (modal) modal.style.display = 'flex';
		return;
	}

	const dadosCompletos = coletarDadosFormulario();
	const dataPrincipalOriginal = dadosCompletos.principal;
	const dataAplicaveisOriginal = dadosCompletos.aplicaveis;

	const qtdPartes = dataPrincipalOriginal.qtd_partes || 'uma';
	let sistemasParte2 = [];
	let indicesVeiculosParte1 = [];

	if (options && typeof options === 'object') {
		sistemasParte2 = options.sistemasParte2 || [];
		indicesVeiculosParte1 = options.indicesVeiculosParte1 || [];
	}

	const isSplit = (qtdPartes === 'duas');
	let partsToGenerate = [];

	if (isSplit) {
		const todosSistemas = dataPrincipalOriginal.sistemas || [];
		const sistemasParte1 = todosSistemas.filter(sistema => 
			!sistemasParte2.some(s2 => s2.sistema === sistema.sistema)
		);
		
		const pppParte1 = sistemasParte1.reduce((total, s) => total + parseInt(s.paginasprev || 0, 10), 0);
		const pppParte2 = sistemasParte2.reduce((total, s) => total + parseInt(s.paginasprev || 0, 10), 0);
		
		const veiculosParte1 = dataAplicaveisOriginal.filter((_, idx) => indicesVeiculosParte1.includes(idx));
		const veiculosParte2 = dataAplicaveisOriginal.filter((_, idx) => !indicesVeiculosParte1.includes(idx));
		
		partsToGenerate.push({
			prefixo: "PARTE 1 - ",
			sufixoTitulo: " (PARTE 1)",
			dataPrincipal: {
				...JSON.parse(JSON.stringify(dataPrincipalOriginal)),
				sistemas: JSON.parse(JSON.stringify(sistemasParte1)),
				ppp_calculado: pppParte1
			},
			dataAplicaveis: JSON.parse(JSON.stringify(veiculosParte1)),
			incluirInfoGerais: true,
			dadosFormularioCompleto: dadosCompletos
		});

		partsToGenerate.push({
			prefixo: "PARTE 2 - ",
			sufixoTitulo: " (PARTE 2)",
			dataPrincipal: {
				...JSON.parse(JSON.stringify(dataPrincipalOriginal)),
				sistemas: JSON.parse(JSON.stringify(sistemasParte2)),
				ppp_calculado: pppParte2
			},
			dataAplicaveis: JSON.parse(JSON.stringify(veiculosParte2)),
			incluirInfoGerais: true,
			dadosFormularioCompleto: dadosCompletos
		});
	} else {
		const pppTotal = (dataPrincipalOriginal.sistemas || []).reduce((total, s) => total + parseInt(s.paginasprev || 0, 10), 0);

		partsToGenerate.push({
			prefixo: "",
			sufixoTitulo: "",
			dataPrincipal: {
				...dataPrincipalOriginal,
				ppp_calculado: pppTotal
			},
			dataAplicaveis: dataAplicaveisOriginal,
			incluirInfoGerais: true,
			dadosFormularioCompleto: dadosCompletos
		});
	}

	for (const part of partsToGenerate) {
		abrirJanelaImpressaoHtml(part);
	}
}

// Desconverte o conteúdo rico para a forma impressa oficial:
// - Imagens: usa a imagem original em alta resolução (data-original-image) em tamanho real
// - Pastas: cada endereço sai em sua própria linha (bloco) por extenso em verde itálico
// - Links: preserva a palavra "LINK" em azul discreto e clicável
function desconverterHtmlParaRelatorio(htmlString) {
	if (!htmlString || !htmlString.trim()) {
		return '<p style="font-style: italic; color: #555; margin: 4px 0 8px 12px;">Nenhum conteúdo informado.</p>';
	}

	const tempDiv = document.createElement('div');
	tempDiv.innerHTML = htmlString;

	// 1. Desconverte imagens (troca miniatura de 150px pela imagem original em tamanho real e nítido)
	const images = tempDiv.querySelectorAll('img');
	images.forEach(img => {
		const originalSrc = img.getAttribute('data-original-image');
		if (originalSrc) {
			img.src = originalSrc;
		}
		img.removeAttribute('style');
		img.className = 'relatorio-img';
	});

	const containers = tempDiv.querySelectorAll('.image-container');
	containers.forEach(c => {
		c.removeAttribute('style');
		c.className = 'relatorio-img-container';
	});

	// 2. Processa links e pastas
	const links = tempDiv.querySelectorAll('a');
	links.forEach(a => {
		const href = (a.getAttribute('href') || a.getAttribute('title') || '').trim();
		const isPath = /^[a-zA-Z]:\\|^\\\\/.test(href);
		const isUrl = /(https?:\/\/|www\.)/i.test(href);

		if (isPath) {
			// Cada endereço de pasta sai em sua própria linha (bloco) separada
			const div = document.createElement('div');
			div.className = 'path-text-block';
			div.setAttribute('data-caminho', href);
			div.setAttribute('onclick', 'copiarCaminho(this, event)');
			div.setAttribute('title', 'Clique para copiar o endereço da pasta');
			div.textContent = href; // Caminho real por extenso
			a.replaceWith(div);
		} else if (isUrl) {
			// Mantém o texto como "LINK" em azul itálico e clicável
			const fullUrl = href.startsWith('http') ? href : `http://${href}`;
			a.href = fullUrl;
			a.target = '_blank';
			a.className = 'url-text';
		} else if (a.classList.contains('attachment')) {
			const filename = a.getAttribute('data-filename') || a.textContent.trim() || 'anexo';
			const span = document.createElement('span');
			span.className = 'attachment-text';
			span.textContent = `[Anexo: ${filename}]`;
			a.replaceWith(span);
		}
	});

	return `<div class="rich-content-box">${tempDiv.innerHTML}</div>`;
}

function abrirJanelaImpressaoHtml(partData) {
	const { prefixo, sufixoTitulo, dataPrincipal, dataAplicaveis, incluirInfoGerais, dadosFormularioCompleto } = partData;

	let nomeBase = 'Planejamento';
	if (dataPrincipal.veiculo && dataPrincipal.veiculo.includes('>')) {
		const partes = dataPrincipal.veiculo.split('>');
		if (partes.length >= 5) {
			const ano = partes[1].trim();
			const modelo = partes[3].trim();
			const motor = partes[4].trim();
			nomeBase = `Planejamento - ${ano} ${modelo} ${motor}`;
		}
	} else if (dataPrincipal.veiculo) {
		nomeBase = `Planejamento - ${dataPrincipal.veiculo}`;
	}
	const tituloDocumento = `${prefixo}${nomeBase}${sufixoTitulo}`;

	const getMultiplicadorPrincipal = (dificuldade) => {
		switch (dificuldade) {
			case "Aplicação M": return 0.50;
			case "Fácil": return 0.70;
			case "Médio": return 1.00;
			case "Difícil": return 1.30;
			case "Carroceria Fácil": return 1.05;
			case "Carroceria Médio": return 1.50;
			case "Carroceria Difícil": return 1.75;
			default: return 1.00;
		}
	};

	const getMultiplicadorAplicaveis = (dificuldade) => {
		switch (dificuldade) {
			case "Fácil": return 0.50;
			case "Moderado": return 0.75;
			case "Médio": return 1.00;
			default: return 1.00;
		}
	};

	// Cálculos de PPP e Estimativa do Principal
	const dificuldadeExibir = (prefixo === "PARTE 2 - " && dataPrincipal.dificuldade_parte2) 
		? dataPrincipal.dificuldade_parte2 
		: dataPrincipal.dificuldade;

	let somaTotal = 0, somaTransferidas = 0, somaCriadas = 0, somaModificadas = 0;
	let tempoTotalPrincipal = 0;
	
	if (dataPrincipal.sistemas) {
		dataPrincipal.sistemas.forEach(s => {
			const paginas = parseInt(s.paginasprev, 10) || 0;
			if (s.transferencia === 'modificar') {
				somaModificadas += (paginas || 1);
			} else if (s.transferencia === 'transferencia') {
				somaTransferidas += paginas;
				tempoTotalPrincipal += (paginas * 1.825);
			} else {
				somaCriadas += paginas;
				tempoTotalPrincipal += (paginas * 3.65);
			}
		});
	}
	somaTotal = somaCriadas + somaTransferidas + somaModificadas;
	const multPrinc = getMultiplicadorPrincipal(dificuldadeExibir);
	const estimativaPrincipal = (tempoTotalPrincipal * multPrinc).toFixed(2).replace('.', ',');

	// Cálculos de PPA e Estimativa dos Aplicáveis
	let somaTotalAplicaveis = 0, somaTransferidasAplicaveis = 0, somaCriadasAplicaveis = 0, somaModificadasAplicaveis = 0;
	let tempoTotalAplicaveis = 0;
	if (dataAplicaveis && dataAplicaveis.length > 0) {
		dataAplicaveis.forEach(v => {
			if (v.sistemas && v.sistemas.length > 0) {
				v.sistemas.forEach(s => {
					const paginas = parseInt(s.paginasprev, 10) || 0;
					if (s.transferencia === 'modificar') {
						somaModificadasAplicaveis += (paginas || 1);
					} else if (s.transferencia === 'transferencia' || s.transferencia === 'transferencia_principal' || s.transferencia === 'transferencia_outro') {
						somaTransferidasAplicaveis += paginas;
						tempoTotalAplicaveis += (paginas * 0.5);
					} else {
						somaCriadasAplicaveis += paginas;
						tempoTotalAplicaveis += (paginas * 1.0);
					}
				});
			}
		});
	}
	somaTotalAplicaveis = somaCriadasAplicaveis + somaTransferidasAplicaveis + somaModificadasAplicaveis;
	const multAplic = getMultiplicadorAplicaveis(dataPrincipal.dificuldade_aplicaveis);
	const estimativaAplicaveis = (tempoTotalAplicaveis * multAplic).toFixed(2).replace('.', ',');

	const formatarVeiculoParaIndice = (veiculoTexto) => {
		if (!veiculoTexto || typeof veiculoTexto !== 'string') return 'Veículo Não Especificado';
		if (veiculoTexto.includes('>')) {
			const partes = veiculoTexto.split('>').map(p => p.trim());
			if (partes.length >= 5) {
				const ano = partes[1];
				const modelo = partes[3];
				const motor = partes[4];
				return `${ano} ${modelo} ${motor}`.trim();
			} else if (partes.length >= 3) {
				return partes.slice(1).join(' ').trim();
			}
		}
		return veiculoTexto.trim();
	};

	let htmlIndiceLista = '';

	// 1. TÍTULO VEÍCULO PRINCIPAL (recolhível com capítulos inicialmente minimizados)
	const nomeVeiculoPrincipal = formatarVeiculoParaIndice(dataPrincipal.veiculo);
	const qtdCapsPrincipal = (dataPrincipal.sistemas || []).length;
	htmlIndiceLista += `
		<div class="indice-secao-titulo" onclick="alternarGrupoIndice('principal')" title="Clique para expandir/recolher os capítulos">
			<span>VEÍCULO PRINCIPAL ${qtdCapsPrincipal > 0 ? `(${qtdCapsPrincipal})` : ''}</span>
			<span id="seta-principal" class="indice-seta">▶</span>
		</div>
		<div class="indice-item indice-item-veiculo" onclick="irParaElementoIndice('secao-info-gerais-principal')" title="Ir para Informações Gerais">
			🚗 <span>${nomeVeiculoPrincipal}</span>
		</div>
		<div id="indice-caps-principal" class="indice-caps-container" style="display: none;">
	`;

	if (dataPrincipal.sistemas && dataPrincipal.sistemas.length > 0) {
		dataPrincipal.sistemas.forEach((sistema, idx) => {
			let tituloCapitulo = (sistema.sistema || '').toUpperCase();
			if (tituloCapitulo === 'FUSÍVEIS E RELÉS') {
				const tipo = (sistema.tipo_fusiveis || 'Simplificado').toUpperCase();
				tituloCapitulo = `FUSÍVEIS E RELÉS (${tipo})`;
			} else if (tituloCapitulo === 'OUTRO' && !sistema.sistema) {
				tituloCapitulo = 'OUTRO (NÃO ESPECIFICADO)';
			}
			htmlIndiceLista += `
				<div class="indice-item" onclick="irParaElementoIndice('cap-principal-${idx + 1}')" title="Ir para ${tituloCapitulo}">
					<span class="indice-badge-verde"></span>
					<span>${tituloCapitulo}</span>
				</div>
			`;
		});
	}
	htmlIndiceLista += `</div>`; // fim indice-caps-principal

	// 2. VEÍCULOS APLICÁVEIS (recolhíveis com capítulos inicialmente minimizados)
	if (dataAplicaveis && dataAplicaveis.length > 0) {
		dataAplicaveis.forEach((veiculo, vIndex) => {
			const dadosGerais = veiculo.dadosGerais || {};
			const nomeVeiculoAplicavel = formatarVeiculoParaIndice(dadosGerais.veiculo);
			const qtdCapsAplicavel = (veiculo.sistemas || []).length;
			htmlIndiceLista += `
				<div class="indice-secao-titulo" onclick="alternarGrupoIndice('aplicavel-${vIndex + 1}')" title="Clique para expandir/recolher os capítulos" style="margin-top: 14px;">
					<span>VEÍCULO APLICÁVEL ${vIndex + 1} ${qtdCapsAplicavel > 0 ? `(${qtdCapsAplicavel})` : ''}</span>
					<span id="seta-aplicavel-${vIndex + 1}" class="indice-seta">▶</span>
				</div>
				<div class="indice-item indice-item-veiculo" onclick="irParaElementoIndice('veiculo-aplicavel-${vIndex + 1}')" title="Ir para Veículo Aplicável ${vIndex + 1}">
					🚗 <span>${nomeVeiculoAplicavel}</span>
				</div>
				<div id="indice-caps-aplicavel-${vIndex + 1}" class="indice-caps-container" style="display: none;">
			`;
			if (veiculo.sistemas && veiculo.sistemas.length > 0) {
				veiculo.sistemas.forEach((sistema, idx) => {
					let tituloCapitulo = (sistema.sistema || '').toUpperCase();
					if (tituloCapitulo === 'FUSÍVEIS E RELÉS') {
						const tipo = (sistema.tipo_fusiveis || 'Simplificado').toUpperCase();
						tituloCapitulo = `FUSÍVEIS E RELÉS (${tipo})`;
					} else if (tituloCapitulo === 'OUTRO' && !sistema.sistema) {
						tituloCapitulo = 'OUTRO (NÃO ESPECIFICADO)';
					}
					htmlIndiceLista += `
						<div class="indice-item" onclick="irParaElementoIndice('cap-aplicavel-${vIndex + 1}-${idx + 1}')" title="Ir para ${tituloCapitulo}">
							<span class="indice-badge-amarelo"></span>
							<span>${tituloCapitulo}</span>
						</div>
					`;
				});
			}
			htmlIndiceLista += `</div>`; // fim indice-caps-aplicavel
		});
	}

	// 3. DADOS DO CARD
	htmlIndiceLista += `
		<div class="indice-secao-titulo" style="margin-top: 14px; cursor: default;">
			<span>RESUMO FINAL</span>
		</div>
		<div class="indice-item" onclick="irParaElementoIndice('secao-dados-card')" title="Ir para Dados do Card" style="font-weight: bold; color: #1e293b;">
			📊 <span>DADOS DO CARD</span>
		</div>
	`;

	let html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
	<meta charset="UTF-8">
	<title>${tituloDocumento}</title>
	<style>
		@page {
			size: A4;
			margin: 12mm 15mm 15mm 15mm;
		}
		* {
			box-sizing: border-box;
		}
		body {
			font-family: Arial, Helvetica, sans-serif;
			font-size: 11pt;
			color: #111;
			background-color: #f1f5f9;
			margin: 0;
			padding: 0;
			line-height: 1.45;
			-webkit-print-color-adjust: exact !important;
			print-color-adjust: exact !important;
		}
		/* BARRA DE FERRAMENTAS SUPERIOR (ESTILO DO PRINT: FUNDO ESCURO, BOTÕES COLORIDOS) */
		.toolbar-print {
			position: sticky;
			top: 0;
			background: #1e293b;
			color: #ffffff;
			padding: 10px 24px;
			display: grid;
			grid-template-columns: 1fr auto 1fr;
			align-items: center;
			z-index: 9999;
			box-shadow: 0 2px 10px rgba(0, 0, 0, 0.25);
			font-family: Arial, sans-serif;
		}
		.toolbar-print-left {
			display: flex;
			align-items: center;
			justify-content: flex-start;
		}
		.toolbar-print-center {
			text-align: center;
			font-weight: bold;
			font-size: 15px;
			letter-spacing: 0.5px;
			color: #ffffff;
			white-space: nowrap;
		}
		.toolbar-print-right {
			display: flex;
			justify-content: flex-end;
			align-items: center;
			gap: 12px;
		}
		.toolbar-print button {
			border: none;
			padding: 8px 18px;
			font-size: 13px;
			font-weight: bold;
			border-radius: 5px;
			cursor: pointer;
			display: inline-flex;
			align-items: center;
			gap: 6px;
			transition: background 0.2s, transform 0.1s, box-shadow 0.15s;
		}
		.toolbar-print button:active {
			transform: scale(0.98);
		}
		.btn-html {
			background: #10b981 !important;
			color: #ffffff !important;
		}
		.btn-html:hover {
			background: #059669 !important;
		}
		.btn-print {
			background: #3b82f6 !important;
			color: #ffffff !important;
		}
		.btn-print:hover {
			background: #2563eb !important;
		}
		.badge-comentarios-top {
			background: #334155;
			color: #fef08a;
			padding: 5px 12px;
			border-radius: 12px;
			font-size: 12px;
			font-weight: bold;
			display: inline-flex;
			align-items: center;
			gap: 6px;
			cursor: pointer;
			transition: background 0.15s;
		}
		.badge-comentarios-top:hover {
			background: #475569;
		}

		/* MODO PREVIEW NA JANELA DO SISTEMA: Totalmente limpo e com espaçamento lateral elegante */
		body.modo-preview {
			background-color: #f1f5f9;
		}
		body.modo-preview .workspace-wrapper {
			min-width: 0 !important;
			padding: 25px 0 !important;
			display: flex !important;
			justify-content: center !important;
		}
		body.modo-preview .document-container {
			max-width: 210mm !important;
			width: 210mm !important;
			min-width: 0 !important;
			margin: 0 auto !important;
			padding: 35px 45px !important; /* Espaçamento interno lateral preservado */
			box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08) !important;
			border-radius: 6px !important;
		}
		body.modo-preview #btn-comentario-flutuante,
		body.modo-preview .painel-acrobat,
		body.modo-preview #btn-abrir-painel-acrobat,
		body.modo-preview .painel-indice,
		body.modo-preview #btn-abrir-painel-indice,
		body.modo-preview .comment-box-aside,
		body.modo-preview #camada-comentarios,
		body.modo-preview #badge-contador-comentarios {
			display: none !important;
		}
		body.modo-preview .commentable-row:hover,
		body.modo-preview .commentable-row.has-comment {
			background-color: transparent !important;
		}

		/* DOCUMENT CONTAINER NO MODO SALVO: FOCADO À ESQUERDA COM ESPAÇAMENTO LATERAL INTERNO */
		.workspace-wrapper {
			display: flex;
			justify-content: flex-start; /* Focado à esquerda no navegador para não sobrepor comentários */
			padding: 25px 25px 80px 45px;
			box-sizing: border-box;
			min-width: 1250px;
			position: relative;
		}
		.document-container {
			width: 210mm;
			min-width: 210mm;
			max-width: 210mm;
			background: #ffffff;
			padding: 35px 45px; /* ESPAÇAMENTO LATERAL INTERNO IDÊNTICO AO PREVIEW: 45px */
			border-radius: 6px;
			box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
			position: relative;
			box-sizing: border-box;
			margin: 0;
		}

		/* ELEMENTOS COMENTÁVEIS NA LINHA */
		.commentable-row {
			position: relative;
			border-radius: 4px;
			transition: background-color 0.15s;
		}
		.commentable-row:hover {
			background-color: rgba(254, 240, 138, 0.18);
		}
		.commentable-row.has-comment {
			background-color: rgba(254, 240, 138, 0.3);
		}
		.commentable-row.focused-target {
			background-color: rgba(254, 240, 138, 0.5) !important;
			outline: 2px dashed #f59e0b;
			outline-offset: 2px;
		}

		/* BOTÃO DINÂMICO FLUTUANTE SEGUINDO O MOUSE PELO LADO DE FORA DA PÁGINA */
		#btn-comentario-flutuante {
			position: absolute;
			left: calc(100% + 10px); /* Encostado no lado de FORA da página */
			top: 50px;
			width: 36px;
			height: 36px;
			background: #ffffff;
			border: 2px solid #2563eb;
			color: #2563eb;
			border-radius: 50%;
			box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35);
			font-size: 17px;
			display: flex;
			align-items: center;
			justify-content: center;
			cursor: pointer;
			z-index: 500;
			opacity: 0;
			pointer-events: none;
			transition: opacity 0.2s ease, transform 0.12s ease, background-color 0.15s;
			padding: 0;
		}
		#btn-comentario-flutuante:hover {
			transform: scale(1.18);
			background: #eff6ff;
			box-shadow: 0 6px 18px rgba(37, 99, 235, 0.45);
		}
		#btn-comentario-flutuante.ativo {
			opacity: 1;
			pointer-events: auto;
		}

		/* CARD DO COMENTÁRIO FIXO NA LATERAL DIREITA, ALINHADO À LINHA */
		.comment-box-aside {
			position: absolute;
			left: calc(100% + 56px); /* Após o botão flutuante */
			width: 290px;
			background: #ffffff;
			border: 1px solid #cbd5e1;
			border-left: 4px solid #f59e0b; /* Amarelo: pendente */
			box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
			border-radius: 6px;
			padding: 10px 12px;
			z-index: 600;
			font-size: 9.5pt;
			line-height: 1.4;
			color: #1e293b;
			text-align: left;
			box-sizing: border-box;
			transition: box-shadow 0.2s, border-color 0.2s, z-index 0.1s;
		}
		.comment-box-aside:hover, .comment-box-aside.focused-card {
			z-index: 650;
			box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
		}
		.comment-box-aside::before {
			content: "";
			position: absolute;
			left: -8px;
			top: 12px;
			width: 0;
			height: 0;
			border-top: 6px solid transparent;
			border-bottom: 6px solid transparent;
			border-right: 8px solid #f59e0b;
		}
		.comment-box-aside.status-resolvido {
			border-left-color: #10b981;
			background: #f8fafc;
			opacity: 0.92;
		}
		.comment-box-aside.status-resolvido::before {
			border-right-color: #10b981;
		}

		/* Status badge dentro do comentário */
		.btn-status-toggle {
			border: none;
			padding: 2px 7px;
			border-radius: 10px;
			font-size: 8pt;
			font-weight: bold;
			cursor: pointer;
			transition: background 0.15s;
		}
		.btn-status-toggle.pendente {
			background: #fef3c7;
			color: #92400e;
		}
		.btn-status-toggle.pendente:hover {
			background: #fde68a;
		}
		.btn-status-toggle.resolvido {
			background: #dcfce7;
			color: #166534;
		}
		.btn-status-toggle.resolvido:hover {
			background: #bbf7d0;
		}

		/* PAINEL DE COMENTÁRIOS ESTILO ACROBAT NA DIREITA */
		.painel-acrobat {
			position: fixed;
			right: 0;
			top: 52px;
			bottom: 0;
			width: 310px;
			background: #ffffff;
			border-left: 1px solid #cbd5e1;
			box-shadow: -3px 0 16px rgba(0, 0, 0, 0.08);
			display: flex;
			flex-direction: column;
			z-index: 8000;
			font-family: Arial, sans-serif;
			transition: transform 0.25s ease;
		}
		.painel-acrobat.recolhido {
			transform: translateX(100%);
		}
		.painel-acrobat-header {
			padding: 12px 16px;
			background: #f8fafc;
			border-bottom: 1px solid #e2e8f0;
			display: flex;
			justify-content: space-between;
			align-items: center;
		}
		.painel-acrobat-titulo {
			font-weight: bold;
			font-size: 11pt;
			color: #0f172a;
			display: flex;
			align-items: center;
			gap: 8px;
		}
		.painel-acrobat-toggle-btn {
			background: none;
			border: none;
			cursor: pointer;
			font-size: 16px;
			color: #64748b;
			padding: 2px 6px;
			border-radius: 4px;
		}
		.painel-acrobat-toggle-btn:hover {
			background: #e2e8f0;
			color: #0f172a;
		}
		.painel-acrobat-lista {
			flex: 1;
			overflow-y: auto;
			padding: 10px;
		}
		.painel-acrobat-item {
			background: #ffffff;
			border: 1px solid #e2e8f0;
			border-left: 4px solid #f59e0b;
			border-radius: 6px;
			padding: 9px 12px;
			margin-bottom: 10px;
			cursor: pointer;
			transition: box-shadow 0.15s, border-color 0.15s, background-color 0.15s;
		}
		.painel-acrobat-item:hover {
			box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
			background-color: #fafbfc;
		}
		.painel-acrobat-item.resolvido {
			border-left-color: #10b981;
			background-color: #fcfdfc;
		}
		.painel-acrobat-item-header {
			display: flex;
			justify-content: space-between;
			align-items: center;
			margin-bottom: 4px;
		}
		.painel-acrobat-item-autor {
			font-weight: bold;
			font-size: 9pt;
			color: #1e293b;
		}
		.painel-acrobat-item-data {
			font-size: 7.5pt;
			color: #64748b;
		}
		.painel-acrobat-item-secao {
			font-size: 8pt;
			font-weight: bold;
			color: #2563eb;
			margin-bottom: 4px;
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
		}
		.painel-acrobat-item-texto {
			font-size: 8.5pt;
			color: #334155;
			display: -webkit-box;
			-webkit-line-clamp: 3;
			-webkit-box-orient: vertical;
			overflow: hidden;
			line-height: 1.35;
		}
		/* Botão na borda direita para reabrir painel quando recolhido */
		#btn-abrir-painel-acrobat {
			position: fixed;
			right: 0;
			top: 65px;
			background: #2563eb;
			color: #ffffff;
			border: none;
			padding: 8px 12px 8px 10px;
			border-radius: 8px 0 0 8px;
			box-shadow: -2px 2px 10px rgba(0, 0, 0, 0.15);
			font-size: 11pt;
			font-weight: bold;
			cursor: pointer;
			z-index: 7999;
			display: flex;
			align-items: center;
			gap: 6px;
			transition: background 0.15s;
		}
		#btn-abrir-painel-acrobat:hover {
			background: #1d4ed8;
		}

		/* FILTROS DO PAINEL DE ANOTAÇÕES */
		.painel-acrobat-filtros {
			padding: 8px 12px;
			background: #f8fafc;
			border-bottom: 1px solid #e2e8f0;
			display: flex;
			flex-direction: column;
			gap: 6px;
		}

		/* PAINEL LATERAL DE ÍNDICE NA ESQUERDA */
		.painel-indice {
			position: fixed;
			left: 0;
			top: 52px;
			bottom: 0;
			width: 290px;
			background: #ffffff;
			border-right: 1px solid #cbd5e1;
			box-shadow: 3px 0 16px rgba(0, 0, 0, 0.08);
			display: flex;
			flex-direction: column;
			z-index: 8000;
			font-family: Arial, sans-serif;
			font-size: 9pt;
			transition: transform 0.25s ease;
		}
		.painel-indice.recolhido {
			transform: translateX(-100%);
		}
		.painel-indice-header {
			padding: 12px 14px;
			background: #f8fafc;
			border-bottom: 1px solid #e2e8f0;
			display: flex;
			justify-content: space-between;
			align-items: center;
		}
		.painel-indice-titulo {
			font-weight: bold;
			font-size: 10pt;
			color: #0f172a;
			display: flex;
			align-items: center;
			gap: 6px;
		}
		.painel-indice-lista {
			flex: 1;
			overflow-y: auto;
			padding: 12px 10px;
		}
		.indice-secao-titulo {
			font-size: 8pt;
			font-weight: 800;
			text-transform: uppercase;
			letter-spacing: 0.5px;
			padding: 7px 8px 4px 8px;
			margin-top: 10px;
			color: #334155;
			border-bottom: 1px solid #e2e8f0;
			user-select: none;
			cursor: pointer;
			display: flex;
			justify-content: space-between;
			align-items: center;
			transition: background 0.15s, color 0.15s;
			border-radius: 4px;
		}
		.indice-secao-titulo:hover {
			background: #f1f5f9;
			color: #0f172a;
		}
		.indice-seta {
			font-size: 7.5pt;
			color: #64748b;
		}
		.btn-indice-expandir {
			background: #ffffff;
			border: 1px solid #cbd5e1;
			border-radius: 4px;
			cursor: pointer;
			font-size: 7.5pt;
			font-weight: bold;
			padding: 2px 6px;
			color: #475569;
			transition: background 0.15s, color 0.15s;
		}
		.btn-indice-expandir:hover {
			background: #e2e8f0;
			color: #0f172a;
		}
		.indice-caps-container {
			padding-left: 6px;
			border-left: 2px solid #e2e8f0;
			margin-left: 6px;
			margin-bottom: 6px;
		}
		.indice-item {
			padding: 6px 10px;
			border-radius: 4px;
			margin: 2px 0;
			cursor: pointer;
			color: #334155;
			display: flex;
			align-items: center;
			gap: 6px;
			transition: background 0.15s, color 0.15s;
			font-size: 9pt;
			line-height: 1.35;
		}
		.indice-item:hover {
			background: #eff6ff;
			color: #1d4ed8;
		}
		.indice-item-veiculo {
			font-weight: bold;
			color: #1e293b;
			background: #f1f5f9;
			margin-bottom: 5px;
			border-left: 3px solid #2563eb;
		}
		.indice-item-veiculo:hover {
			background: #e2e8f0;
		}
		.indice-badge-verde {
			width: 8px;
			height: 8px;
			border-radius: 50%;
			background: #22c55e;
			flex-shrink: 0;
		}
		.indice-badge-amarelo {
			width: 8px;
			height: 8px;
			border-radius: 50%;
			background: #eab308;
			flex-shrink: 0;
		}
		/* Botão na borda esquerda para reabrir índice quando recolhido */
		#btn-abrir-painel-indice {
			position: fixed;
			left: 0;
			top: 65px;
			background: #334155;
			color: #ffffff;
			border: none;
			padding: 8px 10px 8px 12px;
			border-radius: 0 8px 8px 0;
			box-shadow: 2px 2px 10px rgba(0, 0, 0, 0.15);
			font-size: 10pt;
			font-weight: bold;
			cursor: pointer;
			z-index: 7999;
			display: flex;
			align-items: center;
			gap: 6px;
			transition: background 0.15s;
		}
		#btn-abrir-painel-indice:hover {
			background: #1e293b;
		}
		@keyframes pulseHighlight {
			0% { background-color: #fef08a; }
			50% { background-color: #fde047; }
			100% { background-color: transparent; }
		}
		.pulse-target {
			animation: pulseHighlight 2.5s ease;
		}
		.doc-title {
			text-align: center;
			font-size: 18pt;
			font-weight: bold;
			margin: 10px 0 4px 0;
			color: #000;
		}
		.clickup-link {
			text-align: center;
			font-size: 11pt;
			font-style: italic;
			color: #4472c4;
			margin-bottom: 15px;
		}
		.section-header {
			font-size: 15pt;
			font-weight: bold;
			color: #4472c4;
			text-align: center;
			margin: 28px 0 14px 0;
		}
		.sub-header {
			font-size: 12pt;
			font-weight: bold;
			color: #222;
			margin: 12px 0 4px 0;
		}
		.info-row {
			margin: 4px 0;
		}
		.info-label {
			font-weight: bold;
			display: inline-block;
			min-width: 140px;
		}
		.info-val {
			font-weight: normal;
		}
		/* DESTAQUE VERDE: Veículo Principal (#d4ffd6 / rgb(212, 255, 214)) */
		.highlight-tag {
			background-color: #d4ffd6 !important;
			color: #000;
			font-weight: bold;
			font-size: 12pt;
			padding: 3px 8px;
			border-radius: 4px;
			display: inline-block;
			margin: 10px 0 6px 0;
		}
		/* DESTAQUE AMARELO: Veículos Aplicáveis (#fae743 / rgb(250, 231, 67)) */
		.highlight-tag-yellow {
			background-color: #fae743 !important;
			color: #000;
			font-weight: bold;
			font-size: 12pt;
			padding: 3px 8px;
			border-radius: 4px;
			display: inline-block;
			margin: 10px 0 6px 0;
		}
		/* CAMINHOS DE PASTA: cada endereço em sua própria linha (bloco) com recuo organizado */
		.path-text-block {
			color: #008000 !important;
			font-style: italic !important;
			font-weight: normal;
			word-break: break-all;
			overflow-wrap: anywhere;
			display: block;
			margin: 4px 0 4px 12px;
			line-height: 1.4;
			cursor: pointer;
			border-radius: 4px;
			padding: 2px 4px;
			transition: background-color 0.15s;
		}
		.path-text-block:hover {
			background-color: #eafbee;
			text-decoration: underline;
		}
		.path-text {
			color: #008000 !important;
			font-style: italic !important;
			font-weight: normal;
			word-break: break-all;
			overflow-wrap: anywhere;
			display: block;
			margin: 4px 0 4px 12px;
			line-height: 1.4;
			cursor: pointer;
			border-radius: 4px;
			padding: 2px 4px;
			transition: background-color 0.15s;
		}
		.path-text:hover {
			background-color: #eafbee;
			text-decoration: underline;
		}
		/* LINKS WEB: palavra "LINK" em azul itálico sublinhado */
		.url-text {
			color: #0000ff !important;
			font-style: italic !important;
			text-decoration: underline;
			display: inline;
		}
		.attachment-text {
			color: #666;
			font-style: italic;
			display: inline-block;
			margin: 4px 0;
		}
		.rich-content-box {
			margin-left: 12px;
			margin-top: 2px;
			margin-bottom: 8px;
			line-height: 1.5;
		}
		/* IMAGENS: exibidas grandes em tamanho real/nítido */
		.relatorio-img {
			max-width: 100%;
			max-height: 520px;
			height: auto;
			display: block;
			margin: 10px 0;
			border: 1px solid #ccc;
			border-radius: 4px;
			box-shadow: 0 2px 6px rgba(0,0,0,0.08);
			object-fit: contain;
		}
		.relatorio-img-container {
			display: block;
			margin: 8px 0;
		}
		.separator {
			border: 0;
			border-top: 1px solid #808080;
			margin: 30px 0;
		}
		.indice-rapido {
			background: #fdfdfd;
			border: 1px solid #e2e8f0;
			padding: 10px 14px;
			border-radius: 6px;
			margin-bottom: 15px;
		}
		.indice-rapido a {
			color: #0000ff;
			text-decoration: underline;
			font-size: 10pt;
			display: block;
			margin: 3px 0;
		}
		.card-data-table {
			width: 100%;
			border-collapse: collapse;
			margin-top: 8px;
		}
		.card-data-table td {
			padding: 4px 6px;
			vertical-align: top;
		}
		.avoid-break {
			page-break-inside: avoid;
		}
		@media print {
			.no-print {
				display: none !important;
			}
			body {
				background-color: #fff !important;
			}
			.workspace-wrapper {
				padding: 0 !important;
				min-width: 0 !important;
				display: block !important;
			}
			.document-container {
				width: 100% !important;
				min-width: 0 !important;
				max-width: 100% !important;
				padding: 0 !important;
				box-shadow: none !important;
				border-radius: 0 !important;
				margin: 0 !important;
			}
			.commentable-row {
				background-color: transparent !important;
				outline: none !important;
			}
			.comment-box-aside, .btn-comment-trigger, #btn-comentario-flutuante, .painel-acrobat, #btn-abrir-painel-acrobat, .painel-indice, #btn-abrir-painel-indice {
				display: none !important;
			}
		}
	</style>
</head>
<body class="modo-preview">
	<div class="toolbar-print no-print">
		<div class="toolbar-print-left">
			<span id="badge-contador-comentarios" class="badge-comentarios-top" onclick="alternarPainelAcrobat()" title="Clique para abrir/fechar o índice de anotações">💬 0 anotações</span>
		</div>
		<div class="toolbar-print-center" id="titulo-barra-relatorio">
			PLANEJAMENTO (com Comentador)
		</div>
		<div class="toolbar-print-right">
			<button class="btn-html" onclick="salvarComoHTMLEJson()" title="Salva este relatório como arquivo HTML e faz o download automático do JSON do formulário">💾 Salvar HTML+JSON</button>
			<button class="btn-print" onclick="salvarPDFEJson()" title="Abre a janela de impressão em PDF e faz o download automático do JSON do formulário">🖨️ Salvar PDF+JSON</button>
		</div>
	</div>

	<div class="workspace-wrapper">
		<div class="document-container" id="document-container">
			<button id="btn-comentario-flutuante" class="no-print" type="button" title="Clique para adicionar comentário nesta altura">💬</button>
			<div id="camada-comentarios" class="no-print"></div>
`;

	// 1. ÍNDICE RÁPIDO PARA APLICÁVEIS
	if (dataAplicaveis && dataAplicaveis.length > 0) {
		html += `
		<div class="indice-rapido avoid-break">
			<div style="font-weight: bold; font-size: 11pt; margin-bottom: 6px;">ÍNDICE RÁPIDO (P/ APLICÁVEIS):</div>
		`;
		dataAplicaveis.forEach((veiculo, index) => {
			const refText = veiculo.dadosGerais.veiculo || 'Sem referência';
			html += `<a href="#veiculo-aplicavel-${index + 1}">Veículo Aplicável #${index + 1} - ${refText}</a>`;
		});
		html += `</div><hr class="separator" style="margin-top: 25px; margin-bottom: 30px;">`;
	}

	// 2. TÍTULO PRINCIPAL
	html += `
		<div class="doc-title" style="margin-top: 15px;">PLANEJAMENTO - VEÍCULO PRINCIPAL${sufixoTitulo}</div>
		${dataPrincipal.clickup ? `<div class="clickup-link">${dataPrincipal.clickup}</div>` : ''}
	`;

	// 3. INFORMAÇÕES GERAIS (VEÍCULO PRINCIPAL)
	if (incluirInfoGerais) {
		html += `
		<div id="secao-info-gerais-principal" class="section-header">INFORMAÇÕES GERAIS</div>
		<div class="info-row"><span class="info-label">PLANEJADO POR:</span> <span class="info-val">${dataPrincipal.planejado_por || 'N/A'}</span></div>
		<div class="sub-header">- VEÍCULO REFERÊNCIA:</div>
		<div style="font-style: italic; font-size: 10pt; margin-left: 12px; margin-bottom: 6px;">${dataPrincipal.veiculo || 'N/A'}</div>
		<div class="info-row"><span class="info-label">ID DIAGRAMAS:</span> <span class="info-val">${dataPrincipal.iddiagramas || 'N/A'}</span></div>
		<div class="info-row"><span class="info-label">ID FUSÍVEIS:</span> <span class="info-val">${dataPrincipal.idfusiveis || 'N/A'}</span></div>

		<div class="sub-header" style="margin-top: 10px;">- PASTA DO VEÍCULO:</div>
		<div class="path-text" data-caminho="${dataPrincipal.pasta || ''}" onclick="copiarCaminho(this, event)" title="Clique para copiar o endereço da pasta">${dataPrincipal.pasta || 'N/A'}</div>

		<div class="sub-header">- IMPORTANTE PARA O DESENVOLVIMENTO:</div>
		${desconverterHtmlParaRelatorio(dataPrincipal.comentarios)}

		<div class="info-row" style="margin-top: 10px;"><span class="info-label">ASSOCIAÇÃO / CHASSI:</span> <span class="info-val">${dataPrincipal.aplicacao_chassi === 'mesma' ? 'Mesma associação' : (dataPrincipal.aplicacao_chassi === 'ajustar' ? 'Ajustar/Criar associação' : 'N/A')}</span></div>
		${dataPrincipal.aplicacao_chassi_texto ? `<div class="chassi-texto-bloco" style="margin-left: 12px; margin-bottom: 8px; white-space: pre-wrap; word-break: break-word; font-family: inherit; line-height: 1.45;">${dataPrincipal.aplicacao_chassi_texto}</div>` : ''}

		<div class="sub-header">- PEDIDOS DE ILUSTRAÇÃO / TRATAMENTO DE IMAGEM:</div>
		${desconverterHtmlParaRelatorio(dataPrincipal.ilustracao_texto || 'Nenhum pedido.')}

		<div class="info-row" style="margin-top: 10px;"><span class="info-label">PESQUISA:</span> <span class="info-val">${dataPrincipal.pesquisa === 'sim' ? 'Sim' : 'Não'}</span></div>
		${dataPrincipal.pesquisa === 'sim' && dataPrincipal.pesquisa_texto ? desconverterHtmlParaRelatorio(dataPrincipal.pesquisa_texto) : ''}
		`;
	}

	// 4. SISTEMAS (CAPÍTULOS) DO VEÍCULO PRINCIPAL (GRIFADO EM VERDE #d4ffd6)
	html += `<div class="section-header" style="margin-top: 25px;">SISTEMAS</div>`;

	if (dataPrincipal.sistemas && dataPrincipal.sistemas.length > 0) {
		dataPrincipal.sistemas.forEach((sistema, idx) => {
			let tituloCapitulo = (sistema.sistema || '').toUpperCase();
			if (tituloCapitulo === 'FUSÍVEIS E RELÉS') {
				const tipo = (sistema.tipo_fusiveis || 'Simplificado').toUpperCase();
				tituloCapitulo = `FUSÍVEIS E RELÉS (${tipo})`;
			} else if (tituloCapitulo === 'OUTRO' && !sistema.sistema) {
				tituloCapitulo = 'OUTRO (NÃO ESPECIFICADO)';
			}

			let linhaTransferencia = '';
			if (sistema.transferencia === 'transferencia') linhaTransferencia = `- Transferência - ID: ${sistema.idtransf || ''}`;
			else if (sistema.transferencia === 'zero') linhaTransferencia = `- Fazer do Zero`;
			else if (sistema.transferencia === 'modificar') linhaTransferencia = `- Modificar Publicado`;

			const sysUpper = (sistema.sistema || '').toUpperCase();
			const isCaixasForm = sysUpper === "FUSÍVEIS E RELÉS";
			const isPaginasFixas = [
				"ALIMENTAÇÃO POSITIVA", "CONECTORES DE PEITO", "CARGA E PARTIDA", 
				"SISTEMA DE CARGA E PARTIDA", "CAIXA DE FUSÍVEIS DO INTERIOR", 
				"CAIXA DE FUSÍVEIS DO MOTOR", "CAIXA DE FUSÍVEIS DO PORTA-MALAS", 
				"CAIXA DE FUSÍVEIS DA BATERIA"
			].includes(sysUpper);
			const isModuloDedicado = String(sistema.modulo_dedicado).toLowerCase() === 'sim';

			html += `
			<div class="avoid-break" style="margin-top: 15px;">
				<div id="cap-principal-${idx + 1}" class="highlight-tag">${tituloCapitulo}</div>
				${linhaTransferencia ? `<div style="font-weight: bold; margin: 3px 0;">${linhaTransferencia}</div>` : ''}
				<div class="info-row"><span class="info-label">Nº páginas prevista:</span> <span class="info-val">${sistema.transferencia === 'modificar' ? '0' : (sistema.paginasprev || '')}</span></div>
				${(!isCaixasForm && !isPaginasFixas) ? `<div class="info-row"><span class="info-label">Módulo Dedicado:</span> <span class="info-val">${isModuloDedicado ? 'Sim' : 'Não'}</span></div>` : ''}
			`;

			if (!isCaixasForm && !isPaginasFixas && isModuloDedicado) {
				html += `
				<div class="info-row"><span class="info-label">Módulo principal:</span> <span class="info-val">${sistema.modulo || ''}</span></div>
				<div class="info-row"><span class="info-label">Nome no material:</span> <span class="info-val">${sistema.nomematerial || ''}</span></div>
				<div class="sub-header">- Códigos de Conectores:</div>
				<div style="margin-left: 12px; margin-bottom: 6px;">${sistema.codconectores || 'N/A'}</div>
				<div class="sub-header">- Código de Peça / Link:</div>
				${desconverterHtmlParaRelatorio(sistema.codmodulo)}
				`;
			}

			html += `<div class="sub-header" style="font-size: 11pt; color: #333; margin-top: 10px;">DESENVOLVIMENTO:</div>`;

			if (isCaixasForm) {
				if (sistema.caixas && sistema.caixas.length > 0) {
					sistema.caixas.forEach((caixa, cIdx) => {
						html += `<div style="font-weight: bold; margin-top: 8px;">- Caixa ${cIdx + 1}: ${caixa.nome || 'Sem nome'}</div>`;
						html += desconverterHtmlParaRelatorio(caixa.descricoes);
					});
				} else {
					html += `<p style="font-style: italic; color: #666; margin-left: 12px;">Nenhuma caixa adicionada.</p>`;
				}
			} else if (isPaginasFixas || !isModuloDedicado) {
				if (sistema.paginas && sistema.paginas.length > 0) {
					sistema.paginas.forEach((pagina, pIdx) => {
						html += `<div style="font-weight: bold; margin-top: 8px;">- Página ${pIdx + 1}:</div>`;
						html += desconverterHtmlParaRelatorio(pagina.conteudo);
					});
				} else {
					html += `<p style="font-style: italic; color: #666; margin-left: 12px;">Nenhuma página adicionada.</p>`;
				}
			} else {
				html += `<div style="font-weight: bold; margin-top: 6px;">- Página de Localização:</div>`;
				html += desconverterHtmlParaRelatorio(sistema.pagloc);
				html += `<div style="font-weight: bold; margin-top: 6px;">- Página de Conectores:</div>`;
				html += desconverterHtmlParaRelatorio(sistema.pagcon);
				html += `<div style="font-weight: bold; margin-top: 6px;">- Página de Diagramas:</div>`;
				html += desconverterHtmlParaRelatorio(sistema.pagdiag);
			}

			html += `</div>`;
		});
	} else {
		html += `<p style="font-style: italic; color: #666; margin-left: 12px;">Nenhum sistema adicionado (nesta parte).</p>`;
	}

	// 5. VEÍCULOS APLICÁVEIS (GRIFADO EM AMARELO #fae743 E ESTRUTURA COMPLETA DO SCRIPT4)
	if (dataAplicaveis && dataAplicaveis.length > 0) {
		html += `
		<hr class="separator" style="margin-top: 35px; margin-bottom: 30px;">
		<div class="doc-title" style="margin-top: 20px; margin-bottom: 25px;">PLANEJAMENTO - VEÍCULOS APLICÁVEIS</div>
		`;
		
		dataAplicaveis.forEach((veiculo, vIndex) => {
			const dadosGerais = veiculo.dadosGerais || {};
			html += `
			<div class="avoid-break" style="margin-top: 25px;">
				<div id="veiculo-aplicavel-${vIndex + 1}" class="section-header" style="font-size: 16pt; color: #4472c4; margin-bottom: 12px;">VEÍCULO APLICÁVEL #${vIndex + 1}</div>
				
				<div class="sub-header">- VEÍCULO REFERÊNCIA:</div>
				<div style="font-style: italic; margin-left: 12px; margin-bottom: 8px;">${dadosGerais.veiculo || 'N/A'}</div>
				
				<div class="info-row"><span class="info-label">ID DIAGRAMAS:</span> <span class="info-val">${dadosGerais.iddiagramas || 'N/A'}</span></div>
				<div class="info-row"><span class="info-label">ID FUSÍVEIS:</span> <span class="info-val">${dadosGerais.idfusiveis || 'N/A'}</span></div>
				
				<div class="sub-header" style="margin-top: 10px;">- PASTA DO VEÍCULO:</div>
				<div class="path-text" data-caminho="${dadosGerais.pasta || ''}" onclick="copiarCaminho(this, event)" title="Clique para copiar o endereço da pasta">${dadosGerais.pasta || 'N/A'}</div>
				
				<div class="sub-header">- IMPORTANTE PARA O DESENVOLVIMENTO:</div>
				${desconverterHtmlParaRelatorio(dadosGerais.comentarios)}
				
				<div class="info-row" style="margin-top: 10px;"><span class="info-label">ASSOCIAÇÃO / CHASSI:</span> <span class="info-val">${dadosGerais.aplicacao_chassi === 'mesma' ? 'Mesma associação' : (dadosGerais.aplicacao_chassi === 'ajustar' ? 'Ajustar/Criar associação' : 'N/A')}</span></div>
				${dadosGerais.aplicacao_chassi_texto ? `<div class="chassi-texto-bloco" style="margin-left: 12px; margin-bottom: 8px; white-space: pre-wrap; word-break: break-word; font-family: inherit; line-height: 1.45;">${dadosGerais.aplicacao_chassi_texto}</div>` : ''}
				
				<div class="sub-header">- PEDIDOS DE ILUSTRAÇÃO / TRATAMENTO DE IMAGEM:</div>
				${desconverterHtmlParaRelatorio(dadosGerais.ilustracao_texto || 'Nenhum pedido.')}
				
				<div class="info-row" style="margin-top: 10px;"><span class="info-label">PESQUISA:</span> <span class="info-val">${dadosGerais.pesquisa === 'sim' ? 'Sim' : 'Não'}</span></div>
				${dadosGerais.pesquisa === 'sim' && dadosGerais.pesquisa_texto ? desconverterHtmlParaRelatorio(dadosGerais.pesquisa_texto) : ''}
				
				<div class="section-header" style="font-size: 14pt; margin-top: 20px;">SISTEMAS</div>
			`;

			if (veiculo.sistemas && veiculo.sistemas.length > 0) {
				veiculo.sistemas.forEach((sistema, idx) => {
					let tituloCapitulo = (sistema.sistema || '').toUpperCase();
					if (tituloCapitulo === 'FUSÍVEIS E RELÉS') {
						const tipo = (sistema.tipo_fusiveis || 'Simplificado').toUpperCase();
						tituloCapitulo = `FUSÍVEIS E RELÉS (${tipo})`;
					} else if (tituloCapitulo === 'OUTRO' && !sistema.sistema) {
						tituloCapitulo = 'OUTRO (NÃO ESPECIFICADO)';
					}

					// Regras de transferência específicas dos aplicáveis (script4.js)
					let linhaTransferencia = '';
					if (sistema.transferencia === 'transferencia_principal') {
						const idPrincipal = (sistema.sistema === 'Fusíveis e Relés')
							? dataPrincipal.idfusiveis
							: dataPrincipal.iddiagramas;
						linhaTransferencia = `Transferência (do Principal) - ID: ${idPrincipal || 'N/A'}`;
					} else if (sistema.transferencia === 'transferencia_outro') {
						linhaTransferencia = `Transferência (Outro) - ID: ${sistema.idtransf || 'N/A'}`;
					} else if (sistema.transferencia === 'modificar') {
						linhaTransferencia = `- Modificar Publicado`;
					}

					const sysUpper = (sistema.sistema || '').toUpperCase();
					const isCaixasForm = sysUpper === "FUSÍVEIS E RELÉS";
					const isPaginasFixas = [
						"ALIMENTAÇÃO POSITIVA", "CONECTORES DE PEITO", "CARGA E PARTIDA", 
						"SISTEMA DE CARGA E PARTIDA", "CAIXA DE FUSÍVEIS DO INTERIOR", 
						"CAIXA DE FUSÍVEIS DO MOTOR", "CAIXA DE FUSÍVEIS DO PORTA-MALAS", 
						"CAIXA DE FUSÍVEIS DA BATERIA"
					].includes(sysUpper);
					const isModuloDedicado = String(sistema.modulo_dedicado).toLowerCase() === 'sim';

					html += `
					<div class="avoid-break" style="margin-top: 15px;">
						<!-- TÍTULO GRIFADO EM AMARELO #fae743 EXCLUSIVO DOS APLICÁVEIS -->
						<div id="cap-aplicavel-${vIndex + 1}-${idx + 1}" class="highlight-tag-yellow">${tituloCapitulo}</div>
						${linhaTransferencia ? `<div style="font-weight: bold; margin: 3px 0;">${linhaTransferencia}</div>` : ''}
						<div class="info-row"><span class="info-label">Nº páginas prevista:</span> <span class="info-val">${sistema.transferencia === 'modificar' ? '0' : (sistema.paginasprev || '')}</span></div>
						${(!isCaixasForm && !isPaginasFixas) ? `<div class="info-row"><span class="info-label">Módulo Dedicado:</span> <span class="info-val">${isModuloDedicado ? 'Sim' : 'Não'}</span></div>` : ''}
					`;

					if (!isCaixasForm && !isPaginasFixas && isModuloDedicado) {
						html += `
						<div class="info-row"><span class="info-label">Módulo principal:</span> <span class="info-val">${sistema.modulo || ''}</span></div>
						<div class="info-row"><span class="info-label">Nome no material:</span> <span class="info-val">${sistema.nomematerial || ''}</span></div>
						<div class="sub-header">- Códigos de Conectores:</div>
						<div style="margin-left: 12px; margin-bottom: 6px;">${sistema.codconectores || 'N/A'}</div>
						<div class="sub-header">- Código de Peça / Link:</div>
						${desconverterHtmlParaRelatorio(sistema.codmodulo)}
						`;
					}

					html += `<div class="sub-header" style="font-size: 11pt; color: #333; margin-top: 10px;">DESENVOLVIMENTO:</div>`;

					if (isCaixasForm) {
						if (sistema.caixas && sistema.caixas.length > 0) {
							sistema.caixas.forEach((caixa, cIdx) => {
								html += `<div style="font-weight: bold; margin-top: 8px;">- Caixa ${cIdx + 1}: ${caixa.nome || 'Sem nome'}</div>`;
								html += desconverterHtmlParaRelatorio(caixa.descricoes);
							});
						} else {
							html += `<p style="font-style: italic; color: #666; margin-left: 12px;">Nenhuma caixa adicionada.</p>`;
						}
					} else if (isPaginasFixas || !isModuloDedicado) {
						if (sistema.paginas && sistema.paginas.length > 0) {
							sistema.paginas.forEach((pagina, pIdx) => {
								const tituloPg = pagina.titulo || `Página ${pIdx + 1}`;
								html += `<div style="font-weight: bold; margin-top: 8px;">- ${tituloPg}:</div>`;
								html += desconverterHtmlParaRelatorio(pagina.conteudo);
							});
						} else {
							html += `<p style="font-style: italic; color: #666; margin-left: 12px;">Nenhuma página adicionada.</p>`;
						}
					} else {
						html += `<div style="font-weight: bold; margin-top: 6px;">- Página de Localização:</div>`;
						html += desconverterHtmlParaRelatorio(sistema.pagloc);
						html += `<div style="font-weight: bold; margin-top: 6px;">- Página de Conectores:</div>`;
						html += desconverterHtmlParaRelatorio(sistema.pagcon);
						html += `<div style="font-weight: bold; margin-top: 6px;">- Página de Diagramas:</div>`;
						html += desconverterHtmlParaRelatorio(sistema.pagdiag);
					}

					html += `</div>`; // fim avoid-break capítulo
				});
			} else {
				html += `<p style="font-style: italic; color: #666; margin-left: 12px;">Nenhum sistema adicionado.</p>`;
			}

			html += `</div>`; // fim avoid-break veículo
			if (vIndex < dataAplicaveis.length - 1) {
				html += `<hr class="separator" style="margin-top: 35px; margin-bottom: 30px;">`;
			}
		});
	}

	// 6. DADOS DO CARD
	html += `
	<hr class="separator" style="margin-top: 35px; margin-bottom: 30px;">
	<div class="avoid-break" style="margin-top: 20px;">
		<div id="secao-dados-card" class="section-header">DADOS DO CARD</div>
		${(dataAplicaveis && dataAplicaveis.length > 0) ? `<div class="highlight-tag">VEÍCULO PRINCIPAL</div>` : ''}
		<table class="card-data-table">
			<tr><td style="font-weight: bold; width: 180px;">DIFICULDADE:</td><td>${dificuldadeExibir || 'Não informada'}</td></tr>
			<tr><td style="font-weight: bold;">PPP (Total):</td><td>${somaTotal} | Criadas: ${somaCriadas} | Transferidas: ${somaTransferidas} | Modificadas: ${somaModificadas}</td></tr>
			<tr><td style="font-weight: bold;">ESTIMATIVA DE TEMPO:</td><td>${estimativaPrincipal} horas</td></tr>
		</table>
	`;

	if (dataAplicaveis && dataAplicaveis.length > 0) {
		html += `
		<div class="highlight-tag-yellow" style="margin-top: 15px;">VEÍCULOS APLICÁVEIS</div>
		<table class="card-data-table">
			<tr><td style="font-weight: bold; width: 180px;">DIFICULDADE (Aplicáveis):</td><td>${dataPrincipal.dificuldade_aplicaveis || 'Não informada'}</td></tr>
			<tr><td style="font-weight: bold;">PPA (Total):</td><td>${somaTotalAplicaveis} | Criadas: ${somaCriadasAplicaveis} | Transferidas: ${somaTransferidasAplicaveis} | Modificadas: ${somaModificadasAplicaveis}</td></tr>
			<tr><td style="font-weight: bold;">ESTIMATIVA DE TEMPO:</td><td>${estimativaAplicaveis} horas</td></tr>
		</table>
		`;
	}

	html += `
		</div> <!-- fim avoid-break -->
	</div> <!-- fim document-container -->
</div> <!-- fim workspace-wrapper -->

	<!-- PAINEL LATERAL DE ÍNDICE NA ESQUERDA -->
	<button id="btn-abrir-painel-indice" class="no-print" onclick="alternarPainelIndice()" title="Abrir Índice do Planejamento">📑 Índice</button>
	<div id="painel-indice" class="painel-indice no-print recolhido">
		<div class="painel-indice-header">
			<div class="painel-indice-titulo">
				<span>📑 Índice</span>
				<div style="display: flex; gap: 4px; margin-left: 8px;">
					<button type="button" class="btn-indice-expandir" onclick="expandirTodosIndices(true)" title="Expandir todos os capítulos">＋ Todos</button>
					<button type="button" class="btn-indice-expandir" onclick="expandirTodosIndices(false)" title="Recolher todos os capítulos">－ Todos</button>
				</div>
			</div>
			<button class="painel-acrobat-toggle-btn" onclick="alternarPainelIndice()" title="Recolher índice">✕</button>
		</div>
		<div class="painel-indice-lista">
			${htmlIndiceLista}
		</div>
	</div>

	<!-- PAINEL DE COMENTÁRIOS ESTILO ACROBAT NA DIREITA -->
	<button id="btn-abrir-painel-acrobat" class="no-print" onclick="alternarPainelAcrobat()" title="Abrir índice de anotações (Estilo Acrobat)">💬 Anotações</button>
	<div id="painel-acrobat" class="painel-acrobat no-print recolhido">
		<div class="painel-acrobat-header">
			<div class="painel-acrobat-titulo">
				<span>💬 Anotações</span>
				<span id="badge-contador-painel" style="font-size: 9pt; background: #e2e8f0; color: #334155; padding: 2px 7px; border-radius: 10px; font-weight: normal;">0</span>
			</div>
			<button class="painel-acrobat-toggle-btn" onclick="alternarPainelAcrobat()" title="Recolher painel">✕</button>
		</div>
		<div class="painel-acrobat-filtros">
			<input type="text" id="filtro-acrobat-autor" placeholder="🔍 Filtrar por autor..." oninput="renderizarPainelAcrobat()" style="width: 100%; box-sizing: border-box; padding: 5px 8px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 8.5pt; margin-bottom: 6px;">
			<div style="display: flex; justify-content: space-between; align-items: center; gap: 6px;">
				<select id="filtro-acrobat-status" onchange="renderizarPainelAcrobat()" style="flex: 1; padding: 4px 6px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 8pt; background: #fff;">
					<option value="todos">Todos os status</option>
					<option value="pendente">🟡 Pendentes</option>
					<option value="resolvido">🟢 Concluídos</option>
				</select>
				<button type="button" onclick="limparTodosComentarios()" style="background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; padding: 4px 8px; border-radius: 4px; font-size: 7.5pt; font-weight: bold; cursor: pointer; white-space: nowrap;" title="Excluir todos os comentários">
					🗑️ Limpar Todos
				</button>
			</div>
		</div>
		<div id="painel-acrobat-lista" class="painel-acrobat-lista">
			<div style="font-size: 9pt; color: #94a3b8; text-align: center; margin-top: 30px; font-style: italic;">Nenhum comentário cadastrado ainda.<br>Passe o mouse na página e clique no balãozinho 💬 para comentar.</div>
		</div>
	</div>

	<script id="dados-formulario-planejamento" type="application/json">
${JSON.stringify(dadosFormularioCompleto || { principal: dataPrincipal, aplicaveis: dataAplicaveis }).replace(/<\/script/gi, '<\\/script')}
	</script>

	<script>
		let comentariosArmazenados = {};
		const chaveArmazenamentoLocal = 'planejamento_cmt_' + encodeURIComponent((document.title || 'padrao').trim());

		function salvarJSONPlanejamento() {
			const scriptEl = document.getElementById('dados-formulario-planejamento');
			if (!scriptEl) return;
			try {
				const data = JSON.parse(scriptEl.textContent.trim());
				const dataStr = JSON.stringify(data, null, 2);
				const blob = new Blob([dataStr], { type: "application/json" });
				const url = URL.createObjectURL(blob);
				const a = document.createElement("a");
				a.href = url;
				let nomeArquivo = "planejamento.json";
				if (data.principal && data.principal.veiculo && data.principal.veiculo.includes('>')) {
					const partes = data.principal.veiculo.split('>');
					if (partes.length >= 5) {
						const ano = partes[1].trim();
						const modelo = partes[3].trim();
						const motor = partes[4].trim();
						nomeArquivo = \`Planejamento - \${ano} \${modelo} \${motor}.json\`;
					}
				} else if (data.principal && data.principal.veiculo) {
					nomeArquivo = \`Planejamento - \${data.principal.veiculo}.json\`;
				}
				a.download = nomeArquivo;
				document.body.appendChild(a);
				a.click();
				document.body.removeChild(a);
				setTimeout(() => URL.revokeObjectURL(url), 1000);
			} catch(e) {
				console.error('Erro ao salvar JSON:', e);
			}
		}

		function salvarComoHTMLEJson() {
			salvarComoArquivoHTML();
			setTimeout(() => {
				salvarJSONPlanejamento();
			}, 300);
		}

		function salvarPDFEJson() {
			salvarJSONPlanejamento();
			setTimeout(() => {
				window.print();
			}, 300);
		}

		function formatarDataHora() {
			const agora = new Date();
			const d = String(agora.getDate()).padStart(2, '0');
			const m = String(agora.getMonth() + 1).padStart(2, '0');
			const h = String(agora.getHours()).padStart(2, '0');
			const min = String(agora.getMinutes()).padStart(2, '0');
			return \`\${d}/\${m} \${h}:\${min}\`;
		}

		function obterAutorSalvo() {
			return localStorage.getItem('planejamento_autor_comentador') || '';
		}

		function salvarAutorPadrao(nome) {
			if (nome && nome.trim()) {
				localStorage.setItem('planejamento_autor_comentador', nome.trim());
			}
		}

		let alturaMouseAtual = 60;
		let cardEmEdicaoId = null;

		function iniciarSeguidorMouse() {
			const docEl = document.getElementById('document-container');
			const btnFlutuante = document.getElementById('btn-comentario-flutuante');
			if (!docEl || !btnFlutuante) return;

			document.addEventListener('mousemove', (e) => {
				if (document.body.classList.contains('modo-preview')) return;
				const rect = docEl.getBoundingClientRect();
				// Se o mouse estiver sobre o documento ou próximo da borda direita
				if (e.clientX >= rect.left - 40 && e.clientX <= rect.right + 120) {
					const y = e.clientY - rect.top;
					if (y >= 10 && y <= docEl.offsetHeight - 20) {
						alturaMouseAtual = y;
						btnFlutuante.style.top = (alturaMouseAtual - 18) + 'px';
						btnFlutuante.classList.add('ativo');
					}
				} else {
					btnFlutuante.classList.remove('ativo');
				}
			});

			btnFlutuante.onclick = function(e) {
				e.stopPropagation();
				e.preventDefault();
				abrirComentarioNaAltura(alturaMouseAtual);
			};
		}

		function obterElementoMaisProximo(y) {
			const docEl = document.getElementById('document-container');
			if (!docEl) return null;
			const docRect = docEl.getBoundingClientRect();

			const seletores = [
				'.info-row',
				'.sub-header',
				'.path-text',
				'.path-text-block',
				'.highlight-tag',
				'.highlight-tag-yellow',
				'.relatorio-img-container',
				'.rich-content-box > p',
				'.rich-content-box > div',
				'.chassi-texto-bloco',
				'.card-data-table tr'
			];
			const elementos = document.querySelectorAll(seletores.join(', '));
			let maisProximo = null;
			let menorDistancia = Infinity;

			elementos.forEach(el => {
				const r = el.getBoundingClientRect();
				const elTop = r.top - docRect.top;
				const elCenter = elTop + (r.height / 2);
				const dist = Math.abs(elCenter - y);
				if (dist < menorDistancia) {
					menorDistancia = dist;
					maisProximo = el;
				}
			});
			return maisProximo;
		}

		function abrirComentarioNaAltura(y) {
			const target = obterElementoMaisProximo(y);
			if (!target) return;
			if (!target.id) {
				target.id = 'cmt-alvo-' + Math.floor(Math.random() * 100000);
			}
			target.classList.add('commentable-row');

			// Já pré-cadastra na lista de anotações caso não exista
			if (!comentariosArmazenados[target.id]) {
				comentariosArmazenados[target.id] = {
					autor: obterAutorSalvo() || 'Desenvolvedor',
					data: formatarDataHora(),
					texto: '(Nova anotação)',
					status: 'pendente'
				};
				try {
					localStorage.setItem(chaveArmazenamentoLocal, JSON.stringify(comentariosArmazenados));
				} catch(e) {}
				atualizarContadorComentarios();
				renderizarPainelAcrobat();
			}

			iniciarEdicaoComentario(target.id, null);
		}

		function inicializarSistemaComentarios() {
			// SE ESTIVER EM MODO PREVIEW NA JANELA DO SISTEMA: NÃO EXECUTA NADA (mantém a tela 100% limpa como antes)
			if (document.body.classList.contains('modo-preview')) {
				return;
			}

			const seletores = [
				'.info-row',
				'.sub-header',
				'.path-text',
				'.path-text-block',
				'.highlight-tag',
				'.highlight-tag-yellow',
				'.relatorio-img-container',
				'.rich-content-box > p',
				'.rich-content-box > div',
				'.rich-content-box > table',
				'.chassi-texto-bloco',
				'.card-data-table tr'
			];

			let contador = 1;
			const elementos = document.querySelectorAll(seletores.join(', '));
			elementos.forEach(el => {
				if (!el.classList.contains('commentable-row')) {
					el.classList.add('commentable-row');
					if (!el.id) {
						el.id = 'cmt-alvo-' + contador++;
					}

					el.addEventListener('mouseenter', () => {
						const card = document.getElementById('card-cmt-' + el.id);
						if (card) card.classList.add('focused-card');
					});
					el.addEventListener('mouseleave', () => {
						const card = document.getElementById('card-cmt-' + el.id);
						if (card) card.classList.remove('focused-card');
					});
				}
			});

			iniciarSeguidorMouse();
			carregarComentariosSalvos();
			window.addEventListener('resize', ajustarPosicoesComentarios);
		}

		function carregarComentariosSalvos() {
			// 1. Tenta ler do script JSON embutido no HTML
			const scriptJson = document.getElementById('dados-comentarios-salvos');
			if (scriptJson && scriptJson.textContent.trim()) {
				try {
					comentariosArmazenados = JSON.parse(scriptJson.textContent.trim());
				} catch(e) {
					console.error('Erro ao ler comentários embutidos:', e);
				}
			}

			// 2. Mescla com dados do localStorage (mais recentes se houver)
			try {
				const locais = localStorage.getItem(chaveArmazenamentoLocal);
				if (locais) {
					const parsed = JSON.parse(locais);
					comentariosArmazenados = { ...comentariosArmazenados, ...parsed };
				}
			} catch(e) {}

			// Renderiza todos
			for (const targetId in comentariosArmazenados) {
				const cmt = comentariosArmazenados[targetId];
				if (cmt && cmt.texto) {
					renderizarCardComentario(targetId, cmt);
				}
			}

			atualizarContadorComentarios();
			renderizarPainelAcrobat();
			setTimeout(ajustarPosicoesComentarios, 100);
		}

		function renderizarCardComentario(targetId, dados) {
			const camada = document.getElementById('camada-comentarios');
			const target = document.getElementById(targetId);
			if (!camada || !target) return;

			target.classList.add('has-comment');

			let card = document.getElementById('card-cmt-' + targetId);
			if (!card) {
				card = document.createElement('div');
				card.id = 'card-cmt-' + targetId;
				card.className = 'comment-box-aside no-print';
				card.setAttribute('data-target-id', targetId);
				camada.appendChild(card);

				card.addEventListener('mouseenter', () => {
					target.classList.add('focused-target');
				});
				card.addEventListener('mouseleave', () => {
					target.classList.remove('focused-target');
				});
			}

			const isResolvido = (dados.status === 'resolvido' || dados.status === 'concluido');
			card.className = 'comment-box-aside no-print' + (isResolvido ? ' status-resolvido' : '');

			card.innerHTML = \`
				<div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
					<div>
						<div style="font-weight: bold; font-size: 10pt; color: #0f172a;">\${dados.autor || 'Desenvolvedor'}</div>
						<div style="font-size: 8pt; color: #64748b;">\${dados.data || ''}</div>
					</div>
					<button class="btn-status-toggle \${isResolvido ? 'resolvido' : 'pendente'}" onclick="alternarStatusComentario('\${targetId}')" title="Clique para alternar status (Pendente / Concluído)">
						\${isResolvido ? '🟢 Concluído' : '🟡 Pendente'}
					</button>
				</div>
				<div style="font-size: 9.5pt; color: #334155; margin: 8px 0; word-break: break-word; white-space: pre-wrap;">\${dados.texto || '(Sem anotação preenchida)'}</div>
				<div style="display: flex; justify-content: flex-end; gap: 10px; border-top: 1px solid #f1f5f9; padding-top: 6px; font-size: 8.5pt;">
					<button onclick="iniciarEdicaoComentario('\${targetId}')" style="background: none; border: none; color: #2563eb; cursor: pointer; padding: 0; font-size: 8.5pt;">✏️ Editar</button>
					<button onclick="excluirComentario('\${targetId}')" style="background: none; border: none; color: #dc2626; cursor: pointer; padding: 0; font-size: 8.5pt;">🗑️ Excluir</button>
				</div>
			\`;
		}

		function iniciarEdicaoComentario(targetId, event) {
			if (event) {
				event.stopPropagation();
				event.preventDefault();
			}
			if (cardEmEdicaoId && cardEmEdicaoId !== targetId) {
				salvarComentario(cardEmEdicaoId, true /* autoSave */);
			}
			cardEmEdicaoId = targetId;

			const camada = document.getElementById('camada-comentarios');
			const target = document.getElementById(targetId);
			if (!camada || !target) return;

			let card = document.getElementById('card-cmt-' + targetId);
			if (!card) {
				card = document.createElement('div');
				card.id = 'card-cmt-' + targetId;
				card.className = 'comment-box-aside no-print';
				card.setAttribute('data-target-id', targetId);
				camada.appendChild(card);
			}

			const existente = comentariosArmazenados[targetId] || {};
			const autorAtual = existente.autor || obterAutorSalvo() || '';
			let textoAtual = existente.texto || '';
			if (textoAtual === '(Nova anotação)' || textoAtual === '(Sem anotação preenchida)') {
				textoAtual = '';
			}

			card.className = 'comment-box-aside no-print focused-card';
			card.innerHTML = \`
				<div style="font-weight: bold; font-size: 9.5pt; margin-bottom: 6px; color: #b45309;">💬 Anotação / Dúvida</div>
				<input type="text" id="input-autor-\${targetId}" placeholder="Seu nome (ex: Gustavo)" value="\${autorAtual}" style="width: 100%; box-sizing: border-box; padding: 5px 8px; margin-bottom: 6px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 9pt;">
				<textarea id="input-texto-\${targetId}" placeholder="Digite sua dúvida ou observação aqui..." rows="3" style="width: 100%; box-sizing: border-box; padding: 6px 8px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 9pt; resize: vertical;">\${textoAtual}</textarea>
				<div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px;">
					<button type="button" onclick="cancelarEdicaoComentario('\${targetId}')" style="background: #f1f5f9; border: 1px solid #cbd5e1; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 8.5pt;">Cancelar</button>
					<button type="button" onclick="salvarComentario('\${targetId}')" style="background: #2563eb; color: #fff; border: none; padding: 4px 12px; border-radius: 4px; cursor: pointer; font-size: 8.5pt; font-weight: bold;">Salvar</button>
				</div>
			\`;

			ajustarPosicoesComentarios();
			const textarea = document.getElementById('input-texto-' + targetId);
			if (textarea) textarea.focus();
		}

		function salvarComentario(targetId, isAutoSave = false) {
			const inputAutor = document.getElementById('input-autor-' + targetId);
			const inputTexto = document.getElementById('input-texto-' + targetId);
			if (!inputTexto) return;

			let texto = inputTexto.value.trim();
			if (!texto) {
				texto = '(Sem anotação preenchida)';
			}

			const autor = (inputAutor && inputAutor.value.trim()) ? inputAutor.value.trim() : (obterAutorSalvo() || 'Desenvolvedor');
			salvarAutorPadrao(autor);

			const statusAnterior = (comentariosArmazenados[targetId] && comentariosArmazenados[targetId].status) || 'pendente';
			const dataAnterior = (comentariosArmazenados[targetId] && comentariosArmazenados[targetId].data) || formatarDataHora();

			comentariosArmazenados[targetId] = {
				autor: autor,
				data: dataAnterior,
				texto: texto,
				status: statusAnterior
			};

			try {
				localStorage.setItem(chaveArmazenamentoLocal, JSON.stringify(comentariosArmazenados));
			} catch(e) {}

			if (cardEmEdicaoId === targetId) {
				cardEmEdicaoId = null;
			}

			renderizarCardComentario(targetId, comentariosArmazenados[targetId]);
			ajustarPosicoesComentarios();
			atualizarContadorComentarios();
			renderizarPainelAcrobat();
		}

		function cancelarEdicaoComentario(targetId) {
			if (cardEmEdicaoId === targetId) {
				cardEmEdicaoId = null;
			}
			const existente = comentariosArmazenados[targetId];
			if (existente && existente.texto && existente.texto !== '(Nova anotação)' && existente.texto !== '(Sem anotação preenchida)') {
				renderizarCardComentario(targetId, existente);
			} else {
				delete comentariosArmazenados[targetId];
				try {
					localStorage.setItem(chaveArmazenamentoLocal, JSON.stringify(comentariosArmazenados));
				} catch(e) {}
				const card = document.getElementById('card-cmt-' + targetId);
				if (card) card.remove();
				const target = document.getElementById(targetId);
				if (target) target.classList.remove('has-comment', 'focused-target');
				atualizarContadorComentarios();
				renderizarPainelAcrobat();
			}
			ajustarPosicoesComentarios();
		}

		function alternarStatusComentario(targetId) {
			const cmt = comentariosArmazenados[targetId];
			if (!cmt) return;

			cmt.status = (cmt.status === 'resolvido' || cmt.status === 'concluido') ? 'pendente' : 'resolvido';
			try {
				localStorage.setItem(chaveArmazenamentoLocal, JSON.stringify(comentariosArmazenados));
			} catch(e) {}

			renderizarCardComentario(targetId, cmt);
			atualizarContadorComentarios();
			renderizarPainelAcrobat();
		}

		function excluirComentario(targetId) {
			if (!confirm('Deseja excluir esta anotação?')) return;

			if (cardEmEdicaoId === targetId) {
				cardEmEdicaoId = null;
			}
			delete comentariosArmazenados[targetId];
			try {
				localStorage.setItem(chaveArmazenamentoLocal, JSON.stringify(comentariosArmazenados));
			} catch(e) {}

			const card = document.getElementById('card-cmt-' + targetId);
			if (card) card.remove();

			const target = document.getElementById(targetId);
			if (target) target.classList.remove('has-comment', 'focused-target');

			ajustarPosicoesComentarios();
			atualizarContadorComentarios();
			renderizarPainelAcrobat();
		}

		function limparTodosComentarios() {
			const total = Object.keys(comentariosArmazenados).length;
			if (total === 0) {
				alert('Não há comentários para excluir.');
				return;
			}
			if (!confirm(\`Tem certeza que deseja excluir TODAS as \${total} anotações deste documento? Esta ação não poderá ser desfeita.\`)) {
				return;
			}
			cardEmEdicaoId = null;
			for (const targetId in comentariosArmazenados) {
				const target = document.getElementById(targetId);
				if (target) target.classList.remove('has-comment', 'focused-target');
			}
			comentariosArmazenados = {};
			try {
				localStorage.removeItem(chaveArmazenamentoLocal);
			} catch(e) {}
			const camada = document.getElementById('camada-comentarios');
			if (camada) camada.innerHTML = '';
			atualizarContadorComentarios();
			renderizarPainelAcrobat();
		}

		function atualizarContadorComentarios() {
			const badge = document.getElementById('badge-contador-comentarios');
			if (!badge) return;

			const total = Object.keys(comentariosArmazenados).length;
			let pendentes = 0;
			for (const id in comentariosArmazenados) {
				const st = comentariosArmazenados[id].status;
				if (st !== 'resolvido' && st !== 'concluido') pendentes++;
			}

			if (total === 0) {
				badge.textContent = '💬 0 anotações';
				badge.style.color = '#94a3b8';
			} else if (pendentes === 0) {
				badge.textContent = \`💬 \${total} anotações (todas concluídas! ✓)\`;
				badge.style.color = '#86efac';
			} else {
				badge.textContent = \`💬 \${total} anotações (\${pendentes} pendente\${pendentes > 1 ? 's' : ''})\`;
				badge.style.color = '#fef08a';
			}
		}

		function renderizarPainelAcrobat() {
			const listaEl = document.getElementById('painel-acrobat-lista');
			const badgePainel = document.getElementById('badge-contador-painel');
			const btnAbrir = document.getElementById('btn-abrir-painel-acrobat');
			if (!listaEl) return;

			const ids = Object.keys(comentariosArmazenados);
			if (badgePainel) badgePainel.textContent = ids.length;
			if (btnAbrir) {
				btnAbrir.innerHTML = ids.length > 0 ? ('💬 Anotações (' + ids.length + ')') : '💬 Anotações';
			}

			if (ids.length === 0) {
				listaEl.innerHTML = '<div style="font-size: 9pt; color: #94a3b8; text-align: center; margin-top: 30px; font-style: italic;">Nenhum comentário cadastrado ainda.<br>Passe o mouse na página e clique no balãozinho 💬 para comentar.</div>';
				return;
			}

			const docEl = document.getElementById('document-container');
			const docRect = docEl ? docEl.getBoundingClientRect() : { top: 0 };

			const ordenados = ids.map(id => ({ id, data: comentariosArmazenados[id] }))
				.sort((a, b) => {
					const elA = document.getElementById(a.id);
					const elB = document.getElementById(b.id);
					const topA = elA ? (elA.getBoundingClientRect().top - docRect.top) : 0;
					const topB = elB ? (elB.getBoundingClientRect().top - docRect.top) : 0;
					return topA - topB;
				});

			// Filtros de autor e status
			const inputAutor = document.getElementById('filtro-acrobat-autor');
			const termoAutor = inputAutor ? inputAutor.value.trim().toLowerCase() : '';
			const selectStatus = document.getElementById('filtro-acrobat-status');
			const statusFiltro = selectStatus ? selectStatus.value : 'todos';

			const filtrados = ordenados.filter(item => {
				const cmt = item.data;
				if (termoAutor && !(cmt.autor || '').toLowerCase().includes(termoAutor)) {
					return false;
				}
				const isConcluido = (cmt.status === 'resolvido' || cmt.status === 'concluido');
				if (statusFiltro === 'pendente' && isConcluido) {
					return false;
				}
				if (statusFiltro === 'resolvido' && !isConcluido) {
					return false;
				}
				return true;
			});

			if (filtrados.length === 0) {
				listaEl.innerHTML = '<div style="font-size: 9pt; color: #94a3b8; text-align: center; margin-top: 25px; font-style: italic;">Nenhum comentário corresponde aos filtros selecionados.</div>';
				return;
			}

			let htmlLista = '';
			filtrados.forEach(item => {
				const cmt = item.data;
				const target = document.getElementById(item.id);
				let secao = 'Elemento do Relatório';
				if (target) {
					if (target.classList.contains('relatorio-img-container')) {
						secao = 'Imagem do Relatório';
					} else {
						const primeiraLinha = target.innerText ? target.innerText.split('\\n')[0].trim() : '';
						secao = primeiraLinha ? primeiraLinha.substring(0, 36) : 'Elemento do Relatório';
					}
				}
				const isResolvido = (cmt.status === 'resolvido' || cmt.status === 'concluido');

				htmlLista += \`
					<div class="painel-acrobat-item \${isResolvido ? 'resolvido' : ''}" onclick="irParaComentario('\${item.id}')">
						<div class="painel-acrobat-item-header">
							<span class="painel-acrobat-item-autor">\${cmt.autor || 'Desenvolvedor'}</span>
							<span class="painel-acrobat-item-data">\${cmt.data || ''}</span>
						</div>
						<div class="painel-acrobat-item-secao">📍 \${secao}</div>
						<div class="painel-acrobat-item-texto">\${cmt.texto || '(Sem anotação preenchida)'}</div>
						<div style="margin-top: 6px; font-size: 8pt; display: flex; justify-content: space-between; align-items: center;">
							<button type="button" class="btn-status-toggle \${isResolvido ? 'resolvido' : 'pendente'}" onclick="event.stopPropagation(); alternarStatusComentario('\${item.id}')" title="Clique para alternar status (Pendente / Concluído)">
								\${isResolvido ? '🟢 Concluído' : '🟡 Pendente'}
							</button>
							<div style="display: flex; gap: 8px; align-items: center;">
								<span style="color: #2563eb; font-size: 7.5pt;">Ir ➔</span>
								<button type="button" onclick="event.stopPropagation(); excluirComentario('\${item.id}')" title="Excluir este comentário" style="background: none; border: none; color: #dc2626; cursor: pointer; padding: 0 4px; font-size: 9.5pt;">🗑️</button>
							</div>
						</div>
					</div>
				\`;
			});

			listaEl.innerHTML = htmlLista;
		}

		function irParaComentario(targetId) {
			const target = document.getElementById(targetId);
			if (!target) return;

			target.scrollIntoView({ behavior: 'smooth', block: 'center' });

			target.classList.add('pulse-target');
			setTimeout(() => target.classList.remove('pulse-target'), 2500);

			const card = document.getElementById('card-cmt-' + targetId);
			if (card) {
				card.classList.add('focused-card');
				setTimeout(() => card.classList.remove('focused-card'), 2500);
			}
		}

		function alternarPainelAcrobat() {
			const painel = document.getElementById('painel-acrobat');
			const btnAbrir = document.getElementById('btn-abrir-painel-acrobat');
			if (!painel) return;

			if (painel.classList.contains('recolhido')) {
				painel.classList.remove('recolhido');
				if (btnAbrir) btnAbrir.style.display = 'none';
			} else {
				painel.classList.add('recolhido');
				if (btnAbrir) btnAbrir.style.display = 'flex';
			}
		}

		function alternarPainelIndice() {
			const painel = document.getElementById('painel-indice');
			const btnAbrir = document.getElementById('btn-abrir-painel-indice');
			if (!painel) return;

			if (painel.classList.contains('recolhido')) {
				painel.classList.remove('recolhido');
				if (btnAbrir) btnAbrir.style.display = 'none';
			} else {
				painel.classList.add('recolhido');
				if (btnAbrir) btnAbrir.style.display = 'flex';
			}
		}

		function irParaElementoIndice(elementId) {
			const el = document.getElementById(elementId);
			if (!el) return;
			el.scrollIntoView({ behavior: 'smooth', block: 'center' });
			el.classList.add('pulse-target');
			setTimeout(() => el.classList.remove('pulse-target'), 2500);
		}

		function alternarGrupoIndice(grupoId) {
			const container = document.getElementById('indice-caps-' + grupoId);
			const seta = document.getElementById('seta-' + grupoId);
			if (!container) return;

			if (container.style.display === 'none' || !container.style.display) {
				container.style.display = 'block';
				if (seta) seta.textContent = '▼';
			} else {
				container.style.display = 'none';
				if (seta) seta.textContent = '▶';
			}
		}

		function expandirTodosIndices(expandir) {
			document.querySelectorAll('.indice-caps-container').forEach(el => {
				el.style.display = expandir ? 'block' : 'none';
			});
			document.querySelectorAll('.indice-seta').forEach(s => {
				s.textContent = expandir ? '▼' : '▶';
			});
		}

		// Fecha os painéis flutuantes (Anotações e Índice) ao clicar fora, e auto-salva comentário em edição
		document.addEventListener('click', (e) => {
			if (document.body.classList.contains('modo-preview')) return;

			// 1. Fechar Painel de Anotações se clicar fora
			const painelAcrobat = document.getElementById('painel-acrobat');
			const btnAcrobat = document.getElementById('btn-abrir-painel-acrobat');
			const badgeTop = document.getElementById('badge-contador-comentarios');
			if (painelAcrobat && !painelAcrobat.classList.contains('recolhido')) {
				if (!painelAcrobat.contains(e.target) && 
				    (!btnAcrobat || !btnAcrobat.contains(e.target)) && 
				    (!badgeTop || !badgeTop.contains(e.target))) {
					alternarPainelAcrobat();
				}
			}

			// 2. Fechar Painel de Índice se clicar fora
			const painelIndice = document.getElementById('painel-indice');
			const btnIndice = document.getElementById('btn-abrir-painel-indice');
			if (painelIndice && !painelIndice.classList.contains('recolhido')) {
				if (!painelIndice.contains(e.target) && 
				    (!btnIndice || !btnIndice.contains(e.target))) {
					alternarPainelIndice();
				}
			}

			// 3. Salvar card de comentário aberto em edição se clicar fora do card
			if (cardEmEdicaoId) {
				const cardAtivo = document.getElementById('card-cmt-' + cardEmEdicaoId);
				const btnFlutuante = document.getElementById('btn-comentario-flutuante');
				if (cardAtivo && !cardAtivo.contains(e.target) && (!btnFlutuante || !btnFlutuante.contains(e.target))) {
					salvarComentario(cardEmEdicaoId, true /* autoSave */);
				}
			}
		});

		function ajustarPosicoesComentarios() {
			const docEl = document.getElementById('document-container');
			if (!docEl) return;
			const docRect = docEl.getBoundingClientRect();

			const cards = Array.from(document.querySelectorAll('.comment-box-aside'))
				.filter(card => {
					const targetId = card.getAttribute('data-target-id');
					return document.getElementById(targetId) !== null;
				})
				.sort((a, b) => {
					const targetA = document.getElementById(a.getAttribute('data-target-id'));
					const targetB = document.getElementById(b.getAttribute('data-target-id'));
					const topA = targetA ? (targetA.getBoundingClientRect().top - docRect.top) : 0;
					const topB = targetB ? (targetB.getBoundingClientRect().top - docRect.top) : 0;
					return topA - topB;
				});

			let proximoTopMinimo = 0;
			cards.forEach(card => {
				const target = document.getElementById(card.getAttribute('data-target-id'));
				if (!target) return;

				const targetTop = target.getBoundingClientRect().top - docRect.top;
				const topFinal = Math.max(targetTop - 2, proximoTopMinimo);
				card.style.top = topFinal + 'px';
				proximoTopMinimo = topFinal + card.offsetHeight + 14; // espaço entre cards próximos
			});
		}

		function salvarComoArquivoHTML() {
			// Clona o documento para exportação limpa
			const docClone = document.documentElement.cloneNode(true);
			const cloneBody = docClone.querySelector('body');
			if (cloneBody) {
				// No arquivo baixado, o modo-preview é removido para que o comentador seja ativo!
				cloneBody.classList.remove('modo-preview');
			}

			// Garante que o painel acrobat inicie recolhido e com o botão de aba disponível
			const painelClone = docClone.querySelector('#painel-acrobat');
			if (painelClone) {
				painelClone.classList.add('recolhido');
			}
			const btnAbrirClone = docClone.querySelector('#btn-abrir-painel-acrobat');
			if (btnAbrirClone) {
				btnAbrirClone.style.display = 'flex';
			}

			// Garante que o painel de índice inicie recolhido e com o botão de aba disponível
			const painelIndiceClone = docClone.querySelector('#painel-indice');
			if (painelIndiceClone) {
				painelIndiceClone.classList.add('recolhido');
			}
			const btnAbrirIndiceClone = docClone.querySelector('#btn-abrir-painel-indice');
			if (btnAbrirIndiceClone) {
				btnAbrirIndiceClone.style.display = 'flex';
			}

			// Atualiza textos da barra no arquivo baixado
			const tituloBarra = docClone.querySelector('#titulo-barra-relatorio');
			if (tituloBarra) {
				tituloBarra.textContent = 'PLANEJAMENTO (com Comentador)';
			}
			const btnHtml = docClone.querySelector('.btn-html');
			if (btnHtml) {
				btnHtml.textContent = '💾 Salvar HTML+JSON';
				btnHtml.setAttribute('title', 'Salva novamente este arquivo com todas as anotações atualizadas e baixa o JSON');
			}
			const btnPrint = docClone.querySelector('.btn-print');
			if (btnPrint) {
				btnPrint.textContent = '🖨️ Salvar PDF+JSON';
				btnPrint.setAttribute('title', 'Salva como PDF ou Imprime e baixa o JSON');
			}

			// Embute script JSON de dados salvos
			let scriptJson = docClone.querySelector('#dados-comentarios-salvos');
			if (!scriptJson) {
				scriptJson = document.createElement('script');
				scriptJson.id = 'dados-comentarios-salvos';
				scriptJson.type = 'application/json';
				cloneBody.appendChild(scriptJson);
			}
			scriptJson.textContent = JSON.stringify(comentariosArmazenados || {});

			// Limpa camada de comentários dinâmicos para ser reconstruída fresquinha no carregamento
			const camadaClone = docClone.querySelector('#camada-comentarios');
			if (camadaClone) {
				camadaClone.innerHTML = '';
			}

			// Limpa botões e classes adicionadas dinamicamente para que o arquivo baixado inicialize 100% fresco e funcional
			docClone.querySelectorAll('.btn-comment-trigger').forEach(b => b.remove());
			docClone.querySelectorAll('.commentable-row').forEach(r => {
				r.classList.remove('commentable-row', 'focused-target');
				const tid = r.id;
				if (!comentariosArmazenados[tid]) {
					r.classList.remove('has-comment');
				}
			});

			const htmlContent = '<!DOCTYPE html>\\n' + docClone.outerHTML;
			const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			const docTitle = document.title ? document.title.replace(/[\\\\/:*?\"<>|]/g, '').trim() : 'Planejamento';
			a.download = (docTitle || 'Planejamento') + '.html';
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			setTimeout(() => URL.revokeObjectURL(url), 1000);
		}

		function copiarCaminho(elemento, event) {
			if (event && event.target && (event.target.id === 'btn-comentario-flutuante' || event.target.closest('#btn-comentario-flutuante') || event.target.closest('.comment-box-aside') || event.target.closest('.btn-comment-trigger'))) {
				return;
			}
			const texto = elemento.getAttribute('data-caminho') || elemento.innerText.trim();
			if (!texto || texto === 'N/A') return;
			navigator.clipboard.writeText(texto).then(() => {
				const bgOriginal = elemento.style.backgroundColor;
				elemento.style.backgroundColor = '#bbf7d0';
				const msg = document.createElement('span');
				msg.className = 'no-print';
				msg.style.cssText = 'margin-left: 8px; font-size: 9pt; color: #15803d; font-weight: bold; font-style: normal; text-decoration: none;';
				msg.textContent = '✓ Copiado!';
				elemento.appendChild(msg);
				setTimeout(() => {
					elemento.style.backgroundColor = bgOriginal;
					msg.remove();
				}, 1200);
			}).catch(err => {
				console.error('Falha ao copiar:', err);
			});
		}

		// Inicializa o sistema ao carregar a página
		document.addEventListener('DOMContentLoaded', inicializarSistemaComentarios);
		if (document.readyState === 'complete' || document.readyState === 'interactive') {
			setTimeout(inicializarSistemaComentarios, 50);
		}
	<\/script>
</body>
</html>`;

	const printWindow = window.open('', '_blank');
	if (printWindow) {
		printWindow.document.open();
		printWindow.document.write(html);
		printWindow.document.close();
		printWindow.focus();
	} else {
		alert('O bloqueador de pop-ups impediu a abertura da tela de impressão. Por favor, permita pop-ups para esta página.');
	}
}
