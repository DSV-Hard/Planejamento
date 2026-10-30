// =========================================================================
// SCRIPT 5 - NOVO MOTOR DE GERAÇÃO DE PDF VIA IMPRESSÃO HTML NATIVA
// - Desconverte miniaturas para imagens originais em tamanho real e nítido
// - Cada endereço de pasta sai em sua própria linha (bloco) em verde itálico
// - Links de sites mantêm a palavra "LINK" em azul discreto e clicável
// - Veículo Principal: Títulos de capítulos grifados em VERDE (#d4ffd6)
// - Veículos Aplicáveis: Títulos de capítulos grifados em AMARELO (#fae743)
//   e com todos os formulários/campos completos idênticos ao script4.js
// =========================================================================

function fecharModalSelecaoCapitulos() {
	const modal = document.getElementById('chapterSelectionModal');
	if (modal) modal.style.display = 'none';
}

function abrirModalSelecaoCapitulosHtmlPrint() {
	const dados = coletarDadosFormulario();
	const dataPrincipal = dados.principal;
	const sistemas = dataPrincipal.sistemas || [];
	
	const checkboxesDiv = document.getElementById('capitulos-checkboxes');
	const confirmBtn = document.getElementById('confirmSelection');
	const cancelBtn = document.getElementById('cancelSelection');
	const modal = document.getElementById('chapterSelectionModal');

	if (checkboxesDiv) {
		checkboxesDiv.innerHTML = '';
		if (!sistemas || sistemas.length === 0) {
			checkboxesDiv.innerHTML = '<p style="text-align: center; color: #f44336; font-weight: bold;">NENHUM CAPÍTULO ENCONTRADO. O relatório será gerado em parte única.</p>';
			if (confirmBtn) confirmBtn.textContent = 'GERAR RELATÓRIO ÚNICO';
		} else {
			if (confirmBtn) confirmBtn.textContent = 'OK';
			sistemas.forEach((sistema, index) => {
				const label = document.createElement('label');
				label.style.display = 'block';
				label.style.marginBottom = '5px';
				label.style.cursor = 'pointer';
				label.innerHTML = `<input type="checkbox" data-index="${index}" data-nome="${sistema.sistema || ''}" value="${sistema.sistema || ''}"> ${sistema.sistema || 'Sem título'}`;
				checkboxesDiv.appendChild(label);
			});
		}
	}

	const aplicaveis = dados.aplicaveis || [];
	const veiculosDiv = document.getElementById('veiculos-aplicaveis-checkboxes');
	if (veiculosDiv) {
		veiculosDiv.innerHTML = '';
		if (!aplicaveis || aplicaveis.length === 0) {
			veiculosDiv.innerHTML = '<p style="text-align: center; color: #999;">Nenhum veículo aplicável...</p>';
		} else {
			aplicaveis.forEach((veiculo, index) => {
				const label = document.createElement('label');
				label.style.display = 'block';
				label.style.marginBottom = '5px';
				label.style.cursor = 'pointer';
				const veiculoRef = (typeof extrairTooltipVeiculo === 'function' ? extrairTooltipVeiculo(veiculo.dadosGerais?.veiculo) : '') || `Veículo ${index + 1}`;
				label.innerHTML = `<input type="checkbox" data-veiculo-index="${index}" value="${index}"> Aplicável #${index + 1} - <span style="font-size: 0.85em;"><i>${veiculoRef}</i></span>`;
				veiculosDiv.appendChild(label);
			});
		}
	}

	// Remove listeners anteriores clonando os botões
	if (confirmBtn) {
		const novoConfirmBtn = confirmBtn.cloneNode(true);
		confirmBtn.parentNode.replaceChild(novoConfirmBtn, confirmBtn);
		novoConfirmBtn.addEventListener('click', () => {
			const dadosAtuais = coletarDadosFormulario();
			const todosSistemas = dadosAtuais.principal.sistemas || [];
			
			if (!todosSistemas || todosSistemas.length === 0) {
				fecharModalSelecaoCapitulos();
				gerarPDFHtmlPrint(null);
				return;
			}

			const checkboxesCap = document.querySelectorAll('#capitulos-checkboxes input[type="checkbox"]:checked');
			const sistemasSelecionadosParaParte2 = [];
			checkboxesCap.forEach(checkbox => {
				const nomeSistema = checkbox.getAttribute('data-nome');
				const sistemaEncontrado = todosSistemas.find(s => s.sistema === nomeSistema);
				if (sistemaEncontrado) {
					sistemasSelecionadosParaParte2.push(sistemaEncontrado);
				}
			});

			const checkboxesVeh = document.querySelectorAll('#veiculos-aplicaveis-checkboxes input[type="checkbox"]:checked');
			const indicesVeiculosParte1 = Array.from(checkboxesVeh).map(cb => parseInt(cb.getAttribute('data-veiculo-index'), 10));
			
			fecharModalSelecaoCapitulos();
			gerarPDFHtmlPrint({
				sistemasParte2: sistemasSelecionadosParaParte2,
				indicesVeiculosParte1: indicesVeiculosParte1
			});
		});
	}

	if (cancelBtn) {
		const novoCancelBtn = cancelBtn.cloneNode(true);
		cancelBtn.parentNode.replaceChild(novoCancelBtn, cancelBtn);
		novoCancelBtn.addEventListener('click', fecharModalSelecaoCapitulos);
	}

	if (modal) {
		modal.style.display = 'flex';
		modal.onclick = (e) => {
			if (e.target === modal) {
				fecharModalSelecaoCapitulos();
			}
		};
	}
}

window.abrirModalDivisaoPDF = function() {
	gerarPDFHtmlPrint();
};
window.abrirModalSelecaoCapitulos = abrirModalSelecaoCapitulosHtmlPrint;
window.fecharModalSelecaoCapitulos = fecharModalSelecaoCapitulos;

