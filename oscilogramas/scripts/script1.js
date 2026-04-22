let sistemasData = [];
let paginaAtual = 0;

let veiculosAplicaveisData = [];
let veiculoAplicavelAtual = 0;
let currentEditableElement = null;
let targetVeiculoIndexParaCopia = null;

function formatText(command, value = null) {
	if (currentEditableElement) {
		currentEditableElement.focus();
		document.execCommand(command, false, value);
	}
}

function formatTextColor(color) {
	formatText('foreColor', color);
}

function positionToolbar() {
	const toolbar = document.getElementById('text-editor-toolbar');
	if (toolbar) {
		if (currentEditableElement) {
			const rect = currentEditableElement.getBoundingClientRect();
			const topPosition = rect.top + window.scrollY;
			const leftPosition = rect.left + window.scrollX - 45 - 15;
			toolbar.style.left = `${leftPosition}px`;
			toolbar.style.top = `${topPosition}px`;
			toolbar.style.display = 'flex';
		} else {
			toolbar.style.display = 'none';
		}
	}
}

document.addEventListener('focusin', (e) => {
	if (e.target && e.target.classList.contains('editable-content')) {
		if (currentEditableElement !== e.target) {
			currentEditableElement = e.target;
			positionToolbar();
		}
	} else {
		const toolbar = document.getElementById('text-editor-toolbar');
		if (toolbar && !toolbar.contains(e.target)) {
			currentEditableElement = null;
			positionToolbar();
		}
	}
});

document.addEventListener('focusout', (e) => {
	const toolbar = document.getElementById('text-editor-toolbar');
	setTimeout(() => {
		const isFocusInsideToolbar = toolbar && toolbar.contains(document.activeElement);
		const isFocusInsideEditableContent = document.activeElement && document.activeElement.classList.contains('editable-content');
		
		if (!isFocusInsideToolbar && !isFocusInsideEditableContent) {
			currentEditableElement = null;
			positionToolbar();
		}
	}, 100);
});

window.addEventListener('scroll', positionToolbar);
window.addEventListener('resize', positionToolbar);

function setupEditableContent(elementId) {
	const element = document.getElementById(elementId);
	if (!element) return;

	updateEditablePlaceholder(element);
	autoResizeEditableContent(element);

	element.addEventListener('input', () => {
		updateEditablePlaceholder(element);
		autoResizeEditableContent(element);
		if (element.oninput) {
			element.oninput();
		}
	});

	element.addEventListener('paste', async function (e) {
		e.preventDefault();

		const clipboardData = e.clipboardData || window.clipboardData;
		let contentInserted = false;

		if (clipboardData.files.length > 0) {
			const file = clipboardData.files[0];
			if (file.type.indexOf('image') !== -1) {
				await processarArquivo(element, file);
				contentInserted = true;
			}
		}

		if (!contentInserted) {
			const text = clipboardData.getData('text/plain');

			if (text) {
				const pathRegex = /((?:[A-Z]:\\|\\\\)[^\n\r]+)/g;
				const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)/g;
				let newContent = text;

				if (text.match(pathRegex)) {
					newContent = text.replace(pathRegex, (path) => {
						const sanitized = path.trim();
						return `<a href="${sanitized}" title="${sanitized}" target="_blank" style="color: green;">PASTA</a>`;
					});
				} else if (text.match(urlRegex)) {
					newContent = text.replace(urlRegex, (url) => {
						const fullUrl = url.startsWith('http') ? url : `http://${url}`;
						return `<a href="${fullUrl}" title="${fullUrl}" target="_blank" style="color: blue;">LINK</a>`;
					});
				}

				document.execCommand('insertHTML', false, newContent);
				contentInserted = true;
			}
		}

		if (element.oninput) {
			element.oninput();
		}
	});
}

function atualizarVisibilidadeDadosCardAplicaveis() {
	const card = document.getElementById('dados-card-aplicaveis');
	const container = document.getElementById('veiculos-aplicaveis-container');
	if (!card || !container) return;
	const temBlocoVisivel = (container.innerHTML || '').trim().length > 0;
	const temVeiculos = Array.isArray(veiculosAplicaveisData) && veiculosAplicaveisData.length > 0;
	card.style.display = (temVeiculos && temBlocoVisivel) ? 'block' : 'none';
}

