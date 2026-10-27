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
			incluirInfoGerais: true
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
			incluirInfoGerais: true
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
			incluirInfoGerais: true
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
	const { prefixo, sufixoTitulo, dataPrincipal, dataAplicaveis, incluirInfoGerais } = partData;

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
			background-color: #fff;
			margin: 0;
			padding: 0;
			line-height: 1.45;
			-webkit-print-color-adjust: exact !important;
			print-color-adjust: exact !important;
		}
		.toolbar-print {
			position: sticky;
			top: 0;
			background: #333;
			color: #fff;
			padding: 10px 15px;
			display: flex;
			justify-content: space-between;
			align-items: center;
			z-index: 9999;
			box-shadow: 0 2px 8px rgba(0,0,0,0.3);
		}
		.toolbar-print button {
			background: #f0ad4e;
			color: #fff;
			border: none;
			padding: 8px 18px;
			font-size: 14px;
			font-weight: bold;
			border-radius: 5px;
			cursor: pointer;
		}
		.toolbar-print button:hover {
			background: #ec971f;
		}
		.document-container {
			max-width: 210mm;
			margin: 0 auto;
			padding: 15px 0;
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
			.document-container {
				max-width: 100%;
				padding: 0;
			}
		}
	</style>
</head>
<body>
	<div class="toolbar-print no-print">
		<span>Visualização de Impressão HTML (Pressione Ctrl+P ou clique ao lado para salvar em PDF)</span>
		<button onclick="window.print()">🖨️ Salvar como PDF / Imprimir</button>
	</div>

	<div class="document-container">
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
		<div class="section-header">INFORMAÇÕES GERAIS</div>
		<div class="info-row"><span class="info-label">PLANEJADO POR:</span> <span class="info-val">${dataPrincipal.planejado_por || 'N/A'}</span></div>
		<div class="sub-header">- VEÍCULO REFERÊNCIA:</div>
		<div style="font-style: italic; font-size: 10pt; margin-left: 12px; margin-bottom: 6px;">${dataPrincipal.veiculo || 'N/A'}</div>
		<div class="info-row"><span class="info-label">ID DIAGRAMAS:</span> <span class="info-val">${dataPrincipal.iddiagramas || 'N/A'}</span></div>
		<div class="info-row"><span class="info-label">ID FUSÍVEIS:</span> <span class="info-val">${dataPrincipal.idfusiveis || 'N/A'}</span></div>

		<div class="sub-header" style="margin-top: 10px;">- PASTA DO VEÍCULO:</div>
		<div class="path-text">${dataPrincipal.pasta || 'N/A'}</div>

		<div class="sub-header">- IMPORTANTE PARA O DESENVOLVIMENTO:</div>
		${desconverterHtmlParaRelatorio(dataPrincipal.comentarios)}

		<div class="info-row" style="margin-top: 10px;"><span class="info-label">ASSOCIAÇÃO / CHASSI:</span> <span class="info-val">${dataPrincipal.aplicacao_chassi === 'mesma' ? 'Mesma associação' : (dataPrincipal.aplicacao_chassi === 'ajustar' ? 'Ajustar/Criar associação' : 'N/A')}</span></div>
		${dataPrincipal.aplicacao_chassi_texto ? `<div style="margin-left: 12px; margin-bottom: 8px;">${dataPrincipal.aplicacao_chassi_texto}</div>` : ''}

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
				<div class="highlight-tag">${tituloCapitulo}</div>
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
			<div id="veiculo-aplicavel-${vIndex + 1}" class="avoid-break" style="margin-top: 25px;">
				<div class="section-header" style="font-size: 16pt; color: #4472c4; margin-bottom: 12px;">VEÍCULO APLICÁVEL #${vIndex + 1}</div>
				
				<div class="sub-header">- VEÍCULO REFERÊNCIA:</div>
				<div style="font-style: italic; margin-left: 12px; margin-bottom: 8px;">${dadosGerais.veiculo || 'N/A'}</div>
				
				<div class="info-row"><span class="info-label">ID DIAGRAMAS:</span> <span class="info-val">${dadosGerais.iddiagramas || 'N/A'}</span></div>
				<div class="info-row"><span class="info-label">ID FUSÍVEIS:</span> <span class="info-val">${dadosGerais.idfusiveis || 'N/A'}</span></div>
				
				<div class="sub-header" style="margin-top: 10px;">- PASTA DO VEÍCULO:</div>
				<div class="path-text">${dadosGerais.pasta || 'N/A'}</div>
				
				<div class="sub-header">- IMPORTANTE PARA O DESENVOLVIMENTO:</div>
				${desconverterHtmlParaRelatorio(dadosGerais.comentarios)}
				
				<div class="info-row" style="margin-top: 10px;"><span class="info-label">ASSOCIAÇÃO / CHASSI:</span> <span class="info-val">${dadosGerais.aplicacao_chassi === 'mesma' ? 'Mesma associação' : (dadosGerais.aplicacao_chassi === 'ajustar' ? 'Ajustar/Criar associação' : 'N/A')}</span></div>
				${dadosGerais.aplicacao_chassi_texto ? `<div style="margin-left: 12px; margin-bottom: 8px;">${dadosGerais.aplicacao_chassi_texto}</div>` : ''}
				
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
						<div class="highlight-tag-yellow">${tituloCapitulo}</div>
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
		<div class="section-header">DADOS DO CARD</div>
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