// Otimiza imagens embutidas pesadas no formulário completo para prevenir estouro de memória no navegador
async function otimizarImagensDoFormularioCompleto(dadosCompletos) {
	if (!dadosCompletos) return;
	
	const regexDataUrl = /data:image\/[^;]+;base64,[^"'\s<>]+/g;
	const imagensPesadas = new Set();
	const limiteTamanho = 350000; // ~260KB binário / 350KB Base64

	function encontrarImagensPesadas(obj) {
		if (typeof obj === 'string') {
			if (obj.length > limiteTamanho) {
				const matches = obj.match(regexDataUrl);
				if (matches) {
					matches.forEach(m => {
						if (m.length > limiteTamanho) {
							imagensPesadas.add(m);
						}
					});
				}
			}
		} else if (Array.isArray(obj)) {
			obj.forEach(encontrarImagensPesadas);
		} else if (obj && typeof obj === 'object') {
			for (const k of Object.keys(obj)) {
				encontrarImagensPesadas(obj[k]);
			}
		}
	}

	encontrarImagensPesadas(dadosCompletos);

	if (imagensPesadas.size === 0) return;

	const mapaOtimizacoes = new Map();
	for (const dataUrl of imagensPesadas) {
		if (typeof otimizarImagemBase64 === 'function') {
			const otimizada = await otimizarImagemBase64(dataUrl, 1920, 0.85);
			if (otimizada && otimizada.length < dataUrl.length) {
				mapaOtimizacoes.set(dataUrl, otimizada);
			}
		}
	}

	if (mapaOtimizacoes.size === 0) return;

	function substituirImagens(obj) {
		if (typeof obj === 'string') {
			let res = obj;
			mapaOtimizacoes.forEach((nova, antiga) => {
				if (res.includes(antiga)) {
					res = res.split(antiga).join(nova);
				}
			});
			return res;
		} else if (Array.isArray(obj)) {
			for (let i = 0; i < obj.length; i++) {
				obj[i] = substituirImagens(obj[i]);
			}
			return obj;
		} else if (obj && typeof obj === 'object') {
			for (const k of Object.keys(obj)) {
				obj[k] = substituirImagens(obj[k]);
			}
			return obj;
		}
		return obj;
	}

	substituirImagens(dadosCompletos);

	// Atualiza também os atributos data-original-image nos elementos editáveis do DOM para persistir no form
	try {
		const imgsDOM = document.querySelectorAll('img[data-original-image]');
		imgsDOM.forEach(img => {
			const srcAtual = img.getAttribute('data-original-image');
			if (srcAtual && mapaOtimizacoes.has(srcAtual)) {
				img.setAttribute('data-original-image', mapaOtimizacoes.get(srcAtual));
			}
		});
	} catch (e) {}
}

async function gerarPDFHtmlPrint(options = null) {
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

	// SE FOR EM DUAS PARTES E NÃO TIVER OPÇÕES DE DIVISÃO, ABRE O MODAL DE SELEÇÃO:
	if (qtdPartes === 'duas' && !options) {
		abrirModalSelecaoCapitulosHtmlPrint();
		return;
	}

	// Otimiza quaisquer imagens pesadas existentes no formulário (fotos de câmera legadas, etc.)
	await otimizarImagensDoFormularioCompleto(dadosCompletos);

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

	let htmlItensSerie = '';
	if (typeof atualizarResumoTab === 'function') {
		try { atualizarResumoTab(); } catch(e) {}
	}
	const captureEl = document.getElementById('pdf-capture-area');
	if (captureEl) {
		const clone = captureEl.cloneNode(true);
		const headerInfo = clone.querySelector('#pdf-header-info');
		if (headerInfo) {
			headerInfo.style.display = 'block';
			const dateEl = headerInfo.querySelector('#pdf-generation-date');
			if (dateEl) dateEl.textContent = new Date().toLocaleDateString('pt-BR');
		}
		htmlItensSerie = clone.innerHTML;
	}

	if (isSplit) {
		abrirJanelaImpressaoHtml({
			isSplit: true,
			parts: partsToGenerate,
			dadosFormularioCompleto: dadosCompletos,
			htmlItensSerie: htmlItensSerie
		});
	} else {
		abrirJanelaImpressaoHtml({
			isSplit: false,
			parts: partsToGenerate,
			dadosFormularioCompleto: dadosCompletos,
			htmlItensSerie: htmlItensSerie
		});
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

	htmlString = htmlString.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

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

function gerarDadosParteRelatorio(partData, parteNum = 1) {
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
		<div class="indice-secao-titulo" onclick="alternarGrupoIndice('p${parteNum}-principal')" title="Clique para expandir/recolher os capítulos">
			<span>VEÍCULO PRINCIPAL ${qtdCapsPrincipal > 0 ? `(${qtdCapsPrincipal})` : ''}</span>
			<span id="seta-p${parteNum}-principal" class="indice-seta">▶</span>
		</div>
		<div class="indice-item indice-item-veiculo" onclick="irParaElementoIndice('p${parteNum}-secao-info-gerais-principal', ${parteNum})" title="Ir para Informações Gerais">
			🚗 <span>${nomeVeiculoPrincipal}</span>
		</div>
		<div id="indice-caps-p${parteNum}-principal" class="indice-caps-container" style="display: none;">
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
				<div class="indice-item" onclick="irParaElementoIndice('p${parteNum}-cap-principal-${idx + 1}', ${parteNum})" title="Ir para ${tituloCapitulo}">
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
				<div class="indice-secao-titulo" onclick="alternarGrupoIndice('p${parteNum}-aplicavel-${vIndex + 1}')" title="Clique para expandir/recolher os capítulos" style="margin-top: 14px;">
					<span>VEÍCULO APLICÁVEL ${vIndex + 1} ${qtdCapsAplicavel > 0 ? `(${qtdCapsAplicavel})` : ''}</span>
					<span id="seta-p${parteNum}-aplicavel-${vIndex + 1}" class="indice-seta">▶</span>
				</div>
				<div class="indice-item indice-item-veiculo" onclick="irParaElementoIndice('p${parteNum}-veiculo-aplicavel-${vIndex + 1}', ${parteNum})" title="Ir para Veículo Aplicável ${vIndex + 1}">
					🚗 <span>${nomeVeiculoAplicavel}</span>
				</div>
				<div id="indice-caps-p${parteNum}-aplicavel-${vIndex + 1}" class="indice-caps-container" style="display: none;">
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
						<div class="indice-item" onclick="irParaElementoIndice('p${parteNum}-cap-aplicavel-${vIndex + 1}-${idx + 1}', ${parteNum})" title="Ir para ${tituloCapitulo}">
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
		<div class="indice-item" onclick="irParaElementoIndice('p${parteNum}-secao-dados-card', ${parteNum})" title="Ir para Dados do Card" style="font-weight: bold; color: #1e293b;">
			📊 <span>DADOS DO CARD</span>
		</div>
	`;

	let corpoDoc = '';

	// 1. ÍNDICE RÁPIDO PARA APLICÁVEIS
	if (dataAplicaveis && dataAplicaveis.length > 0) {
		corpoDoc += `
		<div class="indice-rapido avoid-break">
			<div style="font-weight: bold; font-size: 11pt; margin-bottom: 6px;">ÍNDICE RÁPIDO (P/ APLICÁVEIS):</div>
		`;
		dataAplicaveis.forEach((veiculo, index) => {
			const refText = veiculo.dadosGerais.veiculo || 'Sem referência';
			corpoDoc += `<a href="#p${parteNum}-veiculo-aplicavel-${index + 1}">Veículo Aplicável #${index + 1} - ${refText}</a>`;
		});
		corpoDoc += `</div><hr class="separator" style="margin-top: 25px; margin-bottom: 30px;">`;
	}

	// 2. TÍTULO PRINCIPAL
	corpoDoc += `
		<div class="doc-title" style="margin-top: 15px;">PLANEJAMENTO - VEÍCULO PRINCIPAL${sufixoTitulo}</div>
		${dataPrincipal.clickup ? `<div class="clickup-link">${dataPrincipal.clickup}</div>` : ''}
	`;

	// 3. INFORMAÇÕES GERAIS (VEÍCULO PRINCIPAL)
	if (incluirInfoGerais) {
		corpoDoc += `
		<div id="p${parteNum}-secao-info-gerais-principal" class="section-header">INFORMAÇÕES GERAIS</div>
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
	corpoDoc += `<div class="section-header" style="margin-top: 25px;">SISTEMAS</div>`;

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

			corpoDoc += `
			<div class="avoid-break" style="margin-top: 15px;">
				<div id="p${parteNum}-cap-principal-${idx + 1}" class="highlight-tag">${tituloCapitulo}</div>
				${linhaTransferencia ? `<div style="font-weight: bold; margin: 3px 0;">${linhaTransferencia}</div>` : ''}
				<div class="info-row"><span class="info-label">Nº páginas prevista:</span> <span class="info-val">${sistema.transferencia === 'modificar' ? '0' : (sistema.paginasprev || '')}</span></div>
				${(!isCaixasForm && !isPaginasFixas) ? `<div class="info-row"><span class="info-label">Módulo Dedicado:</span> <span class="info-val">${isModuloDedicado ? 'Sim' : 'Não'}</span></div>` : ''}
			`;

			if (!isCaixasForm && !isPaginasFixas && isModuloDedicado) {
				corpoDoc += `
				<div class="info-row"><span class="info-label">Módulo principal:</span> <span class="info-val">${sistema.modulo || ''}</span></div>
				<div class="info-row"><span class="info-label">Nome no material:</span> <span class="info-val">${sistema.nomematerial || ''}</span></div>
				<div class="sub-header">- Códigos de Conectores:</div>
				<div style="margin-left: 12px; margin-bottom: 6px; white-space: pre-wrap; word-break: break-word;">${sistema.codconectores || 'N/A'}</div>
				<div class="sub-header">- Código de Peça / Link:</div>
				${desconverterHtmlParaRelatorio(sistema.codmodulo)}
				`;
			}

			if (sistema.transferencia === 'modificar' && sistema.paginas_modificar && sistema.paginas_modificar.length > 0) {
				corpoDoc += `<div class="sub-header" style="margin-top: 8px;">- Páginas a Modificar:</div>`;
				sistema.paginas_modificar.forEach(pm => {
					corpoDoc += `
					<div class="mod-box">
						<div class="info-row"><span class="info-label">ID Página:</span> <span class="info-val">${pm.id || ''}</span></div>
						<div class="info-row"><span class="info-label">Título da Página:</span> <span class="info-val">${pm.titulo || ''}</span></div>
						<div class="info-row"><span class="info-label">O que modificar:</span> <span class="info-val">${pm.descricao || ''}</span></div>
					</div>`;
				});
			} else {
				if (isCaixasForm) {
					corpoDoc += `
					<div class="info-row"><span class="info-label">Tipo de Caixa:</span> <span class="info-val">${sistema.tipo_fusiveis || 'Simplificado'}</span></div>
					<div class="sub-header">- Informações da Caixa de Fusíveis:</div>
					${desconverterHtmlParaRelatorio(sistema.info_fusiveis)}
					`;
				} else if (sistema.tipo_layout === 'paginas') {
					if (sistema.paginas && sistema.paginas.length > 0) {
						sistema.paginas.forEach((pagina, pIdx) => {
							const tituloPg = pagina.titulo || `Página ${pIdx + 1}`;
							corpoDoc += `<div style="font-weight: bold; margin-top: 8px;">- ${tituloPg}:</div>`;
							corpoDoc += desconverterHtmlParaRelatorio(pagina.conteudo);
						});
					} else {
						corpoDoc += `<p style="font-style: italic; color: #666; margin-left: 12px;">Nenhuma página adicionada.</p>`;
					}
				} else {
					corpoDoc += `<div style="font-weight: bold; margin-top: 6px;">- Página de Localização:</div>`;
					corpoDoc += desconverterHtmlParaRelatorio(sistema.pagloc);
					corpoDoc += `<div style="font-weight: bold; margin-top: 6px;">- Página de Conectores:</div>`;
					corpoDoc += desconverterHtmlParaRelatorio(sistema.pagcon);
					corpoDoc += `<div style="font-weight: bold; margin-top: 6px;">- Página de Diagramas:</div>`;
					corpoDoc += desconverterHtmlParaRelatorio(sistema.pagdiag);
				}
			}

			corpoDoc += `</div>`; // fim avoid-break capítulo
		});
	} else {
		corpoDoc += `<p style="font-style: italic; color: #666; margin-left: 12px;">Nenhum sistema adicionado.</p>`;
	}

	// 5. VEÍCULOS APLICÁVEIS
	if (dataAplicaveis && dataAplicaveis.length > 0) {
		corpoDoc += `<hr class="separator" style="margin-top: 35px; margin-bottom: 30px;">`;
		dataAplicaveis.forEach((veiculo, vIndex) => {
			const dadosGerais = veiculo.dadosGerais || {};
			const refText = dadosGerais.veiculo || 'N/A';
			corpoDoc += `
			<div class="avoid-break" style="margin-top: 25px;">
				<div id="p${parteNum}-veiculo-aplicavel-${vIndex + 1}" class="doc-title" style="font-size: 13pt; text-align: left; border-left: 4px solid #2563eb; padding-left: 8px; margin-bottom: 12px;">
					VEÍCULO APLICÁVEL #${vIndex + 1}
				</div>
				<div class="info-row"><span class="info-label">VEÍCULO REFERÊNCIA:</span> <span class="info-val">${refText}</span></div>
				<div class="info-row"><span class="info-label">PASTA DO VEÍCULO:</span></div>
				<div class="path-text" data-caminho="${dadosGerais.pasta || ''}" onclick="copiarCaminho(this, event)" title="Clique para copiar o endereço da pasta">${dadosGerais.pasta || 'N/A'}</div>
				<div class="sub-header">- IMPORTANTE PARA O DESENVOLVIMENTO:</div>
				${desconverterHtmlParaRelatorio(dadosGerais.comentarios)}
				<div class="info-row" style="margin-top: 8px;"><span class="info-label">ASSOCIAÇÃO / CHASSI:</span> <span class="info-val">${dadosGerais.aplicacao_chassi === 'mesma' ? 'Mesma associação' : (dadosGerais.aplicacao_chassi === 'ajustar' ? 'Ajustar/Criar associação' : 'N/A')}</span></div>
				${dadosGerais.aplicacao_chassi_texto ? `<div class="chassi-texto-bloco" style="margin-left: 12px; margin-bottom: 8px; white-space: pre-wrap; word-break: break-word; font-family: inherit; line-height: 1.45;">${dadosGerais.aplicacao_chassi_texto}</div>` : ''}

				<div class="section-header" style="margin-top: 20px; font-size: 10pt; background: #e0e7ff; color: #1e1b4b; padding: 4px 8px;">
					SISTEMAS DO APLICÁVEL #${vIndex + 1}
				</div>
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

					let linhaTransferencia = '';
					if (sistema.transferencia === 'transferencia') linhaTransferencia = `- Transferência - ID: ${sistema.idtransf || ''}`;
					else if (sistema.transferencia === 'transferencia_principal') linhaTransferencia = `- Transferência do Principal`;
					else if (sistema.transferencia === 'transferencia_outro') linhaTransferencia = `- Transferência de outro Aplicável`;
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

					corpoDoc += `
					<div class="avoid-break" style="margin-top: 15px;">
						<div id="p${parteNum}-cap-aplicavel-${vIndex + 1}-${idx + 1}" class="highlight-tag-yellow">${tituloCapitulo}</div>
						${linhaTransferencia ? `<div style="font-weight: bold; margin: 3px 0;">${linhaTransferencia}</div>` : ''}
						<div class="info-row"><span class="info-label">Nº páginas prevista:</span> <span class="info-val">${sistema.transferencia === 'modificar' ? '0' : (sistema.paginasprev || '')}</span></div>
						${(!isCaixasForm && !isPaginasFixas) ? `<div class="info-row"><span class="info-label">Módulo Dedicado:</span> <span class="info-val">${isModuloDedicado ? 'Sim' : 'Não'}</span></div>` : ''}
					`;

					if (!isCaixasForm && !isPaginasFixas && isModuloDedicado) {
						corpoDoc += `
						<div class="info-row"><span class="info-label">Módulo principal:</span> <span class="info-val">${sistema.modulo || ''}</span></div>
						<div class="info-row"><span class="info-label">Nome no material:</span> <span class="info-val">${sistema.nomematerial || ''}</span></div>
						<div class="sub-header">- Códigos de Conectores:</div>
						<div style="margin-left: 12px; margin-bottom: 6px; white-space: pre-wrap; word-break: break-word;">${sistema.codconectores || 'N/A'}</div>
						<div class="sub-header">- Código de Peça / Link:</div>
						${desconverterHtmlParaRelatorio(sistema.codmodulo)}
						`;
					}

					if (isCaixasForm) {
						corpoDoc += `
						<div class="info-row"><span class="info-label">Tipo de Caixa:</span> <span class="info-val">${sistema.tipo_fusiveis || 'Simplificado'}</span></div>
						<div class="sub-header">- Informações da Caixa de Fusíveis:</div>
						${desconverterHtmlParaRelatorio(sistema.info_fusiveis)}
						`;
					} else if (sistema.tipo_layout === 'paginas') {
						if (sistema.paginas && sistema.paginas.length > 0) {
							sistema.paginas.forEach((pagina, pIdx) => {
								const tituloPg = pagina.titulo || `Página ${pIdx + 1}`;
								corpoDoc += `<div style="font-weight: bold; margin-top: 8px;">- ${tituloPg}:</div>`;
								corpoDoc += desconverterHtmlParaRelatorio(pagina.conteudo);
							});
						} else {
							corpoDoc += `<p style="font-style: italic; color: #666; margin-left: 12px;">Nenhuma página adicionada.</p>`;
						}
					} else {
						corpoDoc += `<div style="font-weight: bold; margin-top: 6px;">- Página de Localização:</div>`;
						corpoDoc += desconverterHtmlParaRelatorio(sistema.pagloc);
						corpoDoc += `<div style="font-weight: bold; margin-top: 6px;">- Página de Conectores:</div>`;
						corpoDoc += desconverterHtmlParaRelatorio(sistema.pagcon);
						corpoDoc += `<div style="font-weight: bold; margin-top: 6px;">- Página de Diagramas:</div>`;
						corpoDoc += desconverterHtmlParaRelatorio(sistema.pagdiag);
					}

					corpoDoc += `</div>`; // fim avoid-break capítulo
				});
			} else {
				corpoDoc += `<p style="font-style: italic; color: #666; margin-left: 12px;">Nenhum sistema adicionado.</p>`;
			}

			corpoDoc += `</div>`; // fim avoid-break veículo
			if (vIndex < dataAplicaveis.length - 1) {
				corpoDoc += `<hr class="separator" style="margin-top: 35px; margin-bottom: 30px;">`;
			}
		});
	}

	// 6. DADOS DO CARD
	corpoDoc += `
	<hr class="separator" style="margin-top: 35px; margin-bottom: 30px;">
	<div class="avoid-break" style="margin-top: 20px;">
		<div id="p${parteNum}-secao-dados-card" class="section-header">DADOS DO CARD</div>
		${(dataAplicaveis && dataAplicaveis.length > 0) ? `<div class="highlight-tag">VEÍCULO PRINCIPAL</div>` : ''}
		<table class="card-data-table">
			<tr><td style="font-weight: bold; width: 180px;">DIFICULDADE:</td><td>${dificuldadeExibir || 'Não informada'}</td></tr>
			<tr><td style="font-weight: bold;">PPP (Total):</td><td>${somaTotal} | Criadas: ${somaCriadas} | Transferidas: ${somaTransferidas} | Modificadas: ${somaModificadas}</td></tr>
			<tr><td style="font-weight: bold;">ESTIMATIVA DE TEMPO:</td><td>${estimativaPrincipal} horas</td></tr>
		</table>
	`;

	if (dataAplicaveis && dataAplicaveis.length > 0) {
		corpoDoc += `
		<div class="highlight-tag-yellow" style="margin-top: 15px;">VEÍCULOS APLICÁVEIS</div>
		<table class="card-data-table">
			<tr><td style="font-weight: bold; width: 180px;">DIFICULDADE (Aplicáveis):</td><td>${dataPrincipal.dificuldade_aplicaveis || 'Não informada'}</td></tr>
			<tr><td style="font-weight: bold;">PPA (Total):</td><td>${somaTotalAplicaveis} | Criadas: ${somaCriadasAplicaveis} | Transferidas: ${somaTransferidasAplicaveis} | Modificadas: ${somaModificadasAplicaveis}</td></tr>
			<tr><td style="font-weight: bold;">ESTIMATIVA DE TEMPO:</td><td>${estimativaAplicaveis} horas</td></tr>
		</table>
		`;
	}

	corpoDoc += `
		</div> <!-- fim avoid-break -->
	`;

	return {
		tituloDocumento,
		sufixoTitulo,
		htmlIndiceLista,
		corpoDoc
	};
}