function extrairTooltipVeiculo(veiculoStr) {
	if (!veiculoStr || typeof veiculoStr !== 'string') return '';
	if (veiculoStr.includes('>')) {
		const partes = veiculoStr.split('>');
		if (partes.length >= 5) {
			const ano = partes[1].trim();
			const modelo = partes[3].trim();
			const motor = partes[4].trim();
			return `${ano} ${modelo} ${motor}`;
		}
	}
	return veiculoStr;
}

function alternarAbas(aba) {
	const abaPrincipal = document.getElementById('aba-principal');
	const abaAplicaveis = document.getElementById('aba-aplicaveis');
	const btnPrincipal = document.getElementById('btn-principal');
	const btnAplicaveis = document.getElementById('btn-aplicaveis');
	const abaTitulo = document.getElementById('aba-titulo');
	const body = document.body;

	if (aba === 'principal') {
		abaPrincipal.style.display = 'block';
		abaAplicaveis.style.display = 'none';
		btnPrincipal.classList.add('active');
		btnAplicaveis.classList.remove('active');
		abaTitulo.textContent = 'VEÍCULO PRINCIPAL';
		body.style.backgroundColor = '#d7fcd7';
	} else {
		abaPrincipal.style.display = 'none';
		abaAplicaveis.style.display = 'block';
		btnPrincipal.classList.remove('active');
		btnAplicaveis.classList.add('active');
		abaTitulo.textContent = 'VEÍCULOS APLICÁVEIS';
		body.style.backgroundColor = '#ffffd1';
	}
}

// === VEÍCULO PRINCIPAL: RENDERIZAÇÃO SIMPLIFICADA ===
function renderizarSistema(index) {
	const container = document.getElementById("sistemas-container");
	container.innerHTML = "";
	if (sistemasData.length === 0) return;

	const dados = sistemasData[index];
	const div = document.createElement("div");
	div.className = "system-block";
	const idx = index;

	div.innerHTML = `
		<label for="titulo_capitulo_${idx}">Título do capítulo</label>
		<input type="text" id="titulo_capitulo_${idx}" value="${dados.sistema || ''}" placeholder="Ex: Oscilograma do Sensor Rotação" onchange="salvarDadosSistema(${idx})">
		
		<label style="margin-top: 15px;">Descrição geral</label>
		<div class="development-field-container">
			<div contenteditable="true" class="editable-content" id="descricao_capitulo_${idx}" data-field="descricao" oninput="salvarDadosSistema(${idx})" data-placeholder="Insira a descrição, imagens, links ou anexos aqui...">${dados.descricao || ''}</div>
			<button type="button" class="btn-anexar" onclick="abrirSeletorArquivo('descricao_capitulo_${idx}')">Anexar</button>
			<input type="file" id="file_descricao_capitulo_${idx}" class="file-input-hidden" multiple accept="image/*,.pdf,.doc,.docx,.txt,.csv,.xls,.xlsx,.ppt,.pptx" onchange="processarArquivosSelecionados('descricao_capitulo_${idx}', this.files)">
		</div>
	`;

	container.appendChild(div);

	setupDragAndDrop(`descricao_capitulo_${idx}`);
	setupEditableContent(`descricao_capitulo_${idx}`);
}

function adicionarSistema() {
	if (sistemasData.length > 0) salvarDadosSistema(paginaAtual);
	sistemasData.push({ sistema: '', descricao: '' });
	renderizarPaginacao();
	mostrarPagina(sistemasData.length - 1);
}

function moverSistema(direcao) {
	if (sistemasData.length < 2) return; 
	const newIndex = paginaAtual + direcao;
	if (newIndex < 0 || newIndex >= sistemasData.length) return;
	salvarDadosSistema(paginaAtual);
	[sistemasData[paginaAtual], sistemasData[newIndex]] = [sistemasData[newIndex], sistemasData[paginaAtual]];
	paginaAtual = newIndex;
	renderizarPaginacao();
	renderizarSistema(paginaAtual);
}