function abrirJanelaImpressaoHtml(config) {
	const isSplit = !!config.isSplit;
	const parts = isSplit ? config.parts : (config.parts ? config.parts : [config]);
	const dadosFormularioCompleto = config.dadosFormularioCompleto || (parts[0] && parts[0].dadosFormularioCompleto);

	const parte1 = gerarDadosParteRelatorio(parts[0], 1);
	const parte2 = isSplit ? gerarDadosParteRelatorio(parts[1], 2) : null;
	const tituloDocumento = parte1.tituloDocumento;
	const htmlItensSerie = config.htmlItensSerie || '';
	const temItensSerie = !!htmlItensSerie.trim();

	let html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
	<meta charset="UTF-8">
	<title>${tituloDocumento}</title>
	<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
	<link rel="stylesheet" href="ITENS/itens-scoped.css">
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
			padding: 10px 20px;
			display: flex;
			flex-direction: column;
			justify-content: center;
			align-items: center;
			gap: 8px;
			z-index: 9999;
			box-shadow: 0 2px 10px rgba(0, 0, 0, 0.25);
			font-family: Arial, sans-serif;
			min-height: 54px;
		}
		body:not(.modo-relatorio-preview) .toolbar-print {
			min-height: 94px;
			padding: 14px 20px;
			gap: 10px;
		}
		body.modo-relatorio-preview .toolbar-row-bottom {
			display: none !important;
		}
		.toolbar-row-top {
			display: flex;
			align-items: center;
			justify-content: center;
			gap: 12px;
			width: 100%;
			flex-wrap: wrap;
		}
		.toolbar-row-bottom {
			display: flex;
			align-items: center;
			justify-content: center;
			gap: 10px;
			width: 100%;
			flex-wrap: wrap;
		}
		.parte-tabs-container {
			display: inline-flex;
			align-items: center;
			background: #0f172a;
			padding: 3px;
			border-radius: 8px;
			border: 1px solid #475569;
			margin-right: 4px;
		}
		.btn-parte-tab {
			background: transparent;
			color: #cbd5e1;
			border: none;
			padding: 6px 14px;
			border-radius: 6px;
			font-size: 12px;
			font-weight: bold;
			cursor: pointer;
			transition: all 0.2s ease;
			letter-spacing: 0.5px;
		}
		.btn-parte-tab:hover {
			color: #ffffff;
			background: rgba(255, 255, 255, 0.12);
		}
		.btn-parte-tab.ativo {
			background: #2563eb !important;
			color: #ffffff !important;
			box-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
		}
		.btn-tool-top {
			background: #334155;
			color: #ffffff;
			border: 1px solid #475569;
			padding: 5px 11px;
			border-radius: 8px;
			font-size: 13.5px;
			font-weight: bold;
			display: inline-flex;
			align-items: center;
			justify-content: center;
			cursor: pointer;
			transition: all 0.2s ease;
		}
		.btn-tool-top:hover {
			background: #475569;
		}
		.btn-tool-top.ativo {
			background: #dc2626 !important;
			color: #ffffff !important;
			border-color: #b91c1c !important;
			box-shadow: 0 0 10px rgba(220, 38, 38, 0.6);
		}
		.toolbar-print button {
			border: none;
			padding: 8px 16px;
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

		/* MODO RELATÓRIO PREVIEW:
		   - Na aba RELATÓRIO inicial: sem aba Anotações, sem caneta, sem quadrado, sem grifar, sem comentários.
		   - O Índice (📑 Índice) e os botões de PARTE 1 / PARTE 2 permanecem 100% ativos!
		*/
		body.modo-relatorio-preview #btn-abrir-painel-acrobat,
		body.modo-relatorio-preview #painel-acrobat,
		body.modo-relatorio-preview #badge-contador-comentarios,
		body.modo-relatorio-preview #btn-toggle-caneta,
		body.modo-relatorio-preview #btn-toggle-quadrado,
		body.modo-relatorio-preview #btn-toggle-grifar,
		body.modo-relatorio-preview .btn-comentario-flutuante,
		body.modo-relatorio-preview .comment-box-aside,
		body.modo-relatorio-preview .camada-rabiscos-svg {
			display: none !important;
		}

		/* MODO VISUALIZAÇÃO: CENTRALIZADO NA TELA COM ESPAÇAMENTO LATERAL INTERNO */
		body {
			background-color: #f1f5f9;
		}

		/* DOCUMENT CONTAINER NO MODO SALVO: CENTRALIZADO NA TELA COM ESPAÇAMENTO LATERAL INTERNO */
		.workspace-wrapper {
			display: flex;
			justify-content: center; /* Centralizado na tela para monitores widescreen / duplos */
			padding: 25px 25px 80px 25px;
			box-sizing: border-box;
			min-width: 1250px;
			position: relative;
		}
		.wrapper-parte {
			width: 100%;
			display: flex;
			justify-content: center;
		}
		/* ITENS DE SÉRIE COMPARATIVO NO RELATÓRIO */
		.table-responsive {
			width: 100%;
			overflow-x: auto;
			margin-top: 15px;
			border: 1px solid #e0e0e0;
			border-radius: 8px;
			box-shadow: 0 4px 12px rgba(0,0,0,0.03);
			background-color: #ffffff;
		}
		.resumo-table {
			width: 100%;
			border-collapse: collapse;
			text-align: left;
			font-size: 9.5pt;
			background-color: #ffffff;
		}
		.resumo-table th {
			background-color: #2e7d32;
			color: #ffffff;
			font-weight: 600;
			padding: 10px 14px;
			border-bottom: 3px solid #f57c00;
			text-transform: uppercase;
			font-size: 10pt;
			letter-spacing: 0.5px;
			min-width: 150px;
		}
		.resumo-table th:first-child {
			min-width: 250px;
			background-color: #1b5e20;
		}
		.resumo-table td {
			padding: 10px 14px;
			border-bottom: 1px solid #e0e0e0;
			vertical-align: middle;
		}
		.resumo-table tbody tr:nth-child(even) {
			background-color: #fcfdfc;
		}
		.resumo-table tbody tr:hover {
			background-color: #f1f8f1;
		}
		.status-badge {
			display: inline-flex;
			flex-direction: column;
			align-items: center;
			padding: 4px 10px;
			border-radius: 12px;
			font-size: 8.5pt;
			font-weight: 700;
			color: #ffffff;
			box-shadow: 0 1px 3px rgba(0,0,0,0.1);
		}
		.status-badge.s { background-color: #2e7d32; }
		.status-badge.o { background-color: #f57c00; }
		.status-badge.n { background-color: #9e9e9e; }
		.badge-details {
			font-size: 8pt;
			color: #555;
			margin-top: 2px;
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
			margin: 0 auto;
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
		#btn-comentario-flutuante, .btn-comentario-flutuante {
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
		.comment-box-aside.card-desenho {
			border-left-color: #dc2626;
		}
		.comment-box-aside.card-desenho::before {
			border-right-color: #dc2626;
		}

		/* CAMADA DE RABISCOS VETORIAIS (SVG) */
		.camada-rabiscos-svg {
			position: absolute;
			top: 0;
			left: 0;
			width: 100%;
			height: 100%;
			pointer-events: none;
			z-index: 550;
			overflow: visible;
		}
		.modo-caneta-ativo .camada-rabiscos-svg {
			pointer-events: auto !important;
			cursor: crosshair !important;
		}
		.modo-caneta-ativo #document-container {
			user-select: none;
			-webkit-user-select: none;
		}
		.traco-rabisco {
			pointer-events: stroke;
			cursor: pointer;
			transition: stroke 0.15s, opacity 0.2s, filter 0.15s;
		}
		.traco-rabisco.forma-grifo {
			pointer-events: all;
			fill: rgba(239, 68, 68, 0.35) !important;
			stroke: rgba(220, 38, 38, 0.5) !important;
			stroke-width: 1px !important;
			mix-blend-mode: multiply;
		}
		.traco-rabisco.forma-grifo:hover {
			fill: rgba(239, 68, 68, 0.52) !important;
			stroke: #dc2626 !important;
			filter: drop-shadow(0 0 4px rgba(220, 38, 38, 0.6));
		}
		.traco-rabisco.forma-grifo.status-resolvido {
			fill: rgba(34, 197, 94, 0.25) !important;
			stroke: rgba(34, 197, 94, 0.6) !important;
		}
		.traco-rabisco:hover {
			stroke: #b91c1c !important;
			filter: drop-shadow(0 0 5px rgba(220, 38, 38, 0.7));
		}
		.traco-rabisco.status-resolvido {
			opacity: 0.45;
			stroke-dasharray: 6 3;
		}
		path.pulse-target, rect.pulse-target {
			stroke: #f59e0b !important;
			stroke-width: 9 !important;
			filter: drop-shadow(0 0 8px rgba(245, 158, 11, 0.8));
			animation: pulseStrokeAnim 1.8s ease;
		}
		@keyframes pulseStrokeAnim {
			0% { stroke: #dc2626; stroke-width: 6.67; }
			30% { stroke: #f59e0b; stroke-width: 10; }
			60% { stroke: #dc2626; stroke-width: 7; }
			80% { stroke: #f59e0b; stroke-width: 9; }
			100% { stroke: #dc2626; stroke-width: 6.67; }
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
		.painel-acrobat-item.item-desenho {
			border-left-color: #dc2626;
		}
		.painel-acrobat-item.item-desenho.resolvido {
			border-left-color: #10b981;
		}
		.painel-acrobat-item.item-desenho .painel-acrobat-item-secao {
			color: #dc2626;
		}
		body.modo-caneta-ativo .traco-rabisco {
			cursor: crosshair !important;
		}
		/* Botão na borda direita para reabrir painel quando recolhido (centralizado verticalmente) */
		#btn-abrir-painel-acrobat {
			position: fixed;
			right: 0;
			top: 50%;
			transform: translateY(-50%);
			background: #2563eb;
			color: #ffffff;
			border: none;
			padding: 10px 14px 10px 12px;
			border-radius: 8px 0 0 8px;
			box-shadow: -2px 2px 12px rgba(0, 0, 0, 0.2);
			font-size: 11pt;
			font-weight: bold;
			cursor: pointer;
			z-index: 8000;
			display: flex;
			align-items: center;
			gap: 6px;
			transition: background 0.15s, transform 0.15s;
		}
		#btn-abrir-painel-acrobat:hover {
			background: #1d4ed8;
			transform: translateY(-50%) scale(1.04);
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
		/* Botão na borda esquerda para reabrir índice quando recolhido (centralizado verticalmente) */
		#btn-abrir-painel-indice {
			position: fixed;
			left: 0;
			top: 50%;
			transform: translateY(-50%);
			background: #334155;
			color: #ffffff;
			border: none;
			padding: 10px 12px 10px 14px;
			border-radius: 0 8px 8px 0;
			box-shadow: 2px 2px 12px rgba(0, 0, 0, 0.2);
			font-size: 10.5pt;
			font-weight: bold;
			cursor: pointer;
			z-index: 8000;
			display: flex;
			align-items: center;
			gap: 6px;
			transition: background 0.15s, transform 0.15s;
		}
		#btn-abrir-painel-indice:hover {
			background: #1e293b;
			transform: translateY(-50%) scale(1.04);
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
		.path-text-block {
			color: #15803d;
			font-style: italic;
			cursor: pointer;
			display: block;
			margin: 4px 0;
			word-break: break-all;
			white-space: normal;
		}
		.rich-content-box {
			margin-left: 12px;
			margin-top: 2px;
			margin-bottom: 8px;
			line-height: 1.5;
			white-space: pre-wrap;
			word-break: break-word;
		}
		.rich-content-box table {
			white-space: normal;
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
		/* ESTILOS DA TABELA DE ITENS DE SÉRIE & OPCIONAIS NO RELATÓRIO */
		#document-container-itens {
			max-width: 1400px;
			width: 100%;
			margin: 0 auto;
			padding: 20px 30px;
			background: #ffffff;
		}
		#document-container-itens .table-responsive {
			width: 100%;
			overflow-x: auto;
			margin-top: 15px;
			border: 1px solid #e0e0e0;
			border-radius: 8px;
			box-shadow: 0 4px 12px rgba(0,0,0,0.03);
		}
		#document-container-itens .resumo-table {
			width: 100%;
			border-collapse: collapse;
			text-align: left;
			font-size: 0.9em;
			background-color: #ffffff;
		}
		#document-container-itens .resumo-table th {
			background-color: #f57c00 !important;
			color: #ffffff !important;
			font-weight: 700;
			padding: 12px 16px;
			border-bottom: 3px solid #e65100;
			text-transform: uppercase;
			font-size: 1.00em;
			letter-spacing: 0.5px;
			min-width: 150px;
			text-align: center;
		}
		#document-container-itens .resumo-table th:first-child {
			min-width: 250px;
			background-color: #1b5e20 !important;
			text-align: left;
		}
		#document-container-itens .resumo-table td {
			padding: 12px 16px;
			border-bottom: 1px solid #e0e0e0;
			vertical-align: middle;
			text-align: center;
		}
		#document-container-itens .resumo-table td:first-child {
			text-align: left;
			font-weight: 600;
		}
		#document-container-itens .resumo-table tbody tr:nth-child(even) {
			background-color: #fcfdfc;
		}
		#document-container-itens .status-badge {
			display: inline-flex;
			flex-direction: column;
			align-items: center;
			padding: 4px 10px;
			border-radius: 12px;
			font-size: 0.8em;
			font-weight: 700;
			color: #ffffff !important;
			box-shadow: 0 1px 3px rgba(0,0,0,0.1);
		}
		#document-container-itens .status-badge.s {
			background-color: #2e7d32 !important;
		}
		#document-container-itens .status-badge.o {
			background-color: #ef6c00 !important;
		}
		#document-container-itens .status-badge.n {
			background-color: #757575 !important;
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
			.wrapper-parte {
				display: block !important;
				width: 100% !important;
			}
			#wrapper-parte-2, #wrapper-itens-serie {
				page-break-before: always !important;
				break-before: page !important;
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
			.comment-box-aside, .btn-comment-trigger, .btn-comentario-flutuante, #btn-comentario-flutuante, .painel-acrobat, #btn-abrir-painel-acrobat, .painel-indice, #btn-abrir-painel-indice, #btn-toggle-caneta, #btn-toggle-quadrado, #btn-toggle-grifar, .btn-tool-top, .parte-tabs-container {
				display: none !important;
			}
			.camada-rabiscos-svg {
				display: block !important;
				pointer-events: none !important;
			}
		}
	</style>