function removerUltimoSistema() {
	if (sistemasData.length === 0) return; 

	const sistemaIndex = paginaAtual; 
	const sistemaRemover = sistemasData[sistemaIndex];
	const tituloCapitulo = sistemaRemover.sistema || `Capítulo ${sistemaIndex + 1}`;

	const confirmModal = document.getElementById('confirm-modal');
	const confirmMessage = document.getElementById('confirm-modal-message');
	const confirmYesBtn = document.getElementById('confirm-modal-yes');
	const confirmNoBtn = document.getElementById('confirm-modal-no');

	confirmMessage.innerHTML = `Deseja excluir o capítulo Nº ${sistemaIndex + 1} (${tituloCapitulo})?`;
	confirmModal.style.display = 'flex'; 

	confirmYesBtn.onclick = null;
	confirmNoBtn.onclick = null;

	confirmYesBtn.onclick = () => {
		confirmModal.style.display = 'none'; 

		sistemasData.splice(sistemaIndex, 1); 

		if (sistemasData.length > 0) {
			paginaAtual = Math.min(sistemaIndex, sistemasData.length - 1); 
			renderizarPaginacao();
			renderizarSistema(paginaAtual);
		} else {
			document.getElementById('sistemas-container').innerHTML = '';
			document.getElementById('paginas-navegacao').innerHTML = '';
			paginaAtual = 0;
		}
	};

	confirmNoBtn.onclick = () => {
		confirmModal.style.display = 'none'; 
	};
}

function mostrarPagina(index) {
	if (index >= 0 && index < sistemasData.length) {
		if (paginaAtual !== undefined && paginaAtual >= 0) salvarDadosSistema(paginaAtual);
		paginaAtual = index;
		renderizarPaginacao();
		renderizarSistema(paginaAtual);
	}
}

function renderizarPaginacao() {
	const paginacaoDiv = document.getElementById("paginas-navegacao");
	paginacaoDiv.innerHTML = "";
	sistemasData.forEach((_, index) => {
		const btn = document.createElement("button");
		btn.type = "button";
		btn.innerText = index + 1;
		btn.onclick = () => {
			salvarDadosSistema(paginaAtual);
			paginaAtual = index;
			renderizarSistema(paginaAtual);
			renderizarPaginacao();
		};
		btn.classList.add("btn-paginacao");
		const tituloCap = sistemasData[index]?.sistema;
		btn.title = tituloCap ? `Capítulo: ${tituloCap}` : `Capítulo ${index + 1}`;
		if (index === paginaAtual) {
			btn.classList.add("active");
		}
		paginacaoDiv.appendChild(btn);
	});
}

function salvarDadosSistema(index) {
	if (index < 0 || index >= sistemasData.length) return;

	const tituloInput = document.getElementById(`titulo_capitulo_${index}`);
	const descricaoContent = document.getElementById(`descricao_capitulo_${index}`);

	sistemasData[index] = {
		sistema: tituloInput ? tituloInput.value : '',
		descricao: descricaoContent ? descricaoContent.innerHTML : ''
	};
	
	renderizarPaginacao();
}

// === VEÍCULOS APLICÁVEIS: RENDERIZAÇÃO SIMPLIFICADA ===
function renderizarPaginacaoVeiculosAplicaveis() {
	const paginacaoDiv = document.getElementById("paginacao-veiculos-aplicaveis");
	paginacaoDiv.innerHTML = "";
	veiculosAplicaveisData.forEach((_, index) => {
		const btn = document.createElement("button");
		btn.type = "button";
		btn.innerText = index + 1;
		btn.onclick = () => mostrarPaginaVeiculoAplicavel(index);
		const veiculoRef = veiculosAplicaveisData[index]?.dadosGerais?.veiculo;
		btn.title = extrairTooltipVeiculo(veiculoRef) || `Veículo ${index + 1}`;
		btn.classList.add("btn-paginacao");
		if (index === veiculoAplicavelAtual) {
			btn.classList.add("active");
		}
		paginacaoDiv.appendChild(btn);
	});
}

function mostrarPaginaVeiculoAplicavel(index) {
	if (index >= 0 && index < veiculosAplicaveisData.length) {
		if(veiculosAplicaveisData.length > 0 && veiculoAplicavelAtual >= 0) {
			salvarDadosVeiculoAplicavel(veiculoAplicavelAtual);
		}
		veiculoAplicavelAtual = index;
		renderizarVeiculoAplicavel(veiculoAplicavelAtual);
		renderizarPaginacaoVeiculosAplicaveis();
	}
}

function criarNovoVeiculoAplicavel() {
	veiculosAplicaveisData.push({
		dadosGerais: {},
		itensSerie: {},
		sistemas: []
	});
	veiculoAplicavelAtual = veiculosAplicaveisData.length - 1;
	renderizarVeiculoAplicavel(veiculoAplicavelAtual);
	renderizarPaginacaoVeiculosAplicaveis();
}

function adicionarVeiculoAplicavel() {
	if (veiculosAplicaveisData.length > 0) {
		salvarDadosVeiculoAplicavel(veiculoAplicavelAtual);
	}
	criarNovoVeiculoAplicavel();
	atualizarVisibilidadeDadosCardAplicaveis();
}

function removerUltimoVeiculoAplicavel() {
	if (veiculosAplicaveisData.length === 0) return; 

	const veiculoIndex = veiculoAplicavelAtual; 
	const veiculoRemover = veiculosAplicaveisData[veiculoIndex];
	const tituloVeiculo = extrairTooltipVeiculo(veiculoRemover.dadosGerais.veiculo) || `Veículo ${veiculoIndex + 1}`;

	const confirmModal = document.getElementById('confirm-modal');
	const confirmMessage = document.getElementById('confirm-modal-message');
	const confirmYesBtn = document.getElementById('confirm-modal-yes');
	const confirmNoBtn = document.getElementById('confirm-modal-no');

	confirmMessage.innerHTML = `Deseja excluir o Veículo Aplicável Nº ${veiculoIndex + 1} (${tituloVeiculo})?`;
	confirmModal.style.display = 'flex'; 

	confirmYesBtn.onclick = null;
	confirmNoBtn.onclick = null;

	confirmYesBtn.onclick = () => {
		confirmModal.style.display = 'none'; 

		veiculosAplicaveisData.splice(veiculoIndex, 1); 

		if (veiculosAplicaveisData.length > 0) {
			veiculoAplicavelAtual = Math.min(veiculoIndex, veiculosAplicaveisData.length - 1);
			renderizarVeiculoAplicavel(veiculoAplicavelAtual);
			renderizarPaginacaoVeiculosAplicaveis();
		} else {
			document.getElementById('veiculos-aplicaveis-container').innerHTML = '';
			document.getElementById('paginacao-veiculos-aplicaveis').innerHTML = '';
			veiculoAplicavelAtual = 0;
		}
		atualizarVisibilidadeDadosCardAplicaveis();
	};

	confirmNoBtn.onclick = () => {
		confirmModal.style.display = 'none';
	};
}