</head>
<body class="modo-relatorio-preview">
	<div class="toolbar-print no-print">
		<div class="toolbar-row-top">
			${(isSplit || temItensSerie) ? `
			<div class="parte-tabs-container">
				<button type="button" id="btn-tab-parte-1" class="btn-parte-tab ativo" onclick="mudarParteAtiva(1)" title="Visualizar Relatório da Parte 1">${isSplit ? 'PARTE 1' : 'PLANEJAMENTO'}</button>
				${isSplit ? `
				<button type="button" id="btn-tab-parte-2" class="btn-parte-tab" onclick="mudarParteAtiva(2)" title="Visualizar Relatório da Parte 2">PARTE 2</button>
				` : ''}
				${temItensSerie ? `
				<button type="button" id="btn-tab-itens" class="btn-parte-tab" onclick="mudarParteAtiva('itens')" title="Visualizar Itens de Série & Opcionais">ITENS DE SÉRIE & OPCIONAIS</button>
				` : ''}
			</div>
			` : ''}
			<button class="btn-html" onclick="salvarComoHTMLEJson()" title="Salva este relatório integrado em arquivo HTML e faz o download automático do JSON">💾 HTML+JSON</button>
			<button class="btn-print" onclick="salvarPDFEJson()" title="Abre a janela de impressão em PDF e faz o download automático do JSON">🖨️ PDF+JSON</button>
		</div>
		<div class="toolbar-row-bottom">
			<span id="badge-contador-comentarios" class="badge-comentarios-top" onclick="alternarPainelAcrobat()" title="Clique para abrir/fechar o painel de anotações">💬 0 anotações</span>
			<button id="btn-toggle-caneta" class="btn-tool-top" type="button" onclick="alternarModoCaneta()" title="Rabisco Livre (Caneta Vermelha 5pt)">🖊️</button>
			<button id="btn-toggle-quadrado" class="btn-tool-top" type="button" onclick="alternarModoQuadrado()" title="Desenhar Retângulo / Quadrado (Clique e arraste na página)">⬜</button>
			<button id="btn-toggle-grifar" class="btn-tool-top" type="button" onclick="alternarModoGrifar()" title="Grifar Texto (Marca-texto Vermelho Claro - Clique e arraste sobre o texto)">🖍️</button>
		</div>
	</div>

	<div class="workspace-wrapper">
		<div id="wrapper-parte-1" class="wrapper-parte">
			<div class="document-container" id="document-container-1">
				<button id="btn-comentario-flutuante-1" class="btn-comentario-flutuante no-print" type="button" title="Clique para adicionar comentário nesta altura">💬</button>
				<div id="camada-comentarios-1" class="camada-comentarios no-print"></div>
				<svg id="camada-rabiscos-1" class="camada-rabiscos-svg" xmlns="http://www.w3.org/2000/svg"></svg>
				${parte1.corpoDoc}
			</div>
		</div>
		${isSplit ? `
		<div id="wrapper-parte-2" class="wrapper-parte" style="display: none;">
			<div class="document-container" id="document-container-2">
				<button id="btn-comentario-flutuante-2" class="btn-comentario-flutuante no-print" type="button" title="Clique para adicionar comentário nesta altura">💬</button>
				<div id="camada-comentarios-2" class="camada-comentarios no-print"></div>
				<svg id="camada-rabiscos-2" class="camada-rabiscos-svg" xmlns="http://www.w3.org/2000/svg"></svg>
				${parte2.corpoDoc}
			</div>
		</div>
		` : ''}
		${temItensSerie ? `
		<div id="wrapper-itens-serie" class="wrapper-parte" style="display: none;">
			<div class="document-container" id="document-container-itens" style="max-width: 1400px; width: 100%;">
				<button id="btn-comentario-flutuante-itens" class="btn-comentario-flutuante no-print" type="button" title="Clique para adicionar comentário nesta altura">💬</button>
				<div id="camada-comentarios-itens" class="camada-comentarios no-print"></div>
				<svg id="camada-rabiscos-itens" class="camada-rabiscos-svg" xmlns="http://www.w3.org/2000/svg"></svg>
				${htmlItensSerie}
			</div>
		</div>
		` : ''}
	</div>
`;

	html += `
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
		<div id="painel-indice-lista-1" class="painel-indice-lista">
			${parte1.htmlIndiceLista}
		</div>
		${isSplit ? `
		<div id="painel-indice-lista-2" class="painel-indice-lista" style="display: none;">
			${parte2.htmlIndiceLista}
		</div>
		` : ''}
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
${JSON.stringify(dadosFormularioCompleto || {}).replace(/<\/script/gi, '<\\/script')}
	</script>
	<script id="dados-partes-planejamento" type="application/json">