function renderizarVeiculoAplicavel(veiculoIndex) {
	const container = document.getElementById("veiculos-aplicaveis-container");
	container.innerHTML = "";
	if(veiculoIndex < 0 || veiculoIndex >= veiculosAplicaveisData.length) return;
	const veiculo = veiculosAplicaveisData[veiculoIndex];

	const formHtml = `
		<div class="veiculo-aplicavel-block">
			<fieldset>
				<legend>INFORMAÇÕES GERAIS (Veículo ${veiculoIndex + 1})</legend>
				<label for="veiculo_aplicaveis_${veiculoIndex}">Veículo Referência</label>
				<input type="text" id="veiculo_aplicaveis_${veiculoIndex}" value="${veiculo.dadosGerais.veiculo || ''}" placeholder="Car>1994>Mazda>RX-7>1.3 256cv (13B - Wankel)" onchange="salvarDadosVeiculoAplicavel(${veiculoIndex})">
				<div class="id-fields-container">
					<div class="field-group">
						<label for="iddiagramas_aplicaveis_${veiculoIndex}">ID DIAGRAMAS</label>
						<input type="text" id="iddiagramas_aplicaveis_${veiculoIndex}" value="${veiculo.dadosGerais.iddiagramas || ''}" placeholder="'Criar' ou 'ID do livro'" onchange="salvarDadosVeiculoAplicavel(${veiculoIndex})">
					</div>
					<div class="field-group">
						<label for="idfusiveis_aplicaveis_${veiculoIndex}">ID FUSÍVEIS</label>
						<input type="text" id="idfusiveis_aplicaveis_${veiculoIndex}" value="${veiculo.dadosGerais.idfusiveis || ''}" placeholder="'Criar' ou 'ID do livro'" onchange="salvarDadosVeiculoAplicavel(${veiculoIndex})">
					</div>
				</div>
				<label>PASTA DO VEÍCULO</label>
				<div contenteditable="true" class="editable-content" id="pasta_aplicaveis_${veiculoIndex}" data-field="pasta_aplicaveis" oninput="salvarDadosVeiculoAplicavel(${veiculoIndex})" data-placeholder="P:\\Desenvolvimento\\+ DIAGRAMAS...">${veiculo.dadosGerais.pasta || ''}</div>

				<div class="checkbox-blockk"></div>

				<label>ASSOCIAÇÃO / CHASSI</label>
				<div class="checkbox-inline" style="margin-bottom: 10px;" onchange="salvarDadosVeiculoAplicavel(${veiculoIndex})">
					<label><input type="radio" name="aplicacao_chassi_aplicaveis_${veiculoIndex}" value="mesma" ${veiculo.dadosGerais.aplicacao_chassi === 'mesma' ? 'checked' : ''}> Mesma associação</label>
					<label><input type="radio" name="aplicacao_chassi_aplicaveis_${veiculoIndex}" value="ajustar" ${veiculo.dadosGerais.aplicacao_chassi === 'ajustar' ? 'checked' : ''}> Ajustar associação</label>
				</div>
				<textarea id="aplicacao_chassi_texto_aplicaveis_${veiculoIndex}" rows="3" placeholder="Insira aqui a associação e chassis do veículo." style="min-height: auto;" onchange="salvarDadosVeiculoAplicavel(${veiculoIndex})">${veiculo.dadosGerais.aplicacao_chassi_texto || ''}</textarea>

				<div style="margin-bottom: 10px; display: flex; flex-wrap: wrap; justify-content: left;">
					<button type="button" class="orange-button" onclick="window.open('http://192.168.201.220:4000/', '_blank')" style="margin-top: 5px;">Buscar chassi</button>
				</div>
			</fieldset>

			<fieldset>
				<legend>SISTEMAS (Veículo ${veiculoIndex + 1})</legend>
				<div id="sistemas-container-aplicaveis_${veiculoIndex}"></div>
				<div id="paginas-navegacao-aplicaveis_${veiculoIndex}" class="paginas-navegacao"></div>
				<div style="display: flex; gap: 10px; justify-content: center; margin: 10px 0;">
					<button type="button" class="orange-button" onclick="moverSistemaAplicavel(${veiculoIndex}, -1)" title="Mover capítulo para a esquerda">←</button>
					<button type="button" class="orange-button" onclick="moverSistemaAplicavel(${veiculoIndex}, 1)" title="Mover capítulo para a direita">→</button>
				</div>
				<div class="button-group-centered">
					<button class="orange-button" onclick="adicionarSistemaAplicaveis(${veiculoIndex})">➕ Adicionar Capítulo</button>
					<button class="orange-button" onclick="removerUltimoSistemaAplicaveis(${veiculoIndex})">➖ Remover Capítulo Selecionado</button>
					<button type="button" class="orange-button" onclick="abrirModalCopia(${veiculoIndex})">Copiar Capítulo</button>
				</div>
			</fieldset>
		</div>
	`;
	container.innerHTML = formHtml;

	atualizarVisibilidadeDadosCardAplicaveis();

	if (veiculo.sistemas.length > 0) {
		renderizarPaginacaoAplicaveis(veiculoIndex);
		renderizarSistemaAplicaveis(veiculoIndex, veiculo.paginaAtual || 0);
	}
}