${JSON.stringify(parts).replace(/<\/script/gi, '<\\/script')}
	</script>

	<script>
		const isSplitModo = ${isSplit ? 'true' : 'false'};
		const tituloParte1 = ${JSON.stringify(parte1.tituloDocumento)};
		const tituloParte2 = ${isSplit ? JSON.stringify(parte2.tituloDocumento) : '""'};
		function detectarParteAtivaInicial() {
			if (document.body && document.body.getAttribute('data-parte-salva')) {
				return parseInt(document.body.getAttribute('data-parte-salva'), 10);
			}
			if (!document.getElementById('wrapper-parte-1') && document.getElementById('wrapper-parte-2')) {
				return 2;
			}
			return 1;
		}
		let parteAtiva = detectarParteAtivaInicial();

		let comentariosArmazenados = {};
		const chaveArmazenamentoLocal = 'planejamento_cmt_' + encodeURIComponent((document.title || 'padrao').trim());

		function mudarParteAtiva(num) {
			if (cardEmEdicaoId) {
				salvarComentario(cardEmEdicaoId, true);
			}
			parteAtiva = num;
			const tab1 = document.getElementById('btn-tab-parte-1');
			const tab2 = document.getElementById('btn-tab-parte-2');
			const tabItens = document.getElementById('btn-tab-itens');
			const wrap1 = document.getElementById('wrapper-parte-1');
			const wrap2 = document.getElementById('wrapper-parte-2');
			const wrapItens = document.getElementById('wrapper-itens-serie');
			const ind1 = document.getElementById('painel-indice-lista-1');
			const ind2 = document.getElementById('painel-indice-lista-2');
			const tituloBarra = document.getElementById('titulo-barra-relatorio');

			const isPreview = document.body.classList.contains('modo-relatorio-preview');
			const sufixo = isPreview ? '' : ' (com Comentador)';

			if (num === 1) {
				if (tab1) tab1.classList.add('ativo');
				if (tab2) tab2.classList.remove('ativo');
				if (tabItens) tabItens.classList.remove('ativo');
				if (wrap1) wrap1.style.display = 'flex';
				if (wrap2) wrap2.style.display = 'none';
				if (wrapItens) wrapItens.style.display = 'none';
				if (ind1) ind1.style.display = 'block';
				if (ind2) ind2.style.display = 'none';
				if (tituloBarra) tituloBarra.textContent = tituloParte1 + sufixo;
				document.title = tituloParte1;
			} else if (num === 2) {
				if (tab2) tab2.classList.add('ativo');
				if (tab1) tab1.classList.remove('ativo');
				if (tabItens) tabItens.classList.remove('ativo');
				if (wrap2) wrap2.style.display = 'flex';
				if (wrap1) wrap1.style.display = 'none';
				if (wrapItens) wrapItens.style.display = 'none';
				if (ind2) ind2.style.display = 'block';
				if (ind1) ind1.style.display = 'none';
				if (tituloBarra) tituloBarra.textContent = tituloParte2 + sufixo;
				document.title = tituloParte2;
			} else if (num === 'itens' || num === 3) {
				if (tabItens) tabItens.classList.add('ativo');
				if (tab1) tab1.classList.remove('ativo');
				if (tab2) tab2.classList.remove('ativo');
				if (wrapItens) wrapItens.style.display = 'flex';
				if (wrap1) wrap1.style.display = 'none';
				if (wrap2) wrap2.style.display = 'none';
				if (ind1) ind1.style.display = 'none';
				if (ind2) ind2.style.display = 'none';
				if (tituloBarra) tituloBarra.textContent = 'ITENS DE SÉRIE & OPCIONAIS' + sufixo;
				document.title = 'ITENS DE SÉRIE & OPCIONAIS - ' + tituloParte1;
			}
			atualizarContadorComentarios();
			renderizarPainelAcrobat();
			ajustarPosicoesComentarios();
		}

		function obterDocAtivo() {
			return document.getElementById('document-container-' + parteAtiva) || 
			       document.getElementById('document-container-1') || 
			       document.getElementById('document-container-2') || 
			       document.getElementById('document-container');
		}

		function obterSvgAtivo() {
			return document.getElementById('camada-rabiscos-' + parteAtiva) || 
			       document.getElementById('camada-rabiscos-1') || 
			       document.getElementById('camada-rabiscos-2') || 
			       document.getElementById('camada-rabiscos');
		}

		function obterCamadaComentariosAtiva() {
			return document.getElementById('camada-comentarios-' + parteAtiva) || 
			       document.getElementById('camada-comentarios-1') || 
			       document.getElementById('camada-comentarios-2') || 
			       document.getElementById('camada-comentarios');
		}

		function obterBtnFlutuanteAtivo() {
			return document.getElementById('btn-comentario-flutuante-' + parteAtiva) || 
			       document.getElementById('btn-comentario-flutuante-1') || 
			       document.getElementById('btn-comentario-flutuante-2') || 
			       document.getElementById('btn-comentario-flutuante');
		}

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

		function salvarArquivoHTMLIntegrado() {
			const docClone = document.documentElement.cloneNode(true);
			const cloneBody = docClone.querySelector('body');
			if (cloneBody) {
				// No arquivo baixado, o modo-relatorio-preview é removido para que Caneta, Anotações e Comentários fiquem 100% ativos!
				cloneBody.classList.remove('modo-relatorio-preview', 'modo-preview', 'modo-caneta-ativo');
			}

			// Reseta botões de ferramentas de desenho no clone
			const btnCanetaClone = docClone.querySelector('#btn-toggle-caneta');
			if (btnCanetaClone) {
				btnCanetaClone.classList.remove('ativo');
				btnCanetaClone.innerHTML = '🖊️';
			}
			const btnQuadClone = docClone.querySelector('#btn-toggle-quadrado');
			if (btnQuadClone) {
				btnQuadClone.classList.remove('ativo');
				btnQuadClone.innerHTML = '⬜';
			}
			const btnGrifClone = docClone.querySelector('#btn-toggle-grifar');
			if (btnGrifClone) {
				btnGrifClone.classList.remove('ativo');
				btnGrifClone.innerHTML = '🖍️';
			}

			// Garante que os painéis iniciem recolhidos e com os botões visíveis
			const painelClone = docClone.querySelector('#painel-acrobat');
			if (painelClone) painelClone.classList.add('recolhido');
			const btnAbrirClone = docClone.querySelector('#btn-abrir-painel-acrobat');
			if (btnAbrirClone) btnAbrirClone.style.display = 'flex';
			const painelIndiceClone = docClone.querySelector('#painel-indice');
			if (painelIndiceClone) painelIndiceClone.classList.add('recolhido');
			const btnAbrirIndiceClone = docClone.querySelector('#btn-abrir-painel-indice');
			if (btnAbrirIndiceClone) btnAbrirIndiceClone.style.display = 'flex';

			// No arquivo integrado salvo: se houver 2 partes, ambas são mantidas intactas com seus botões de alternância!
			if (isSplitModo) {
				const w1 = docClone.querySelector('#wrapper-parte-1');
				if (w1) w1.style.display = 'flex';
				const w2 = docClone.querySelector('#wrapper-parte-2');
				if (w2) w2.style.display = 'none';
				const tab1 = docClone.querySelector('#btn-tab-parte-1');
				if (tab1) tab1.classList.add('ativo');
				const tab2 = docClone.querySelector('#btn-tab-parte-2');
				if (tab2) tab2.classList.remove('ativo');
				const ind1 = docClone.querySelector('#painel-indice-lista-1');
				if (ind1) ind1.style.display = 'block';
				const ind2 = docClone.querySelector('#painel-indice-lista-2');
				if (ind2) ind2.style.display = 'none';
			}
			const wItens = docClone.querySelector('#wrapper-itens-serie');
			if (wItens) wItens.style.display = 'none';
			const tabItensClone = docClone.querySelector('#btn-tab-itens');
			if (tabItensClone) tabItensClone.classList.remove('ativo');

			// Obtém nome padronizado do veículo para download
			let nomeVeiculo = 'Planejamento';
			const scriptDadosEl = document.getElementById('dados-formulario-planejamento');
			if (scriptDadosEl) {
				try {
					const data = JSON.parse(scriptDadosEl.textContent.trim());
					if (data.principal && data.principal.veiculo) {
						if (data.principal.veiculo.includes('>')) {
							const partes = data.principal.veiculo.split('>');
							if (partes.length >= 5) {
								const ano = partes[1].trim();
								const modelo = partes[3].trim();
								const motor = partes[4].trim();
								nomeVeiculo = \`Planejamento - \${ano} \${modelo} \${motor}\`;
							}
						} else {
							nomeVeiculo = \`Planejamento - \${data.principal.veiculo}\`;
						}
					}
				} catch(e) {}
			}
			const nomeLimpo = (nomeVeiculo || 'Planejamento').replace(/[\\\\/:*?\"<>|]/g, '').trim();

			const docTitleClone = docClone.querySelector('title');
			if (docTitleClone) docTitleClone.textContent = nomeLimpo;
			const tituloBarra = docClone.querySelector('#titulo-barra-relatorio');
			if (tituloBarra) tituloBarra.textContent = (isSplitModo ? tituloParte1 : nomeLimpo) + ' (com Comentador)';

			// Embute todos os comentários no JSON embutido
			let scriptJson = docClone.querySelector('#dados-comentarios-salvos');
			if (!scriptJson) {
				scriptJson = document.createElement('script');
				scriptJson.id = 'dados-comentarios-salvos';
				scriptJson.type = 'application/json';
				cloneBody.appendChild(scriptJson);
			}
			scriptJson.textContent = JSON.stringify(comentariosArmazenados || {});

			// Limpa camada de comentários dinâmicos para ser reconstruída fresquinha no carregamento
			docClone.querySelectorAll('.camada-comentarios').forEach(c => c.innerHTML = '');
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
			a.download = nomeLimpo + '.html';
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			setTimeout(() => URL.revokeObjectURL(url), 1000);
		}

		function salvarComoHTMLEJson() {
			salvarArquivoHTMLIntegrado();
			setTimeout(() => {
				salvarJSONPlanejamento();
			}, 400);
		}

		function salvarPDFEJson() {
			salvarJSONPlanejamento();
			setTimeout(() => {
				const scriptPartesEl = document.getElementById('dados-partes-planejamento');
				let partesConfig = [];
				if (scriptPartesEl) {
					try {
						partesConfig = JSON.parse(scriptPartesEl.textContent.trim());
					} catch(e) {}
				}
				const scriptDadosEl = document.getElementById('dados-formulario-planejamento');
				let dadosForm = {};
				if (scriptDadosEl) {
					try {
						dadosForm = JSON.parse(scriptDadosEl.textContent.trim());
					} catch(e) {}
				}

				if (window.opener && typeof window.opener.gerarPDFDocumento === 'function') {
					if (partesConfig.length > 1) {
						window.opener.gerarPDFDocumento(partesConfig[0], false, dadosForm);
						setTimeout(() => {
							window.opener.gerarPDFDocumento(partesConfig[1], true, dadosForm);
						}, 600);
					} else if (partesConfig.length === 1) {
						window.opener.gerarPDFDocumento(partesConfig[0], true, dadosForm);
					} else {
						window.print();
					}
				} else {
					window.print();
				}
			}, 350);
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
		let modoCanetaAtivo = false;
		let modoQuadradoAtivo = false;
		let modoGrifarAtivo = false;
		let desenhandoAtual = false;
		let pontoInicial = { x: 0, y: 0 };
		let pontosAtuais = [];
		let caminhoAtualEl = null;

		function alternarModoCaneta() {
			modoCanetaAtivo = !modoCanetaAtivo;
			if (modoCanetaAtivo) {
				modoQuadradoAtivo = false;
				modoGrifarAtivo = false;
			}
			atualizarClassesModosDesenho();
		}

		function alternarModoQuadrado() {
			modoQuadradoAtivo = !modoQuadradoAtivo;
			if (modoQuadradoAtivo) {
				modoCanetaAtivo = false;
				modoGrifarAtivo = false;
			}
			atualizarClassesModosDesenho();
		}

		function alternarModoGrifar() {
			modoGrifarAtivo = !modoGrifarAtivo;
			if (modoGrifarAtivo) {
				modoCanetaAtivo = false;
				modoQuadradoAtivo = false;
			}
			atualizarClassesModosDesenho();
		}

		function desativarModosDesenho() {
			modoCanetaAtivo = false;
			modoQuadradoAtivo = false;
			modoGrifarAtivo = false;
			atualizarClassesModosDesenho();
		}

		function atualizarClassesModosDesenho() {
			const btnCaneta = document.getElementById('btn-toggle-caneta');
			const btnQuadrado = document.getElementById('btn-toggle-quadrado');
			const btnGrifar = document.getElementById('btn-toggle-grifar');
			const btnFlutuante = obterBtnFlutuanteAtivo();

			if (btnCaneta) {
				if (modoCanetaAtivo) {
					btnCaneta.classList.add('ativo');
					btnCaneta.title = 'Caneta Ativa (Clique para desativar)';
				} else {
					btnCaneta.classList.remove('ativo');
					btnCaneta.title = 'Rabisco Livre (Caneta Vermelha 5pt)';
				}
			}

			if (btnQuadrado) {
				if (modoQuadradoAtivo) {
					btnQuadrado.classList.add('ativo');
					btnQuadrado.title = 'Quadrado Ativo (Clique e arraste na página)';
				} else {
					btnQuadrado.classList.remove('ativo');
					btnQuadrado.title = 'Desenhar Retângulo / Quadrado (Clique e arraste)';
				}
			}

			if (btnGrifar) {
				if (modoGrifarAtivo) {
					btnGrifar.classList.add('ativo');
					btnGrifar.title = 'Grifador Ativo (Clique e arraste sobre o texto)';
				} else {
					btnGrifar.classList.remove('ativo');
					btnGrifar.title = 'Grifar Texto (Marca-texto Vermelho Claro)';
				}
			}

			if (modoCanetaAtivo || modoQuadradoAtivo || modoGrifarAtivo) {
				document.body.classList.add('modo-caneta-ativo');
				if (btnFlutuante) btnFlutuante.classList.remove('ativo');
			} else {
				document.body.classList.remove('modo-caneta-ativo');
			}
		}

		function obterCoordenadasSVG(e) {
			const svgEl = (caminhoAtualEl && caminhoAtualEl.ownerSVGElement) || 
			              (e && e.currentTarget && e.currentTarget.tagName && e.currentTarget.tagName.toLowerCase() === 'svg' ? e.currentTarget : obterSvgAtivo());
			if (!svgEl) return { x: 0, y: 0 };
			const rect = svgEl.getBoundingClientRect();
			const clientX = (e.touches && e.touches.length > 0) ? e.touches[0].clientX : e.clientX;
			const clientY = (e.touches && e.touches.length > 0) ? e.touches[0].clientY : e.clientY;
			return {
				x: Math.round(clientX - rect.left),
				y: Math.round(clientY - rect.top)
			};
		}

		function iniciarDesenho(e) {
			if (!modoCanetaAtivo && !modoQuadradoAtivo && !modoGrifarAtivo) return;
			if (e.target && e.target.closest && (e.target.closest('#btn-toggle-caneta') || e.target.closest('#btn-toggle-quadrado') || e.target.closest('#btn-toggle-grifar') || e.target.closest('.toolbar-print') || e.target.closest('.painel-acrobat') || e.target.closest('.painel-indice'))) return;

			let svgEl = (e.currentTarget && e.currentTarget.tagName && e.currentTarget.tagName.toLowerCase() === 'svg') ? e.currentTarget : obterSvgAtivo();
			if (!svgEl) return;

			desenhandoAtual = true;
			const coords = obterCoordenadasSVG(e);
			pontoInicial = coords;

			if (modoCanetaAtivo) {
				pontosAtuais = [coords];
				const rabiscoId = 'rabisco-p' + parteAtiva + '-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
				caminhoAtualEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
				caminhoAtualEl.setAttribute('id', rabiscoId);
				caminhoAtualEl.setAttribute('class', 'traco-rabisco');
				caminhoAtualEl.setAttribute('stroke', '#dc2626');
				caminhoAtualEl.setAttribute('stroke-width', '6.67');
				caminhoAtualEl.setAttribute('stroke-linecap', 'round');
				caminhoAtualEl.setAttribute('stroke-linejoin', 'round');
				caminhoAtualEl.setAttribute('fill', 'none');
				caminhoAtualEl.setAttribute('d', \`M \${coords.x} \${coords.y} L \${coords.x + 0.1} \${coords.y + 0.1}\`);
				caminhoAtualEl.onclick = function(ev) {
					ev.stopPropagation();
					irParaComentario(rabiscoId);
				};
				svgEl.appendChild(caminhoAtualEl);
			} else if (modoQuadradoAtivo) {
				const formaId = 'forma-p' + parteAtiva + '-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
				caminhoAtualEl = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
				caminhoAtualEl.setAttribute('id', formaId);
				caminhoAtualEl.setAttribute('class', 'traco-rabisco forma-retangulo');
				caminhoAtualEl.setAttribute('stroke', '#dc2626');
				caminhoAtualEl.setAttribute('stroke-width', '6.67');
				caminhoAtualEl.setAttribute('fill', 'transparent');
				caminhoAtualEl.setAttribute('x', coords.x);
				caminhoAtualEl.setAttribute('y', coords.y);
				caminhoAtualEl.setAttribute('width', '1');
				caminhoAtualEl.setAttribute('height', '1');
				caminhoAtualEl.setAttribute('rx', '2');
				caminhoAtualEl.setAttribute('ry', '2');
				caminhoAtualEl.onclick = function(ev) {
					ev.stopPropagation();
					irParaComentario(formaId);
				};
				svgEl.appendChild(caminhoAtualEl);
			} else if (modoGrifarAtivo) {
				const formaId = 'grifo-p' + parteAtiva + '-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
				caminhoAtualEl = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
				caminhoAtualEl.setAttribute('id', formaId);
				caminhoAtualEl.setAttribute('class', 'traco-rabisco forma-grifo');
				caminhoAtualEl.setAttribute('x', coords.x);
				caminhoAtualEl.setAttribute('y', coords.y);
				caminhoAtualEl.setAttribute('width', '1');
				caminhoAtualEl.setAttribute('height', '1');
				caminhoAtualEl.setAttribute('rx', '3');
				caminhoAtualEl.setAttribute('ry', '3');
				caminhoAtualEl.onclick = function(ev) {
					ev.stopPropagation();
					irParaComentario(formaId);
				};
				svgEl.appendChild(caminhoAtualEl);
			}

			if (e.type === 'touchstart' && e.preventDefault) e.preventDefault();
		}

		function desenhar(e) {
			if (!desenhandoAtual || !caminhoAtualEl) return;
			if (e.type === 'touchmove' && e.preventDefault) e.preventDefault();

			const coords = obterCoordenadasSVG(e);

			if (modoCanetaAtivo) {
				pontosAtuais.push(coords);
				let d = \`M \${pontosAtuais[0].x} \${pontosAtuais[0].y}\`;
				for (let i = 1; i < pontosAtuais.length; i++) {
					d += \` L \${pontosAtuais[i].x} \${pontosAtuais[i].y}\`;
				}
				caminhoAtualEl.setAttribute('d', d);
			} else if (modoQuadradoAtivo || modoGrifarAtivo) {
				const x = Math.min(pontoInicial.x, coords.x);
				const y = Math.min(pontoInicial.y, coords.y);
				const width = Math.max(1, Math.abs(coords.x - pontoInicial.x));
				const height = Math.max(1, Math.abs(coords.y - pontoInicial.y));
				caminhoAtualEl.setAttribute('x', x);
				caminhoAtualEl.setAttribute('y', y);
				caminhoAtualEl.setAttribute('width', width);
				caminhoAtualEl.setAttribute('height', height);
			}
		}

		function finalizarDesenho(e) {
			if (!desenhandoAtual || !caminhoAtualEl) return;
			desenhandoAtual = false;

			const targetId = caminhoAtualEl.id;
			const svgEl = (caminhoAtualEl && caminhoAtualEl.ownerSVGElement) || obterSvgAtivo();
			const svgRect = svgEl ? svgEl.getBoundingClientRect() : { top: 0 };
			const pathRect = caminhoAtualEl.getBoundingClientRect();
			const boundingTop = Math.max(0, Math.round(pathRect.top - svgRect.top));

			if (modoCanetaAtivo) {
				const dStr = caminhoAtualEl.getAttribute('d');
				comentariosArmazenados[targetId] = {
					tipo: 'desenho',
					parte: parteAtiva,
					pathId: targetId,
					d: dStr,
					boundingTop: boundingTop,
					autor: obterAutorSalvo() || 'Desenvolvedor',
					data: formatarDataHora(),
					texto: '',
					status: 'pendente'
				};
			} else if (modoQuadradoAtivo) {
				const x = parseFloat(caminhoAtualEl.getAttribute('x')) || 0;
				const y = parseFloat(caminhoAtualEl.getAttribute('y')) || 0;
				const width = parseFloat(caminhoAtualEl.getAttribute('width')) || 1;
				const height = parseFloat(caminhoAtualEl.getAttribute('height')) || 1;

				if (width < 4 && height < 4) {
					caminhoAtualEl.remove();
					caminhoAtualEl = null;
					return;
				}

				comentariosArmazenados[targetId] = {
					tipo: 'retangulo',
					parte: parteAtiva,
					formaId: targetId,
					x: x,
					y: y,
					width: width,
					height: height,
					boundingTop: boundingTop,
					autor: obterAutorSalvo() || 'Desenvolvedor',
					data: formatarDataHora(),
					texto: '',
					status: 'pendente'
				};
			} else if (modoGrifarAtivo) {
				const x = parseFloat(caminhoAtualEl.getAttribute('x')) || 0;
				const y = parseFloat(caminhoAtualEl.getAttribute('y')) || 0;
				const width = parseFloat(caminhoAtualEl.getAttribute('width')) || 1;
				const height = parseFloat(caminhoAtualEl.getAttribute('height')) || 1;

				if (width < 4 && height < 4) {
					caminhoAtualEl.remove();
					caminhoAtualEl = null;
					return;
				}

				comentariosArmazenados[targetId] = {
					tipo: 'grifo',
					parte: parteAtiva,
					formaId: targetId,
					x: x,
					y: y,
					width: width,
					height: height,
					boundingTop: boundingTop,
					autor: obterAutorSalvo() || 'Desenvolvedor',
					data: formatarDataHora(),
					texto: '',
					status: 'pendente'
				};
			}

			try {
				localStorage.setItem(chaveArmazenamentoLocal, JSON.stringify(comentariosArmazenados));
			} catch(err) {}

			atualizarContadorComentarios();
			renderizarPainelAcrobat();

			// Delay para abrir edição e desativar modo desenho
			setTimeout(() => {
				iniciarEdicaoComentario(targetId, null);
			}, 120);

			pontosAtuais = [];
			caminhoAtualEl = null;
		}

		function iniciarCamadaRabiscos() {
			['camada-rabiscos-1', 'camada-rabiscos-2', 'camada-rabiscos-itens', 'camada-rabiscos'].forEach(svgId => {
				const svgEl = document.getElementById(svgId);
				if (!svgEl) return;

				svgEl.addEventListener('mousedown', (e) => {
					if (!modoCanetaAtivo && !modoQuadradoAtivo && !modoGrifarAtivo) return;
					iniciarDesenho(e);
				});

				svgEl.addEventListener('touchstart', (e) => {
					if (!modoCanetaAtivo && !modoQuadradoAtivo && !modoGrifarAtivo) return;
					iniciarDesenho(e);
				}, { passive: false });
			});

			window.addEventListener('mousemove', (e) => {
				if (!desenhandoAtual) return;
				desenhar(e);
			});

			window.addEventListener('mouseup', (e) => {
				if (!desenhandoAtual) return;
				finalizarDesenho(e);
			});

			window.addEventListener('touchmove', (e) => {
				if (!desenhandoAtual) return;
				desenhar(e);
			}, { passive: false });

			window.addEventListener('touchend', (e) => {
				if (!desenhandoAtual) return;
				finalizarDesenho(e);
			});
		}

		function iniciarSeguidorMouse() {
			document.addEventListener('mousemove', (e) => {
				const btnFlutuante = obterBtnFlutuanteAtivo();
				if (modoCanetaAtivo || modoQuadradoAtivo || modoGrifarAtivo) {
					if (btnFlutuante) btnFlutuante.classList.remove('ativo');
					return;
				}
				const docEl = obterDocAtivo();
				if (!docEl || !btnFlutuante) return;

				const rect = docEl.getBoundingClientRect();
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

			[1, 2, 'itens'].forEach(pNum => {
				const btnFlutuante = document.getElementById('btn-comentario-flutuante-' + pNum);
				if (btnFlutuante) {
					btnFlutuante.onclick = function(e) {
						e.stopPropagation();
						e.preventDefault();
						abrirComentarioNaAltura(alturaMouseAtual);
					};
				}
			});
		}

		function obterElementoMaisProximo(y) {
			const docEl = obterDocAtivo();
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
				'.rich-content-box',
				'.rich-content-box > p',
				'.rich-content-box > div',
				'.chassi-texto-bloco',
				'.card-data-table tr'
			];
			const elementos = docEl.querySelectorAll(seletores.join(', '));
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
				target.id = 'cmt-alvo-p' + parteAtiva + '-' + Math.floor(Math.random() * 100000);
			}
			target.classList.add('commentable-row');

			if (!comentariosArmazenados[target.id]) {
				comentariosArmazenados[target.id] = {
					tipo: 'texto',
					parte: parteAtiva,
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
			if (document.body.classList.contains('modo-relatorio-preview')) {
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
				'.rich-content-box',
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
			iniciarCamadaRabiscos();
			carregarComentariosSalvos();
			window.addEventListener('resize', ajustarPosicoesComentarios);
		}

		function carregarComentariosSalvos() {
			const scriptJson = document.getElementById('dados-comentarios-salvos');
			if (scriptJson && scriptJson.textContent.trim()) {
				try {
					comentariosArmazenados = JSON.parse(scriptJson.textContent.trim());
				} catch(e) {
					console.error('Erro ao ler comentários embutidos:', e);
				}
			}

			try {
				const locais = localStorage.getItem(chaveArmazenamentoLocal);
				if (locais) {
					const parsed = JSON.parse(locais);
					comentariosArmazenados = { ...comentariosArmazenados, ...parsed };
				}
			} catch(e) {}

			for (const targetId in comentariosArmazenados) {
				const cmt = comentariosArmazenados[targetId];
				const pNum = cmt.parte || (targetId.includes('-p2-') ? 2 : 1);
				const svgEl = document.getElementById('camada-rabiscos-' + pNum) || document.getElementById('camada-rabiscos') || document.getElementById('camada-rabiscos-1');
				if (cmt && (cmt.tipo === 'desenho' || targetId.startsWith('rabisco-'))) {
					let path = document.getElementById(targetId);
					if (!path && cmt.d && svgEl) {
						path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
						path.setAttribute('id', targetId);
						path.setAttribute('class', 'traco-rabisco');
						path.setAttribute('stroke', '#dc2626');
						path.setAttribute('stroke-width', '6.67');
						path.setAttribute('stroke-linecap', 'round');
						path.setAttribute('stroke-linejoin', 'round');
						path.setAttribute('fill', 'none');
						path.setAttribute('d', cmt.d);
						svgEl.appendChild(path);
					}
					if (path) {
						path.onclick = function(e) {
							e.stopPropagation();
							irParaComentario(targetId);
						};
						if (cmt.status === 'resolvido' || cmt.status === 'concluido') {
							path.classList.add('status-resolvido');
						} else {
							path.classList.remove('status-resolvido');
						}
					}
				} else if (cmt && (cmt.tipo === 'retangulo' || targetId.startsWith('forma-'))) {
					let rect = document.getElementById(targetId);
					if (!rect && cmt.width && cmt.height && svgEl) {
						rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
						rect.setAttribute('id', targetId);
						rect.setAttribute('class', 'traco-rabisco forma-retangulo');
						rect.setAttribute('stroke', '#dc2626');
						rect.setAttribute('stroke-width', '6.67');
						rect.setAttribute('fill', 'transparent');
						rect.setAttribute('x', cmt.x);
						rect.setAttribute('y', cmt.y);
						rect.setAttribute('width', cmt.width);
						rect.setAttribute('height', cmt.height);
						rect.setAttribute('rx', '2');
						rect.setAttribute('ry', '2');
						svgEl.appendChild(rect);
					}
					if (rect) {
						rect.onclick = function(e) {
							e.stopPropagation();
							irParaComentario(targetId);
						};
						if (cmt.status === 'resolvido' || cmt.status === 'concluido') {
							rect.classList.add('status-resolvido');
						} else {
							rect.classList.remove('status-resolvido');
						}
					}
				} else if (cmt && (cmt.tipo === 'grifo' || targetId.startsWith('grifo-'))) {
					let rect = document.getElementById(targetId);
					if (!rect && cmt.width && cmt.height && svgEl) {
						rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
						rect.setAttribute('id', targetId);
						rect.setAttribute('class', 'traco-rabisco forma-grifo');
						rect.setAttribute('x', cmt.x);
						rect.setAttribute('y', cmt.y);
						rect.setAttribute('width', cmt.width);
						rect.setAttribute('height', cmt.height);
						rect.setAttribute('rx', '3');
						rect.setAttribute('ry', '3');
						svgEl.appendChild(rect);
					}
					if (rect) {
						rect.onclick = function(e) {
							e.stopPropagation();
							irParaComentario(targetId);
						};
						if (cmt.status === 'resolvido' || cmt.status === 'concluido') {
							rect.classList.add('status-resolvido');
						} else {
							rect.classList.remove('status-resolvido');
						}
					}
				}
				if (cmt && (cmt.texto || cmt.tipo === 'desenho' || cmt.tipo === 'retangulo' || cmt.tipo === 'grifo' || targetId.startsWith('rabisco-') || targetId.startsWith('forma-') || targetId.startsWith('grifo-'))) {
					renderizarCardComentario(targetId, cmt);
				}
			}

			atualizarContadorComentarios();
			renderizarPainelAcrobat();
			setTimeout(ajustarPosicoesComentarios, 100);
		}

		function renderizarCardComentario(targetId, dados) {
			const parteDoCard = dados.parte || (document.getElementById(targetId) && document.getElementById(targetId).closest('#wrapper-parte-2') ? 2 : 1) || parteAtiva;
			const camada = document.getElementById('camada-comentarios-' + parteDoCard) || document.getElementById('camada-comentarios') || obterCamadaComentariosAtiva();
			const target = document.getElementById(targetId);
			if (!camada || !target) return;

			if (target.classList) target.classList.add('has-comment');

			let card = document.getElementById('card-cmt-' + targetId);
			if (!card) {
				card = document.createElement('div');
				card.id = 'card-cmt-' + targetId;
				card.setAttribute('data-target-id', targetId);
				camada.appendChild(card);

				card.addEventListener('mouseenter', () => {
					if (target.classList) target.classList.add('focused-target');
				});
				card.addEventListener('mouseleave', () => {
					if (target.classList) target.classList.remove('focused-target');
				});
			} else if (card.parentElement !== camada) {
				camada.appendChild(card);
			}

			// Previne que clique no card propague e feche a si mesmo ou dispare auto-save incorretamente
			card.onclick = function(e) {
				e.stopPropagation();
			};
			card.ondblclick = function(e) {
				e.stopPropagation();
				iniciarEdicaoComentario(targetId, e);
			};

			const isResolvido = (dados.status === 'resolvido' || dados.status === 'concluido');
			const isDesenho = (dados.tipo === 'desenho' || targetId.startsWith('rabisco-'));
			const isRetangulo = (dados.tipo === 'retangulo' || targetId.startsWith('forma-'));
			const isGrifo = (dados.tipo === 'grifo' || targetId.startsWith('grifo-'));
			const isVisual = isDesenho || isRetangulo || isGrifo;

			let tagTipo = '';
			if (isDesenho) {
				tagTipo = '<span style="color: #dc2626; font-weight: bold; margin-left: 4px;">(🖊️ Rabisco)</span>';
			} else if (isRetangulo) {
				tagTipo = '<span style="color: #dc2626; font-weight: bold; margin-left: 4px;">(⬜ Retângulo)</span>';
			} else if (isGrifo) {
				tagTipo = '<span style="color: #dc2626; font-weight: bold; margin-left: 4px;">(🖍️ Grifo)</span>';
			}

			card.className = 'comment-box-aside no-print' + (isVisual ? ' card-desenho' : '') + (isResolvido ? ' status-resolvido' : '');

			card.innerHTML = \`
				<div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
					<div>
						<div style="font-weight: bold; font-size: 10pt; color: #0f172a;">\${dados.autor || 'Desenvolvedor'}</div>
						<div style="font-size: 8pt; color: #64748b;">\${dados.data || ''} \${tagTipo}</div>
					</div>
					<button type="button" class="btn-status-toggle \${isResolvido ? 'resolvido' : 'pendente'}" onclick="event.stopPropagation(); alternarStatusComentario('\${targetId}')" title="Clique para alternar status (Pendente / Concluído)">
						\${isResolvido ? '🟢 Concluído' : '🟡 Pendente'}
					</button>
				</div>
				<div style="font-size: 9.5pt; color: #334155; margin: 8px 0; word-break: break-word; white-space: pre-wrap;">\${dados.texto || '(Sem anotação preenchida)'}</div>
				<div style="display: flex; justify-content: flex-end; gap: 10px; border-top: 1px solid #f1f5f9; padding-top: 6px; font-size: 8.5pt;">
					<button type="button" onclick="event.stopPropagation(); iniciarEdicaoComentario('\${targetId}', event)" style="background: none; border: none; color: #2563eb; cursor: pointer; padding: 0; font-size: 8.5pt;">✏️ Editar</button>
					<button type="button" onclick="event.stopPropagation(); excluirComentario('\${targetId}')" style="background: none; border: none; color: #dc2626; cursor: pointer; padding: 0; font-size: 8.5pt;">🗑️ Excluir</button>
				</div>
			\`;
		}

		function iniciarEdicaoComentario(targetId, event) {
			if (event) {
				event.stopPropagation();
				event.preventDefault();
			}
			// Bloqueia auto-save global por alguns ms para prevenir fechamento acidental por clique fantasma
			window._bloquearAutoSaveTimestamp = Date.now() + 500;

			// Desativa qualquer modo de desenho para que o mouse volte ao cursor normal
			desativarModosDesenho();

			if (cardEmEdicaoId && cardEmEdicaoId !== targetId) {
				salvarComentario(cardEmEdicaoId, true /* autoSave */);
			}
			cardEmEdicaoId = targetId;

			const existente = comentariosArmazenados[targetId] || {};
			const parteCmt = existente.parte || (document.getElementById(targetId) && document.getElementById(targetId).closest('#wrapper-parte-2') ? 2 : 1) || parteAtiva;
			if (isSplitModo && parteAtiva !== parteCmt) {
				mudarParteAtiva(parteCmt);
			}

			const camada = document.getElementById('camada-comentarios-' + parteCmt) || document.getElementById('camada-comentarios') || obterCamadaComentariosAtiva();
			let target = document.getElementById(targetId);

			if (!target && (existente.tipo === 'desenho' || targetId.startsWith('rabisco-'))) {
				const svgEl = document.getElementById('camada-rabiscos-' + parteCmt) || obterSvgAtivo();
				if (svgEl && existente.d) {
					target = document.createElementNS('http://www.w3.org/2000/svg', 'path');
					target.setAttribute('id', targetId);
					target.setAttribute('class', 'traco-rabisco');
					target.setAttribute('stroke', '#dc2626');
					target.setAttribute('stroke-width', '6.67');
					target.setAttribute('stroke-linecap', 'round');
					target.setAttribute('stroke-linejoin', 'round');
					target.setAttribute('fill', 'none');
					target.setAttribute('d', existente.d);
					svgEl.appendChild(target);
				}
			} else if (!target && (existente.tipo === 'retangulo' || targetId.startsWith('forma-'))) {
				const svgEl = document.getElementById('camada-rabiscos-' + parteCmt) || obterSvgAtivo();
				if (svgEl && existente.width && existente.height) {
					target = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
					target.setAttribute('id', targetId);
					target.setAttribute('class', 'traco-rabisco forma-retangulo');
					target.setAttribute('stroke', '#dc2626');
					target.setAttribute('stroke-width', '6.67');
					target.setAttribute('fill', 'transparent');
					target.setAttribute('x', existente.x);
					target.setAttribute('y', existente.y);
					target.setAttribute('width', existente.width);
					target.setAttribute('height', existente.height);
					target.setAttribute('rx', '2');
					target.setAttribute('ry', '2');
					svgEl.appendChild(target);
				}
			} else if (!target && (existente.tipo === 'grifo' || targetId.startsWith('grifo-'))) {
				const svgEl = document.getElementById('camada-rabiscos-' + parteCmt) || obterSvgAtivo();
				if (svgEl && existente.width && existente.height) {
					target = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
					target.setAttribute('id', targetId);
					target.setAttribute('class', 'traco-rabisco forma-grifo');
					target.setAttribute('x', existente.x);
					target.setAttribute('y', existente.y);
					target.setAttribute('width', existente.width);
					target.setAttribute('height', existente.height);
					target.setAttribute('rx', '3');
					target.setAttribute('ry', '3');
					svgEl.appendChild(target);
				}
			}

			let card = document.getElementById('card-cmt-' + targetId);
			if (!card && camada) {
				card = document.createElement('div');
				card.id = 'card-cmt-' + targetId;
				card.setAttribute('data-target-id', targetId);
				camada.appendChild(card);
			} else if (card && camada && card.parentElement !== camada) {
				camada.appendChild(card);
			}

			const autorAtual = existente.autor || obterAutorSalvo() || '';
			let textoAtual = existente.texto || '';
			if (textoAtual === '(Nova anotação)' || textoAtual === '(Sem anotação preenchida)') {
				textoAtual = '';
			}

			const isDesenho = (existente.tipo === 'desenho' || targetId.startsWith('rabisco-'));
			const isRetangulo = (existente.tipo === 'retangulo' || targetId.startsWith('forma-'));
			const isGrifo = (existente.tipo === 'grifo' || targetId.startsWith('grifo-'));
			const isVisual = isDesenho || isRetangulo || isGrifo;

			let tituloEdicao = '💬 Anotação / Dúvida';
			let corTitulo = '#b45309';
			let placeholderTexto = 'Digite sua dúvida ou observação aqui...';
			if (isDesenho) {
				tituloEdicao = '🖊️ Anotação do Rabisco';
				corTitulo = '#dc2626';
				placeholderTexto = 'Digite sua anotação sobre este rabisco...';
			} else if (isRetangulo) {
				tituloEdicao = '⬜ Anotação do Retângulo';
				corTitulo = '#dc2626';
				placeholderTexto = 'Digite sua anotação sobre esta área demarcada...';
			} else if (isGrifo) {
				tituloEdicao = '🖍️ Anotação do Texto Grifado';
				corTitulo = '#dc2626';
				placeholderTexto = 'Digite sua anotação sobre o trecho grifado...';
			}

			if (card) {
				card.className = 'comment-box-aside no-print focused-card' + (isVisual ? ' card-desenho' : '');
				card.onclick = function(e) { e.stopPropagation(); };
				card.onmousedown = function(e) { e.stopPropagation(); };
				card.innerHTML = \`
					<div style="font-weight: bold; font-size: 9.5pt; margin-bottom: 6px; color: \${corTitulo};">
						\${tituloEdicao}
					</div>
					<input type="text" id="input-autor-\${targetId}" onclick="event.stopPropagation()" onmousedown="event.stopPropagation()" placeholder="Seu nome (ex: Gustavo)" value="\${autorAtual}" style="width: 100%; box-sizing: border-box; padding: 5px 8px; margin-bottom: 6px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 9pt;">
					<textarea id="input-texto-\${targetId}" onclick="event.stopPropagation()" onmousedown="event.stopPropagation()" placeholder="\${placeholderTexto}" rows="3" style="width: 100%; box-sizing: border-box; padding: 6px 8px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 9pt; resize: vertical;">\${textoAtual}</textarea>
					<div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px;">
						<button type="button" onclick="event.stopPropagation(); cancelarEdicaoComentario('\${targetId}')" style="background: #f1f5f9; border: 1px solid #cbd5e1; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 8.5pt;">Cancelar</button>
						<button type="button" onclick="event.stopPropagation(); salvarComentario('\${targetId}')" style="background: #2563eb; color: #fff; border: none; padding: 4px 12px; border-radius: 4px; cursor: pointer; font-size: 8.5pt; font-weight: bold;">Salvar</button>
					</div>
				\`;
			}

			ajustarPosicoesComentarios();
			renderizarPainelAcrobat();

			setTimeout(() => {
				const textarea = document.getElementById('input-texto-' + targetId) || document.getElementById('input-sidebar-texto-' + targetId);
				if (textarea) textarea.focus();
			}, 60);
		}

		function salvarComentario(targetId, isAutoSave = false) {
			const inputAutor = document.getElementById('input-autor-' + targetId) || document.getElementById('input-sidebar-autor-' + targetId);
			const inputTexto = document.getElementById('input-texto-' + targetId) || document.getElementById('input-sidebar-texto-' + targetId);
			if (!inputTexto) return;

			let texto = inputTexto.value.trim();
			if (!texto) {
				texto = '(Sem anotação preenchida)';
			}

			const autor = (inputAutor && inputAutor.value.trim()) ? inputAutor.value.trim() : (obterAutorSalvo() || 'Desenvolvedor');
			salvarAutorPadrao(autor);

			const existente = comentariosArmazenados[targetId] || {};
			const parteOriginal = existente.parte || (document.getElementById(targetId) && document.getElementById(targetId).closest('#wrapper-parte-2') ? 2 : 1) || parteAtiva;
			const statusAnterior = existente.status || 'pendente';
			const dataAnterior = existente.data || formatarDataHora();
			const isDesenho = targetId.startsWith('rabisco-') || (existente.tipo === 'desenho');
			const isRetangulo = targetId.startsWith('forma-') || (existente.tipo === 'retangulo');
			const isGrifo = targetId.startsWith('grifo-') || (existente.tipo === 'grifo');
			const isForma = isRetangulo || isGrifo;
			const pathEl = (isDesenho || isForma) ? document.getElementById(targetId) : null;
			const pathD = pathEl && isDesenho ? pathEl.getAttribute('d') : (existente.d || '');
			const rectX = pathEl && isForma ? parseFloat(pathEl.getAttribute('x')) : (existente.x || 0);
			const rectY = pathEl && isForma ? parseFloat(pathEl.getAttribute('y')) : (existente.y || 0);
			const rectW = pathEl && isForma ? parseFloat(pathEl.getAttribute('width')) : (existente.width || 0);
			const rectH = pathEl && isForma ? parseFloat(pathEl.getAttribute('height')) : (existente.height || 0);

			const svgEl = document.getElementById('camada-rabiscos-' + parteOriginal) || document.getElementById('camada-rabiscos') || obterSvgAtivo();
			const svgRect = svgEl ? svgEl.getBoundingClientRect() : { top: 0 };
			const boundingTop = (pathEl && svgEl) ? Math.max(0, Math.round(pathEl.getBoundingClientRect().top - svgRect.top)) : (existente.boundingTop || 0);

			let tipoFinal = 'texto';
			if (isDesenho) tipoFinal = 'desenho';
			else if (isRetangulo) tipoFinal = 'retangulo';
			else if (isGrifo) tipoFinal = 'grifo';
			else if (existente.tipo) tipoFinal = existente.tipo;

			comentariosArmazenados[targetId] = {
				tipo: tipoFinal,
				parte: parteOriginal,
				pathId: isDesenho ? targetId : undefined,
				formaId: isForma ? targetId : undefined,
				d: isDesenho ? pathD : undefined,
				x: isForma ? rectX : undefined,
				y: isForma ? rectY : undefined,
				width: isForma ? rectW : undefined,
				height: isForma ? rectH : undefined,
				boundingTop: boundingTop,
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
				if (targetId.startsWith('rabisco-') || targetId.startsWith('forma-') || targetId.startsWith('grifo-') || (existente && (existente.tipo === 'desenho' || existente.tipo === 'retangulo' || existente.tipo === 'grifo'))) {
					const el = document.getElementById(targetId);
					if (el) el.remove();
				}
				delete comentariosArmazenados[targetId];
				try {
					localStorage.setItem(chaveArmazenamentoLocal, JSON.stringify(comentariosArmazenados));
				} catch(e) {}
				const card = document.getElementById('card-cmt-' + targetId);
				if (card) card.remove();
				const target = document.getElementById(targetId);
				if (target && target.classList) target.classList.remove('has-comment', 'focused-target');
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

			// Se for traço de desenho ou forma de retângulo, atualiza estilo visual na página
			const el = document.getElementById(targetId);
			if (el && (el.tagName.toLowerCase() === 'path' || el.tagName.toLowerCase() === 'rect' || el.classList.contains('traco-rabisco'))) {
				if (cmt.status === 'resolvido' || cmt.status === 'concluido') {
					el.classList.add('status-resolvido');
				} else {
					el.classList.remove('status-resolvido');
				}
			}

			renderizarCardComentario(targetId, cmt);
			atualizarContadorComentarios();
			renderizarPainelAcrobat();
		}

		function excluirComentario(targetId) {
			if (!confirm('Deseja excluir esta anotação?')) return;

			if (cardEmEdicaoId === targetId) {
				cardEmEdicaoId = null;
			}

			if (targetId.startsWith('rabisco-') || targetId.startsWith('forma-') || targetId.startsWith('grifo-') || (comentariosArmazenados[targetId] && (comentariosArmazenados[targetId].tipo === 'desenho' || comentariosArmazenados[targetId].tipo === 'retangulo' || comentariosArmazenados[targetId].tipo === 'grifo'))) {
				const el = document.getElementById(targetId);
				if (el) el.remove();
			}

			delete comentariosArmazenados[targetId];
			try {
				localStorage.setItem(chaveArmazenamentoLocal, JSON.stringify(comentariosArmazenados));
			} catch(e) {}

			const card = document.getElementById('card-cmt-' + targetId);
			if (card) card.remove();

			const target = document.getElementById(targetId);
			if (target && target.classList) target.classList.remove('has-comment', 'focused-target');

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
				if (target && target.classList) target.classList.remove('has-comment', 'focused-target');
			}
			[1, 2, 'itens'].forEach(pNum => {
				const svgEl = document.getElementById('camada-rabiscos-' + pNum);
				if (svgEl) svgEl.innerHTML = '';
				const camada = document.getElementById('camada-comentarios-' + pNum);
				if (camada) camada.innerHTML = '';
			});
			const svgElPadrao = document.getElementById('camada-rabiscos');
			if (svgElPadrao) svgElPadrao.innerHTML = '';
			const camadaPadrao = document.getElementById('camada-comentarios');
			if (camadaPadrao) camadaPadrao.innerHTML = '';

			comentariosArmazenados = {};
			try {
				localStorage.removeItem(chaveArmazenamentoLocal);
			} catch(e) {}
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
				listaEl.innerHTML = '<div style="font-size: 9pt; color: #94a3b8; text-align: center; margin-top: 30px; font-style: italic;">Nenhum comentário cadastrado ainda.<br>Passe o mouse na página e clique no balãozinho 💬 para comentar ou use a Caneta 🖊️.</div>';
				return;
			}

			const docEl = obterDocAtivo();
			const docRect = docEl ? docEl.getBoundingClientRect() : { top: 0 };

			const ordenados = ids.map(id => ({ id, data: comentariosArmazenados[id] }))
				.sort((a, b) => {
					const pA = a.data.parte || 1;
					const pB = b.data.parte || 1;
					if (pA !== pB) return pA - pB;
					const elA = document.getElementById(a.id);
					const elB = document.getElementById(b.id);
					const topA = elA ? (elA.getBoundingClientRect().top - docRect.top) : (a.data.boundingTop || 0);
					const topB = elB ? (elB.getBoundingClientRect().top - docRect.top) : (b.data.boundingTop || 0);
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
				const isDesenho = (item.id.startsWith('rabisco-') || cmt.tipo === 'desenho');
				const isRetangulo = (item.id.startsWith('forma-') || cmt.tipo === 'retangulo');
				const isGrifo = (item.id.startsWith('grifo-') || cmt.tipo === 'grifo');
				const isVisual = isDesenho || isRetangulo || isGrifo;

				if (isDesenho) {
					secao = '🖊️ Rabisco / Desenho';
				} else if (isRetangulo) {
					secao = '⬜ Retângulo / Forma';
				} else if (isGrifo) {
					secao = '🖍️ Texto Grifado';
				} else if (target) {
					if (target.classList && target.classList.contains('relatorio-img-container')) {
						secao = 'Imagem do Relatório';
					} else {
						const primeiraLinha = target.innerText ? target.innerText.split('\\n')[0].trim() : '';
						secao = primeiraLinha ? primeiraLinha.substring(0, 36) : 'Elemento do Relatório';
					}
				}
				const isResolvido = (cmt.status === 'resolvido' || cmt.status === 'concluido');
				const badgeParte = (cmt.parte === 'itens') ? \`<span style="background: #fef3c7; color: #b45309; padding: 2px 6px; border-radius: 4px; font-size: 7.5pt; font-weight: bold; margin-left: 6px;">ITENS</span>\` : ((isSplitModo && cmt.parte) ? \`<span style="background: #e0f2fe; color: #0369a1; padding: 2px 6px; border-radius: 4px; font-size: 7.5pt; font-weight: bold; margin-left: 6px;">PARTE \${cmt.parte}</span>\` : '');

				if (cardEmEdicaoId === item.id) {
					const tituloSidebar = isDesenho ? '🖊️ Editando Rabisco' : (isRetangulo ? '⬜ Editando Retângulo' : (isGrifo ? '🖍️ Editando Texto Grifado' : '💬 Editando Anotação'));
					htmlLista += \`
						<div id="item-acrobat-\${item.id}" class="painel-acrobat-item \${isVisual ? 'item-desenho' : ''} focused-card" style="border-left-color: #2563eb; background: #eff6ff;" onclick="event.stopPropagation()">
							<div style="font-weight: bold; font-size: 8.5pt; margin-bottom: 6px; color: \${isVisual ? '#dc2626' : '#2563eb'};">
								\${tituloSidebar}
							</div>
							<input type="text" id="input-sidebar-autor-\${item.id}" placeholder="Seu nome" value="\${cmt.autor || ''}" style="width: 100%; box-sizing: border-box; padding: 4px 6px; margin-bottom: 6px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 8.5pt;" onclick="event.stopPropagation()" onmousedown="event.stopPropagation()">
							<textarea id="input-sidebar-texto-\${item.id}" placeholder="Digite sua anotação..." rows="3" style="width: 100%; box-sizing: border-box; padding: 5px 6px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 8.5pt; resize: vertical;" onclick="event.stopPropagation()" onmousedown="event.stopPropagation()">\${(cmt.texto && cmt.texto !== '(Sem anotação preenchida)' && cmt.texto !== '(Nova anotação)') ? cmt.texto : ''}</textarea>
							<div style="display: flex; justify-content: flex-end; gap: 6px; margin-top: 6px;">
								<button type="button" onclick="event.stopPropagation(); cancelarEdicaoComentario('\${item.id}')" style="background: #fff; border: 1px solid #cbd5e1; padding: 3px 8px; border-radius: 4px; cursor: pointer; font-size: 8pt;">Cancelar</button>
								<button type="button" onclick="event.stopPropagation(); salvarComentario('\${item.id}')" style="background: #2563eb; color: #fff; border: none; padding: 3px 10px; border-radius: 4px; cursor: pointer; font-size: 8pt; font-weight: bold;">Salvar</button>
							</div>
						</div>
					\`;
				} else {
					htmlLista += \`
						<div id="item-acrobat-\${item.id}" class="painel-acrobat-item \${isResolvido ? 'resolvido' : ''} \${isVisual ? 'item-desenho' : ''}" onclick="irParaComentario('\${item.id}')" ondblclick="event.stopPropagation(); iniciarEdicaoComentario('\${item.id}', event)">
							<div class="painel-acrobat-item-header">
								<div>
									<span class="painel-acrobat-item-autor">\${cmt.autor || 'Desenvolvedor'}</span>
									\${badgeParte}
								</div>
								<span class="painel-acrobat-item-data">\${cmt.data || ''}</span>
							</div>
							<div class="painel-acrobat-item-secao">📍 \${secao}</div>
							<div class="painel-acrobat-item-texto">\${cmt.texto || '(Sem anotação preenchida)'}</div>
							<div style="margin-top: 6px; font-size: 8pt; display: flex; justify-content: space-between; align-items: center;">
								<button type="button" class="btn-status-toggle \${isResolvido ? 'resolvido' : 'pendente'}" onclick="event.stopPropagation(); alternarStatusComentario('\${item.id}')" title="Clique para alternar status (Pendente / Concluído)">
									\${isResolvido ? '🟢 Concluído' : '🟡 Pendente'}
								</button>
								<div style="display: flex; gap: 8px; align-items: center;">
									<button type="button" onclick="event.stopPropagation(); iniciarEdicaoComentario('\${item.id}', event)" title="Editar anotação" style="background: none; border: none; color: #2563eb; cursor: pointer; padding: 0 4px; font-size: 8.5pt;">✏️ Editar</button>
									<span style="color: #2563eb; font-size: 7.5pt;">Ir ➔</span>
									<button type="button" onclick="event.stopPropagation(); excluirComentario('\${item.id}')" title="Excluir este comentário" style="background: none; border: none; color: #dc2626; cursor: pointer; padding: 0 4px; font-size: 9.5pt;">🗑️</button>
								</div>
							</div>
						</div>
					\`;
				}
			});

			listaEl.innerHTML = htmlLista;
		}

		function irParaComentario(targetId) {
			const cmt = comentariosArmazenados[targetId];
			const el = document.getElementById(targetId);
			const parteCmt = (cmt && cmt.parte) || (el && el.closest('#wrapper-itens-serie') ? 'itens' : (el && el.closest('#wrapper-parte-2') ? 2 : 1)) || 1;
			if (parteAtiva !== parteCmt) {
				mudarParteAtiva(parteCmt);
			}

			setTimeout(() => {
				const target = document.getElementById(targetId);
				if (!target) return;

				if (target.scrollIntoView) {
					target.scrollIntoView({ behavior: 'smooth', block: 'center' });
				}

				target.classList.add('pulse-target');
				setTimeout(() => target.classList.remove('pulse-target'), 2500);

				const card = document.getElementById('card-cmt-' + targetId);
				if (card) {
					card.classList.add('focused-card');
					setTimeout(() => card.classList.remove('focused-card'), 2500);
				}
			}, 80);
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

		function irParaElementoIndice(elementId, parteNum) {
			if (isSplitModo && parteNum && parteAtiva !== parteNum) {
				mudarParteAtiva(parteNum);
			}
			setTimeout(() => {
				const el = document.getElementById(elementId);
				if (!el) return;
				el.scrollIntoView({ behavior: 'smooth', block: 'center' });
				el.classList.add('pulse-target');
				setTimeout(() => el.classList.remove('pulse-target'), 2500);
			}, 80);
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
			if (!document.body.contains(e.target)) return;

			// Ignora auto-save se estiver dentro do intervalo de proteção contra clique duplo/propagação
			if (window._bloquearAutoSaveTimestamp && Date.now() < window._bloquearAutoSaveTimestamp) {
				return;
			}

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

			// 3. Salvar card de comentário aberto em edição se clicar fora do card e fora do item da barra lateral
			if (cardEmEdicaoId) {
				const cardAtivo = document.getElementById('card-cmt-' + cardEmEdicaoId);
				const itemSidebarAtivo = document.getElementById('item-acrobat-' + cardEmEdicaoId);
				const btnFlutuante = obterBtnFlutuanteAtivo();

				const clicouNoCard = cardAtivo && cardAtivo.contains(e.target);
				const clicouNoSidebarItem = itemSidebarAtivo && itemSidebarAtivo.contains(e.target);
				const clicouNoFlutuante = btnFlutuante && btnFlutuante.contains(e.target);
				const clicouEmControle = e.target.closest('.btn-comentario-flutuante') || e.target.closest('.btn-parte-tab') || e.target.closest('.btn-status-toggle');

				if (!clicouNoCard && !clicouNoSidebarItem && !clicouNoFlutuante && !clicouEmControle) {
					salvarComentario(cardEmEdicaoId, true /* autoSave */);
				}
			}
		});

		function ajustarPosicoesComentarios() {
			if (isSplitModo || document.getElementById('wrapper-itens-serie')) {
				[1, 2, 'itens'].forEach(pNum => {
					const docEl = document.getElementById('document-container-' + pNum);
					if (!docEl) return;
					const docRect = docEl.getBoundingClientRect();
					const camada = document.getElementById('camada-comentarios-' + pNum);
					if (!camada) return;

					const cards = Array.from(camada.querySelectorAll('.comment-box-aside'))
						.filter(card => {
							const targetId = card.getAttribute('data-target-id');
							return document.getElementById(targetId) !== null || (comentariosArmazenados[targetId] !== undefined);
						})
						.sort((a, b) => {
							const idA = a.getAttribute('data-target-id');
							const idB = b.getAttribute('data-target-id');
							const targetA = document.getElementById(idA);
							const targetB = document.getElementById(idB);
							const cmtA = comentariosArmazenados[idA];
							const cmtB = comentariosArmazenados[idB];
							const topA = targetA ? (targetA.getBoundingClientRect().top - docRect.top) : ((cmtA && cmtA.boundingTop) || 0);
							const topB = targetB ? (targetB.getBoundingClientRect().top - docRect.top) : ((cmtB && cmtB.boundingTop) || 0);
							return topA - topB;
						});

					let proximoTopMinimo = 0;
					cards.forEach(card => {
						const targetId = card.getAttribute('data-target-id');
						const target = document.getElementById(targetId);
						const cmt = comentariosArmazenados[targetId];
						if (!target && !cmt) return;

						const targetTop = target ? (target.getBoundingClientRect().top - docRect.top) : ((cmt && cmt.boundingTop) || 0);
						const topFinal = Math.max(targetTop - 2, proximoTopMinimo);
						card.style.top = topFinal + 'px';
						proximoTopMinimo = topFinal + card.offsetHeight + 14;
					});
				});
			} else {
				const docEl = document.getElementById('document-container') || document.getElementById('document-container-1');
				if (!docEl) return;
				const docRect = docEl.getBoundingClientRect();
				const camada = document.getElementById('camada-comentarios') || document.getElementById('camada-comentarios-1');
				if (!camada) return;

				const cards = Array.from(camada.querySelectorAll('.comment-box-aside'))
					.filter(card => {
						const targetId = card.getAttribute('data-target-id');
						return document.getElementById(targetId) !== null || (comentariosArmazenados[targetId] !== undefined);
					})
					.sort((a, b) => {
						const idA = a.getAttribute('data-target-id');
						const idB = b.getAttribute('data-target-id');
						const targetA = document.getElementById(idA);
						const targetB = document.getElementById(idB);
						const cmtA = comentariosArmazenados[idA];
						const cmtB = comentariosArmazenados[idB];
						const topA = targetA ? (targetA.getBoundingClientRect().top - docRect.top) : ((cmtA && cmtA.boundingTop) || 0);
						const topB = targetB ? (targetB.getBoundingClientRect().top - docRect.top) : ((cmtB && cmtB.boundingTop) || 0);
						return topA - topB;
					});

				let proximoTopMinimo = 0;
				cards.forEach(card => {
					const targetId = card.getAttribute('data-target-id');
					const target = document.getElementById(targetId);
					const cmt = comentariosArmazenados[targetId];
					if (!target && !cmt) return;

					const targetTop = target ? (target.getBoundingClientRect().top - docRect.top) : ((cmt && cmt.boundingTop) || 0);
					const topFinal = Math.max(targetTop - 2, proximoTopMinimo);
					card.style.top = topFinal + 'px';
					proximoTopMinimo = topFinal + card.offsetHeight + 14;
				});
			}
		}

		function salvarComoArquivoHTML() {
			salvarComoHTMLEJson();
		}

		function copiarCaminho(elemento, event) {
			if (event && event.target && (event.target.classList.contains('btn-comentario-flutuante') || event.target.closest('.btn-comentario-flutuante') || event.target.closest('.comment-box-aside') || event.target.closest('.btn-comment-trigger'))) {
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