function renderizarSistemaAplicaveis(veiculoIndex, sistemaIndex) {
	const container = document.getElementById(`sistemas-container-aplicaveis_${veiculoIndex}`);
	container.innerHTML = "";
	const veiculo = veiculosAplicaveisData[veiculoIndex];
	if(!veiculo.sistemas || sistemaIndex < 0 || sistemaIndex >= veiculo.sistemas.length) return;
	const dados = veiculo.sistemas[sistemaIndex];

	if (!dados) return;

	const div = document.createElement("div");
	div.className = "system-block";

	div.innerHTML = `
		<label for="titulo_capitulo_aplicaveis_${veiculoIndex}_${sistemaIndex}">Título do capítulo</label>
		<input type="text" id="titulo_capitulo_aplicaveis_${veiculoIndex}_${sistemaIndex}" value="${dados.sistema || ''}" placeholder="Ex: Oscilograma do Sensor Rotação" onchange="salvarDadosSistemaAplicaveis(${veiculoIndex}, ${sistemaIndex})">
		
		<label style="margin-top: 15px;">Descrição geral</label>
		<div class="development-field-container">
			<div contenteditable="true" class="editable-content" id="descricao_capitulo_aplicaveis_${veiculoIndex}_${sistemaIndex}" data-field="descricao" oninput="salvarDadosSistemaAplicaveis(${veiculoIndex}, ${sistemaIndex})" data-placeholder="Insira a descrição, imagens, links ou anexos aqui...">${dados.descricao || ''}</div>
			<button type="button" class="btn-anexar" onclick="abrirSeletorArquivo('descricao_capitulo_aplicaveis_${veiculoIndex}_${sistemaIndex}')">Anexar</button>
			<input type="file" id="file_descricao_capitulo_aplicaveis_${veiculoIndex}_${sistemaIndex}" class="file-input-hidden" multiple accept="image/*,.pdf,.doc,.docx,.txt,.csv,.xls,.xlsx,.ppt,.pptx" onchange="processarArquivosSelecionados('descricao_capitulo_aplicaveis_${veiculoIndex}_${sistemaIndex}', this.files)">
		</div>
	`;
	container.appendChild(div);

	setupDragAndDrop(`descricao_capitulo_aplicaveis_${veiculoIndex}_${sistemaIndex}`);
	setupEditableContent(`descricao_capitulo_aplicaveis_${veiculoIndex}_${sistemaIndex}`);
}

function adicionarSistemaAplicaveis(veiculoIndex) {
	const veiculo = veiculosAplicaveisData[veiculoIndex];
	if (veiculo.sistemas.length > 0 && veiculo.paginaAtual >= 0) {
		salvarDadosSistemaAplicaveis(veiculoIndex, veiculo.paginaAtual);
	}
	veiculo.sistemas.push({ sistema: '', descricao: '' });
	veiculo.paginaAtual = veiculo.sistemas.length - 1;
	renderizarPaginacaoAplicaveis(veiculoIndex);
	renderizarSistemaAplicaveis(veiculoIndex, veiculo.paginaAtual);
}

function moverSistemaAplicavel(veiculoIndex, direcao) {
	const veiculo = veiculosAplicaveisData[veiculoIndex];
	if (!veiculo || veiculo.sistemas.length < 2) return;

	const sistemaIndex = veiculo.paginaAtual;
	const newIndex = sistemaIndex + direcao;

	if (newIndex < 0 || newIndex >= veiculo.sistemas.length) return;

	salvarDadosSistemaAplicaveis(veiculoIndex, sistemaIndex);

	[veiculo.sistemas[sistemaIndex], veiculo.sistemas[newIndex]] = [veiculo.sistemas[newIndex], veiculo.sistemas[sistemaIndex]];

	veiculo.paginaAtual = newIndex;

	renderizarPaginacaoAplicaveis(veiculoIndex);
	renderizarSistemaAplicaveis(veiculoIndex, veiculo.paginaAtual);
}

function removerUltimoSistemaAplicaveis(veiculoIndex) {
	const veiculo = veiculosAplicaveisData[veiculoIndex];
	if (!veiculo || veiculo.sistemas.length === 0) return;

	const sistemaIndex = veiculo.paginaAtual; 
	const sistemaRemover = veiculo.sistemas[sistemaIndex];
	const tituloCapitulo = sistemaRemover.sistema || `Capítulo ${sistemaIndex + 1}`;

	const confirmModal = document.getElementById('confirm-modal');
	const confirmMessage = document.getElementById('confirm-modal-message');
	const confirmYesBtn = document.getElementById('confirm-modal-yes');
	const confirmNoBtn = document.getElementById('confirm-modal-no');

	confirmMessage.innerHTML = `Deseja excluir o capítulo Nº ${sistemaIndex + 1} (${tituloCapitulo}) do Veículo Aplicável ${veiculoIndex + 1}?`;
	confirmModal.style.display = 'flex'; 

	confirmYesBtn.onclick = null;
	confirmNoBtn.onclick = null;

	confirmYesBtn.onclick = () => {
		confirmModal.style.display = 'none'; 

		veiculo.sistemas.splice(sistemaIndex, 1); 

		if (veiculo.sistemas.length > 0) {
			veiculo.paginaAtual = Math.min(sistemaIndex, veiculo.sistemas.length - 1);
			renderizarPaginacaoAplicaveis(veiculoIndex);
			renderizarSistemaAplicaveis(veiculoIndex, veiculo.paginaAtual);
		} else {
			document.getElementById(`sistemas-container-aplicaveis_${veiculoIndex}`).innerHTML = '';
			document.getElementById(`paginas-navegacao-aplicaveis_${veiculoIndex}`).innerHTML = '';
			veiculo.paginaAtual = 0;
		}
	};

	confirmNoBtn.onclick = () => {
		confirmModal.style.display = 'none'; 
	};
}

function salvarDadosSistemaAplicaveis(veiculoIndex, sistemaIndex) {
	const veiculo = veiculosAplicaveisData[veiculoIndex];
	if (!veiculo || !veiculo.sistemas[sistemaIndex]) return;

	const tituloInput = document.getElementById(`titulo_capitulo_aplicaveis_${veiculoIndex}_${sistemaIndex}`);
	const descricaoContent = document.getElementById(`descricao_capitulo_aplicaveis_${veiculoIndex}_${sistemaIndex}`);

	veiculo.sistemas[sistemaIndex] = {
		sistema: tituloInput ? tituloInput.value : '',
		descricao: descricaoContent ? descricaoContent.innerHTML : ''
	};
	
	renderizarPaginacaoAplicaveis(veiculoIndex);
}

// === UTILITÁRIOS (ARQUIVOS, IMAGENS, ETC.) ===

function getCaretPosition(element) {
	const selection = window.getSelection();
	if (selection.rangeCount > 0) {
		const range = selection.getRangeAt(0);
		if (element.contains(range.commonAncestorContainer)) {
			return range;
		}
	}
	return null;
}

function insertAtCursor(element, content) {
	const selection = window.getSelection();
	const range = getCaretPosition(element);
	
	if (range) {
		range.deleteContents();
		range.insertNode(content);
		range.collapse(false);
		selection.removeAllRanges();
		selection.addRange(range);
	} else {
		element.appendChild(content);
	}
}

function criarMiniatura(dataUrl, maxWidth = 150, maxHeight = 100) {
	return new Promise((resolve) => {
		const img = new Image();
		img.onload = () => {
			const canvas = document.createElement('canvas');
			const ctx = canvas.getContext('2d');
			
			let { width, height } = img;
			if (width > maxWidth) {
				height = (height * maxWidth) / width;
				width = maxWidth;
			}
			if (height > maxHeight) {
				width = (width * maxHeight) / height;
				height = maxHeight;
			}
			
			canvas.width = width;
			canvas.height = height;
			
			ctx.drawImage(img, 0, 0, width, height);
			
			const thumbnailDataUrl = canvas.toDataURL('image/jpeg', 0.8);
			resolve(thumbnailDataUrl);
		};
		img.src = dataUrl;
	});
}

async function processarArquivo(element, file) {
	const reader = new FileReader();
	reader.onload = async (readerEvent) => {
		const dataUrl = readerEvent.target.result;
		let content;
		
		if (file.type && file.type.startsWith('image/')) {
			const thumbnailDataUrl = await criarMiniatura(dataUrl);
			
			const imgContainer = document.createElement('div');
			imgContainer.className = 'image-container';
			imgContainer.style.display = 'inline-block';
			imgContainer.style.marginTop = '5px';
			imgContainer.style.marginBottom = '5px';
			
			const img = document.createElement('img');
			img.src = thumbnailDataUrl;
			img.style.maxWidth = '150px';
			img.style.maxHeight = '100px';
			img.style.display = 'block';
			img.style.border = '1px solid #ccc';
			img.style.borderRadius = '4px';
			img.style.cursor = 'pointer';
			img.title = `Clique para ver em tamanho real: ${file.name}`;
			
			img.setAttribute('data-original-image', dataUrl);
			img.setAttribute('data-filename', file.name || 'imagem');
			img.setAttribute('data-mime', file.type);
			
			img.addEventListener('click', () => {
				const modal = document.createElement('div');
				modal.style.position = 'fixed';
				modal.style.top = '0';
				modal.style.left = '0';
				modal.style.width = '100%';
				modal.style.height = '100%';
				modal.style.backgroundColor = 'rgba(0,0,0,0.8)';
				modal.style.display = 'flex';
				modal.style.justifyContent = 'center';
				modal.style.alignItems = 'center';
				modal.style.zIndex = '10000';
				modal.style.cursor = 'pointer';
				
				const modalImg = document.createElement('img');
				modalImg.src = dataUrl;
				modalImg.style.maxWidth = '90%';
				modalImg.style.maxHeight = '90%';
				modalImg.style.objectFit = 'contain';
				
				modal.appendChild(modalImg);
				document.body.appendChild(modal);
				
				modal.addEventListener('click', () => {
					document.body.removeChild(modal);
				});
			});
			
			imgContainer.appendChild(img);
			content = imgContainer;
		} else {
			const link = document.createElement('a');
			link.href = dataUrl;
			link.target = '_blank';
			link.download = file.name || 'anexo';
			link.textContent = file.name || 'anexo';
			link.style.display = 'inline-block';
			link.style.marginTop = '5px';
			link.className = 'attachment';
			link.setAttribute('data-filename', file.name || 'anexo');
			if (file.type) link.setAttribute('data-mime', file.type);
			link.contentEditable = 'false';
			content = link;
		}
		
		insertAtCursor(element, content);
		
		const br = document.createElement('br');
		insertAtCursor(element, br);
		
		if (element.oninput) {
			element.oninput();
		}
	};
	reader.readAsDataURL(file);
}

function setupDragAndDrop(elementId) {
	const element = document.getElementById(elementId);
	if (!element) return;

	element.addEventListener('dragover', (e) => {
		e.preventDefault();
		e.stopPropagation();
		element.classList.add('drag-over');
	});

	element.addEventListener('dragleave', (e) => {
		e.stopPropagation();
		element.classList.remove('drag-over');
	});

	element.addEventListener('drop', (e) => {
		e.preventDefault();
		e.stopPropagation();
		element.classList.remove('drag-over');

		const files = e.dataTransfer.files;
		if (files && files.length > 0) {
			for (let i = 0; i < files.length; i++) {
				processarArquivo(element, files[i]);
			}
		}
	});
}

function abrirSeletorArquivo(elementId) {
	const fileInput = document.getElementById(`file_${elementId}`);
	if (fileInput) {
		fileInput.click();
	}
}

function processarArquivosSelecionados(elementId, files) {
	const element = document.getElementById(elementId);
	if (!element || !files) return;
	
	element.focus();
	
	for (let i = 0; i < files.length; i++) {
		processarArquivo(element, files[i]);
	}
	
	const fileInput = document.getElementById(`file_${elementId}`);
	if (fileInput) {
		fileInput.value = '';
	}
}

function updateEditablePlaceholder(element) {
	if (!element) return;
	
	const hasContent = element.innerHTML.trim() !== '';
	if (hasContent) {
		element.classList.remove('empty');
	} else {
		element.classList.add('empty');
	}
}

function autoResizeEditableContent(element) {
	if (!element) return;
	
	element.style.height = 'auto';
	
	const scrollHeight = element.scrollHeight;
	const minHeight = parseInt(window.getComputedStyle(element).minHeight, 10) || 120;
	const newHeight = Math.max(scrollHeight, minHeight);
	
	element.style.height = newHeight + 'px';
}

function getChapterFolderName(veiculo, sistema, capTitulo) {
	const sistemaIndex = sistema && veiculo.sistemas ? veiculo.sistemas.indexOf(sistema) + 1 : 1;
	return `Capítulo ${sistemaIndex} - ${capTitulo}`;
}