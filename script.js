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

function toggleItensSerie(veiculoIndex) {
	const checkbox = document.getElementById(`toggle_itens_serie_${veiculoIndex}`);
	const container = document.getElementById(`container_itens_serie_${veiculoIndex}`);
	if (checkbox && container) {
		container.style.display = checkbox.checked ? 'block' : 'none';
	}
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

function togglePesquisaTexto(type, index) {
	let radioSelector, textareaId;
	if (type === 'principal') {
		radioSelector = 'input[name="pesquisa"]:checked';
		textareaId = 'pesquisa_texto';
	} else {
		radioSelector = `input[name="pesquisa_aplicaveis_${index}"]:checked`;
		textareaId = `pesquisa_texto_aplicaveis_${index}`;
	}

	const radio = document.querySelector(radioSelector);
	const textarea = document.getElementById(textareaId);

	if (radio && textarea) {
		const container = textarea.closest('.editable-container');
		if (container) {
			container.style.display = (radio.value === 'sim') ? 'block' : 'none';
		} else {
			textarea.style.display = (radio.value === 'sim') ? 'block' : 'none';
		}
	}
}

function renderizarFormularioCapitulo(idx) {
	const select = document.getElementById(`sistema_${idx}`);
	const valor = select.value;
	const container = document.getElementById(`formulario-capitulo_${idx}`);
	const dados = sistemasData[idx];

	container.innerHTML = ""; // limpa antes
	if (!valor) return;

	const isCaixasForm = valor === "Fusíveis e Relés";
	const isPaginasForm = valor === "Alimentação Positiva" || valor === "Conectores de Peito" || valor === "Sistema de Carga e Partida";
	const isIluminacaoForm = valor === "Iluminação";
	const isOutroForm = valor === "Outro";
	const isStandardModuleForm = !isCaixasForm && !isPaginasForm && !isIluminacaoForm && !isOutroForm;

	// --- Bloco Comum (Transferência e Páginas Previstas), Aparece para todos, exceto "Caixas" e "Páginas" que têm seu próprio HTML ---
	const commonTransferHtml = `
		<div class="checkbox-block">
			<div class="checkbox-inline" onchange="toggleIdTransfPrincipal(${idx}); togglePaginasPrevistaPrincipal(${idx}); salvarDadosSistema(${idx})">
				<label><input type="radio" name="transferencia_${idx}" value="zero" ${dados.transferencia === 'zero' || !dados.transferencia ? 'checked' : ''}> Fazer do Zero</label>
				<label><input type="radio" name="transferencia_${idx}" value="transferencia" ${dados.transferencia === 'transferencia' ? 'checked' : ''}> Transferência</label>
				<label><input type="radio" name="transferencia_${idx}" value="modificar" ${dados.transferencia === 'modificar' ? 'checked' : ''}> Modificar Publicado</label>
			</div>
		</div>
		<input type="number" id="idtransf_${idx}" name="idtransf_${idx}" placeholder="Informe o ID..." value="${dados.idtransf || ''}" style="display: ${dados.transferencia === 'transferencia' ? 'block' : 'none'}" onchange="salvarDadosSistema(${idx})">
		
		<div data-container-for="paginasprev_${idx}" style="display: ${dados.transferencia === 'modificar' ? 'none' : 'block'}">
			<label>Nº páginas prevista</label>
			<input type="number" name="paginasprev_${idx}" value="${dados.paginasprev || ''}" placeholder="Apenas números" oninput="this.value = this.value.replace(/[^0-9]/g, ''); salvarDadosSistema(${idx})">
		</div>
	`;
	
	// --- Bloco Padrão (Módulo, Nome, Conectores, etc.), Usado pelo "Standard", e condicionalmente por "Iluminação" e "Outro" ---
	const standardModuleHtml = `
		<label>Módulo principal</label>
		<input type="text" name="modulo_${idx}" value="${dados.modulo || ''}" placeholder="UCE do Motor" onchange="salvarDadosSistema(${idx})">

		<label>Nome no material</label>
		<input type="text" name="nomematerial_${idx}" value="${dados.nomematerial || ''}" placeholder="Engine Control Unit" onchange="salvarDadosSistema(${idx})">

		<label>Código de Peça / Link</label>
		<div contenteditable="true" class="editable-content short" id="codmodulo_${idx}" data-field="codmodulo" oninput="salvarDadosSistema(${idx})">${dados.codmodulo || ''}</div>

		<label>Códigos de Conectores</label>
		<textarea name="codconectores_${idx}" rows="3" placeholder="T20 = A / LB = B / T50d = C" onchange="salvarDadosSistema(${idx})">${dados.codconectores || ''}</textarea>
	`;

	// --- Bloco Desenvolvimento Padrão (Loc, Con, Diag) ---
	const standardDevelopmentHtml = `
		<fieldset>
			<legend>DESENVOLVIMENTO</legend>
			<label>Página de Localização</label>
			<div class="development-field-container">
				<div contenteditable="true" class="editable-content" id="pagloc_${idx}" data-field="pagloc" oninput="salvarDadosSistema(${idx})">${dados.pagloc || ''}</div>
				<button type="button" class="btn-anexar" onclick="abrirSeletorArquivo('pagloc_${idx}')">Anexar</button>
				<input type="file" id="file_pagloc_${idx}" class="file-input-hidden" multiple accept="image/*,.pdf,.doc,.docx,.txt,.csv,.xls,.xlsx,.ppt,.pptx" onchange="processarArquivosSelecionados('pagloc_${idx}', this.files)">
			</div>

			<label>Página de Conectores</label>
			<div class="development-field-container">
				<div contenteditable="true" class="editable-content" id="pagcon_${idx}" data-field="pagcon" oninput="salvarDadosSistema(${idx})">${dados.pagcon || ''}</div>
				<button type="button" class="btn-anexar" onclick="abrirSeletorArquivo('pagcon_${idx}')">Anexar</button>
				<input type="file" id="file_pagcon_${idx}" class="file-input-hidden" multiple accept="image/*,.pdf,.doc,.docx,.txt,.csv,.xls,.xlsx,.ppt,.pptx" onchange="processarArquivosSelecionados('pagcon_${idx}', this.files)">
			</div>

			<label>Página de Diagramas</label>
			<div class="development-field-container">
				<div contenteditable="true" class="editable-content" id="pagdiag_${idx}" data-field="pagdiag" oninput="salvarDadosSistema(${idx})">${dados.pagdiag || ''}</div>
				<button type="button" class="btn-anexar" onclick="abrirSeletorArquivo('pagdiag_${idx}')">Anexar</button>
				<input type="file" id="file_pagdiag_${idx}" class="file-input-hidden" multiple accept="image/*,.pdf,.doc,.docx,.txt,.csv,.xls,.xlsx,.ppt,.pptx" onchange="processarArquivosSelecionados('pagdiag_${idx}', this.files)">
			</div>
		</fieldset>
	`;

	// --- Bloco Desenvolvimento "Páginas" (Ex: Alimentação) ---
	const pagesDevelopmentHtml = `
		<fieldset>
			<legend>DESENVOLVIMENTO</legend>
			<div id="dynamic-content-container_${idx}"></div>
			<button type="button" class="btn-adicionar-caixa" onclick="adicionarPagina(${idx})">+ Adicionar Página</button>
		</fieldset>
	`;

	// --- Bloco Desenvolvimento "Caixas" (Ex: Fusíveis) ---
	const caixasDevelopmentHtml = `
		<fieldset>
			<legend>DESENVOLVIMENTO</legend>
			<div id="dynamic-content-container_${idx}"></div>
			<button type="button" class="btn-adicionar-caixa" onclick="adicionarCaixa(${idx})">+ Adicionar Caixa</button>
		</fieldset>
	`;

	if (isCaixasForm) {
         const fusiveisOptionsHtml = `
             <div class="checkbox-blockk"></div>
             <label class="checkbox-title">TIPO DE DEMANDA:</label>
             <div class="checkbox-inline" onchange="salvarDadosSistema(${idx})">
                 <label><input type="radio" name="tipo_fusiveis_${idx}" value="Simplificado" ${dados.tipo_fusiveis === 'Simplificado' || !dados.tipo_fusiveis ? 'checked' : ''}> Simplificado</label>
                 <label><input type="radio" name="tipo_fusiveis_${idx}" value="Completo" ${dados.tipo_fusiveis === 'Completo' ? 'checked' : ''}> Completo</label>
                 <label><input type="radio" name="tipo_fusiveis_${idx}" value="Adicionar tabelas" ${dados.tipo_fusiveis === 'Adicionar tabelas' ? 'checked' : ''}> Adicionar tabelas</label>
             </div>
             <div class="checkbox-blockk"></div>
         `;
		container.innerHTML = commonTransferHtml + fusiveisOptionsHtml + caixasDevelopmentHtml;
		renderizarCaixas(idx);
	} else if (isPaginasForm) {
		container.innerHTML = commonTransferHtml + pagesDevelopmentHtml;
		renderizarPaginas(idx);
	} else if (isIluminacaoForm) {
		container.innerHTML = `
			${commonTransferHtml}
			<div class="checkbox-blockk"></div>
			<label class="checkbox-title">TIPO:</label>
			<div class="checkbox-inline" onchange="salvarDadosSistema(${idx})">
				<label><input type="radio" name="tipo_iluminacao_${idx}" value="interna" ${dados.tipo_iluminacao === 'interna' || !dados.tipo_iluminacao ? 'checked' : ''}> INTERNA</label>
				<label><input type="radio" name="tipo_iluminacao_${idx}" value="externa" ${dados.tipo_iluminacao === 'externa' ? 'checked' : ''}> EXTERNA</label>
				<label><input type="radio" name="tipo_iluminacao_${idx}" value="ambos" ${dados.tipo_iluminacao === 'ambos' ? 'checked' : ''}> AMBOS</label>
			</div>
			<div class="checkbox-blockk"></div>
			<label class="checkbox-title">POSSUI MÓDULO DEDICADO?</label>
			<div class="checkbox-inline" onchange="toggleModuloDedicadoPrincipal(${idx}); salvarDadosSistema(${idx})">
				<label><input type="radio" name="modulo_dedicado_${idx}" value="sim" ${dados.modulo_dedicado === 'sim' ? 'checked' : ''}> SIM</label>
				<label><input type="radio" name="modulo_dedicado_${idx}" value="nao" ${dados.modulo_dedicado === 'nao' || !dados.modulo_dedicado ? 'checked' : ''}> NÃO</label>
			</div>
			
			<div id="standard-module-fields_${idx}" style="display: ${dados.modulo_dedicado === 'sim' ? 'block' : 'none'};">
				${standardModuleHtml}
			</div>
			
			<div id="development-fields_${idx}">
				${dados.modulo_dedicado === 'sim' ? standardDevelopmentHtml : pagesDevelopmentHtml}
			</div>
		`;
		if (dados.modulo_dedicado !== 'sim') {
			renderizarPaginas(idx);
		}
	} else if (isOutroForm) {
		container.innerHTML = `
			${commonTransferHtml}
			<div class="checkbox-blockk"></div>
			<label class="checkbox-title">POSSUI MÓDULO DEDICADO?</label>
			<div class="checkbox-inline" onchange="toggleModuloDedicadoPrincipal(${idx}); salvarDadosSistema(${idx})">
				<label><input type="radio" name="modulo_dedicado_${idx}" value="sim" ${dados.modulo_dedicado === 'sim' ? 'checked' : ''}> SIM</label>
				<label><input type="radio" name="modulo_dedicado_${idx}" value="nao" ${dados.modulo_dedicado === 'nao' || !dados.modulo_dedicado ? 'checked' : ''}> NÃO</label>
			</div>
			
			<div id="standard-module-fields_${idx}" style="display: ${dados.modulo_dedicado === 'sim' ? 'block' : 'none'};">
				${standardModuleHtml}
			</div>
			
			<div id="development-fields_${idx}">
				${dados.modulo_dedicado === 'sim' ? standardDevelopmentHtml : pagesDevelopmentHtml}
			</div>
		`;
		if (dados.modulo_dedicado !== 'sim') {
			renderizarPaginas(idx);
		}
	} else if (isStandardModuleForm) {
		container.innerHTML = commonTransferHtml + standardModuleHtml + standardDevelopmentHtml;
	}
	
	if (dados.modulo_dedicado === 'sim' || isStandardModuleForm) {
		setupDragAndDrop(`pagloc_${idx}`);
		setupEditableContent(`pagloc_${idx}`);
		setupEditableContent(`codmodulo_${idx}`);
		setupDragAndDrop(`pagcon_${idx}`);
		setupEditableContent(`pagcon_${idx}`);
		setupDragAndDrop(`pagdiag_${idx}`);
		setupEditableContent(`pagdiag_${idx}`);
	}
}
 
 function adicionarCaixa(sistemaIndex) {
     const dados = sistemasData[sistemaIndex];
     if (!dados.caixas) dados.caixas = [];
     dados.caixas.push({ nome: '', descricoes: '' });
     renderizarCaixas(sistemaIndex);
 }

 function removerCaixa(sistemaIndex, caixaIndex) {
     sistemasData[sistemaIndex].caixas.splice(caixaIndex, 1);
     renderizarCaixas(sistemaIndex);
 }

 function moverCaixa(sistemaIndex, caixaIndex, direcao) {
     const caixas = sistemasData[sistemaIndex].caixas;
     const newIndex = caixaIndex + direcao;
     if (newIndex < 0 || newIndex >= caixas.length) return;
     const itemMovido = caixas.splice(caixaIndex, 1)[0];
     caixas.splice(newIndex, 0, itemMovido);
     renderizarCaixas(sistemaIndex);
 }

 function renderizarCaixas(sistemaIndex) {
     const container = document.getElementById(`dynamic-content-container_${sistemaIndex}`);
     if (!container) return;
     const caixas = sistemasData[sistemaIndex].caixas || [];
     container.innerHTML = '';
     caixas.forEach((caixa, i) => {
         const descId = `descricoes_${sistemaIndex}_${i}`;
         const caixaDiv = document.createElement('div');
         caixaDiv.className = 'caixa-item';
         caixaDiv.innerHTML = `
             <label for="nome_caixa_${sistemaIndex}_${i}">Nome da Caixa</label>
             <input type="text" id="nome_caixa_${sistemaIndex}_${i}" value="${caixa.nome || ''}" oninput="sistemasData[${sistemaIndex}].caixas[${i}].nome = this.value" placeholder="Ex: Caixa de Fusíveis do Painel">
             <label for="${descId}">Descrições</label>
             <div class="development-field-container">
                 <div contenteditable="true" class="editable-content" id="${descId}" data-placeholder="Insira imagens, documentos ou texto...">${caixa.descricoes || ''}</div>
                 <div class="caixa-actions-column">
                     <button type="button" class="btn-anexar" onclick="abrirSeletorArquivo('${descId}')">Anexar</button>
                     <input type="file" id="file_${descId}" class="file-input-hidden" multiple accept="image/*,.pdf,.doc,.docx,.txt,.csv,.xls,.xlsx,.ppt,.pptx" onchange="processarArquivosSelecionados('${descId}', this.files)">
                     <button type="button" class="btn-remover-caixa" onclick="removerCaixa(${sistemaIndex}, ${i})">- Remover</button>
                     <div class="mover-buttons">
                         <button type="button" class="btn-mover-caixa" onclick="moverCaixa(${sistemaIndex}, ${i}, -1)" title="Mover para cima">▲</button>
                         <button type="button" class="btn-mover-caixa" onclick="moverCaixa(${sistemaIndex}, ${i}, 1)" title="Mover para baixo">▼</button>
                     </div>
                 </div>
             </div>`;
         container.appendChild(caixaDiv);
         const descElement = document.getElementById(descId);
         descElement.oninput = () => { sistemasData[sistemaIndex].caixas[i].descricoes = descElement.innerHTML; };
         setupDragAndDrop(descId);
         setupEditableContent(descId);
     });
 }

function adicionarPagina(sistemaIndex) {
     const dados = sistemasData[sistemaIndex];
     if (!dados.paginas) dados.paginas = [];
     dados.paginas.push({ conteudo: '' });
     renderizarPaginas(sistemaIndex);
 }

 function removerPagina(sistemaIndex, paginaIndex) {
     sistemasData[sistemaIndex].paginas.splice(paginaIndex, 1);
     renderizarPaginas(sistemaIndex);
 }

 function moverPagina(sistemaIndex, paginaIndex, direcao) {
     const paginas = sistemasData[sistemaIndex].paginas;
     const newIndex = paginaIndex + direcao;
     if (newIndex < 0 || newIndex >= paginas.length) return;
     const itemMovido = paginas.splice(paginaIndex, 1)[0];
     paginas.splice(newIndex, 0, itemMovido);
     renderizarPaginas(sistemaIndex);
 }

 function renderizarPaginas(sistemaIndex) {
     const container = document.getElementById(`dynamic-content-container_${sistemaIndex}`);
     if (!container) return;
     const paginas = sistemasData[sistemaIndex].paginas || [];
     container.innerHTML = '';
     paginas.forEach((pagina, i) => {
         const descId = `descricoes_pagina_${sistemaIndex}_${i}`;
         const paginaDiv = document.createElement('div');
         paginaDiv.className = 'caixa-item';
         paginaDiv.innerHTML = `
             <label for="${descId}">Página ${i + 1}</label>
             <div class="development-field-container">
                 <div contenteditable="true" class="editable-content" id="${descId}" data-placeholder="Insira imagens, documentos ou texto...">${pagina.conteudo || ''}</div>
                 <div class="caixa-actions-column">
                     <button type="button" class="btn-anexar" onclick="abrirSeletorArquivo('${descId}')">Anexar</button>
                     <input type="file" id="file_${descId}" class="file-input-hidden" multiple accept="image/*,.pdf,.doc,.docx,.txt,.csv,.xls,.xlsx,.ppt,.pptx" onchange="processarArquivosSelecionados('${descId}', this.files)">
                     <button type="button" class="btn-remover-caixa" onclick="removerPagina(${sistemaIndex}, ${i})">- Remover</button>
                     <div class="mover-buttons">
                         <button type="button" class="btn-mover-caixa" onclick="moverPagina(${sistemaIndex}, ${i}, -1)" title="Mover para cima">▲</button>
                         <button type="button" class="btn-mover-caixa" onclick="moverPagina(${sistemaIndex}, ${i}, 1)" title="Mover para baixo">▼</button>
                     </div>
                 </div>
             </div>`;
         container.appendChild(paginaDiv);
         const descElement = document.getElementById(descId);
         descElement.oninput = () => { sistemasData[sistemaIndex].paginas[i].conteudo = descElement.innerHTML; };
         setupDragAndDrop(descId);
         setupEditableContent(descId);
     });
 }

function renderizarFormularioCapituloAplicaveis(veiculoIndex, sistemaIndex) {
	const select = document.getElementById(`sistema_aplicaveis_${veiculoIndex}_${sistemaIndex}`);
	const valor = select.value;
	const container = document.getElementById(`formulario-capitulo-aplicaveis_${veiculoIndex}_${sistemaIndex}`);
	const veiculo = veiculosAplicaveisData[veiculoIndex];
	const dados = veiculo.sistemas[sistemaIndex];

container.innerHTML = ""; // Limpa o container antes de adicionar o novo formulário
if (!valor) return;

const isCaixasForm = valor === "Fusíveis e Relés";
const isPaginasForm = valor === "Alimentação Positiva" || valor === "Conectores de Peito" || valor === "Sistema de Carga e Partida";
const isIluminacaoForm = valor === "Iluminação";
const isOutroForm = valor === "Outro";
const isStandardModuleForm = !isCaixasForm && !isPaginasForm && !isIluminacaoForm && !isOutroForm;

// --- Bloco Comum (Transferência e Páginas Previstas) ---
const commonTransferHtml = `
	<div class="checkbox-block">
		<div class="checkbox-inline" onchange="toggleIdTransfAplicaveis(${veiculoIndex}, ${sistemaIndex}); togglePaginasPrevistaAplicaveis(${veiculoIndex}, ${sistemaIndex}); salvarDadosSistemaAplicaveis(${veiculoIndex}, ${sistemaIndex})">
			<label><input type="radio" name="transferencia_aplicaveis_${veiculoIndex}_${sistemaIndex}" value="transferencia_principal" ${dados.transferencia === 'transferencia_principal' || !dados.transferencia ? 'checked' : ''}> Transferência (do Principal)</label>
			<label><input type="radio" name="transferencia_aplicaveis_${veiculoIndex}_${sistemaIndex}" value="transferencia_outro" ${dados.transferencia === 'transferencia_outro' ? 'checked' : ''}> Transferência (Outro)</label>
			<label><input type="radio" name="transferencia_aplicaveis_${veiculoIndex}_${sistemaIndex}" value="modificar" ${dados.transferencia === 'modificar' ? 'checked' : ''}> Modificar Publicado</label>
		</div>
	</div>
	<input type="number" id="idtransf_aplicaveis_${veiculoIndex}_${sistemaIndex}" name="idtransf_aplicaveis_${veiculoIndex}_${sistemaIndex}" placeholder="Informe o ID..." value="${dados.idtransf || ''}" style="display: ${dados.transferencia === 'transferencia_outro' ? 'block' : 'none'}" onchange="salvarDadosSistemaAplicaveis(${veiculoIndex}, ${sistemaIndex})">
	<div data-container-for="paginasprev_aplicaveis_${veiculoIndex}_${sistemaIndex}" style="display: ${dados.transferencia === 'modificar' ? 'none' : 'block'}">
		<label>Nº páginas prevista</label>
		<input type="number" name="paginasprev_aplicaveis_${veiculoIndex}_${sistemaIndex}" value="${dados.paginasprev || ''}" placeholder="Apenas números" oninput="this.value = this.value.replace(/[^0-9]/g, ''); salvarDadosSistemaAplicaveis(${veiculoIndex}, ${sistemaIndex})">
	</div>
`;

// --- Bloco Padrão (Módulo, Nome, Conectores, etc.) ---
const standardModuleHtml = `
	<label>Módulo principal</label><input type="text" name="modulo_aplicaveis_${veiculoIndex}_${sistemaIndex}" value="${dados.modulo || ''}" placeholder="UCE do Motor" onchange="salvarDadosSistemaAplicaveis(${veiculoIndex}, ${sistemaIndex})">
	<label>Nome no material</label><input type="text" name="nomematerial_aplicaveis_${veiculoIndex}_${sistemaIndex}" value="${dados.nomematerial || ''}" placeholder="Engine Control Unit" onchange="salvarDadosSistemaAplicaveis(${veiculoIndex}, ${sistemaIndex})">
	<label>Código de Peça / Link</label>
	<div contenteditable="true" class="editable-content short" id="codmodulo_aplicaveis_${veiculoIndex}_${sistemaIndex}" data-field="codmodulo_aplicaveis" oninput="salvarDadosSistemaAplicaveis(${veiculoIndex}, ${sistemaIndex})">${dados.codmodulo || ''}</div>
	<label>Códigos de Conectores</label><textarea name="codconectores_aplicaveis_${veiculoIndex}_${sistemaIndex}" rows="3" placeholder="T20 = A / LB = B / T50d = C" onchange="salvarDadosSistemaAplicaveis(${veiculoIndex}, ${sistemaIndex})">${dados.codconectores || ''}</textarea>
`;

// --- Bloco Desenvolvimento Padrão (Loc, Con, Diag) ---
const standardDevelopmentHtml = `
	<fieldset>
		<legend>DESENVOLVIMENTO</legend>
		<label>Página de Localização</label>
		<div class="development-field-container">
			<div contenteditable="true" class="editable-content" id="pagloc_aplicaveis_${veiculoIndex}_${sistemaIndex}" data-field="pagloc_aplicaveis" oninput="salvarDadosSistemaAplicaveis(${veiculoIndex}, ${sistemaIndex})">${dados.pagloc || ''}</div>
			<button type="button" class="btn-anexar" onclick="abrirSeletorArquivo('pagloc_aplicaveis_${veiculoIndex}_${sistemaIndex}')">Anexar</button>
			<input type="file" id="file_pagloc_aplicaveis_${veiculoIndex}_${sistemaIndex}" class="file-input-hidden" multiple accept="image/*,.pdf,.doc,.docx,.txt,.csv,.xls,.xlsx,.ppt,.pptx" onchange="processarArquivosSelecionados('pagloc_aplicaveis_${veiculoIndex}_${sistemaIndex}', this.files)">
		</div>
		<label>Página de Conectores</label>
		<div class="development-field-container">
			<div contenteditable="true" class="editable-content" id="pagcon_aplicaveis_${veiculoIndex}_${sistemaIndex}" data-field="pagcon_aplicaveis" oninput="salvarDadosSistemaAplicaveis(${veiculoIndex}, ${sistemaIndex})">${dados.pagcon || ''}</div>
			<button type="button" class="btn-anexar" onclick="abrirSeletorArquivo('pagcon_aplicaveis_${veiculoIndex}_${sistemaIndex}')">Anexar</button>
			<input type="file" id="file_pagcon_aplicaveis_${veiculoIndex}_${sistemaIndex}" class="file-input-hidden" multiple accept="image/*,.pdf,.doc,.docx,.txt,.csv,.xls,.xlsx,.ppt,.pptx" onchange="processarArquivosSelecionados('pagcon_aplicaveis_${veiculoIndex}_${sistemaIndex}', this.files)">
		</div>
		<label>Página de Diagramas</label>
		<div class="development-field-container">
			<div contenteditable="true" class="editable-content" id="pagdiag_aplicaveis_${veiculoIndex}_${sistemaIndex}" data-field="pagdiag_aplicaveis" oninput="salvarDadosSistemaAplicaveis(${veiculoIndex}, ${sistemaIndex})">${dados.pagdiag || ''}</div>
			<button type="button" class="btn-anexar" onclick="abrirSeletorArquivo('pagdiag_aplicaveis_${veiculoIndex}_${sistemaIndex}')">Anexar</button>
			<input type="file" id="file_pagdiag_aplicaveis_${veiculoIndex}_${sistemaIndex}" class="file-input-hidden" multiple accept="image/*,.pdf,.doc,.docx,.txt,.csv,.xls,.xlsx,.ppt,.pptx" onchange="processarArquivosSelecionados('pagdiag_aplicaveis_${veiculoIndex}_${sistemaIndex}', this.files)">
		</div>
	</fieldset>
`;

// --- Bloco Desenvolvimento "Páginas" (Ex: Alimentação) ---
const pagesDevelopmentHtml = `
	<fieldset>
		<legend>DESENVOLVIMENTO</legend>
		<div id="dynamic-content-container-aplicaveis_${veiculoIndex}_${sistemaIndex}"></div>
		<button type="button" class="btn-adicionar-caixa" onclick="adicionarPaginaAplicaveis(${veiculoIndex}, ${sistemaIndex})">+ Adicionar Página</button>
	</fieldset>
`;

// --- Bloco Desenvolvimento "Caixas" (Ex: Fusíveis) ---
const caixasDevelopmentHtml = `
	<fieldset>
		<legend>DESENVOLVIMENTO</legend>
		<div id="dynamic-content-container-aplicaveis_${veiculoIndex}_${sistemaIndex}"></div>
		<button type="button" class="btn-adicionar-caixa" onclick="adicionarCaixaAplicaveis(${veiculoIndex}, ${sistemaIndex})">+ Adicionar Caixa</button>
	</fieldset>
`;

if (isCaixasForm) {
     const fusiveisOptionsHtml = `
         <div class="checkbox-blockk"></div>
         <label class="checkbox-title">TIPO DE DEMANDA:</label>
         <div class="checkbox-inline" onchange="salvarDadosSistemaAplicaveis(${veiculoIndex}, ${sistemaIndex})">
             <label><input type="radio" name="tipo_fusiveis_aplicaveis_${veiculoIndex}_${sistemaIndex}" value="Simplificado" ${dados.tipo_fusiveis === 'Simplificado' || !dados.tipo_fusiveis ? 'checked' : ''}> Simplificado</label>
             <label><input type="radio" name="tipo_fusiveis_aplicaveis_${veiculoIndex}_${sistemaIndex}" value="Completo" ${dados.tipo_fusiveis === 'Completo' ? 'checked' : ''}> Completo</label>
             <label><input type="radio" name="tipo_fusiveis_aplicaveis_${veiculoIndex}_${sistemaIndex}" value="Adicionar tabelas" ${dados.tipo_fusiveis === 'Adicionar tabelas' ? 'checked' : ''}> Adicionar tabelas</label>
         </div>
         <div class="checkbox-blockk"></div>
     `;
	container.innerHTML = commonTransferHtml + fusiveisOptionsHtml + caixasDevelopmentHtml;
	renderizarCaixasAplicaveis(veiculoIndex, sistemaIndex);
} else if (isPaginasForm) {
	container.innerHTML = commonTransferHtml + pagesDevelopmentHtml;
	renderizarPaginasAplicaveis(veiculoIndex, sistemaIndex);
} else if (isIluminacaoForm) {
	container.innerHTML = `
		${commonTransferHtml}
		<div class="checkbox-blockk"></div>
		<label class="checkbox-title">TIPO:</label>
		<div class="checkbox-inline" onchange="salvarDadosSistemaAplicaveis(${veiculoIndex}, ${sistemaIndex})">
			<label><input type="radio" name="tipo_iluminacao_aplicaveis_${veiculoIndex}_${sistemaIndex}" value="interna" ${dados.tipo_iluminacao === 'interna' || !dados.tipo_iluminacao ? 'checked' : ''}> INTERNA</label>
			<label><input type="radio" name="tipo_iluminacao_aplicaveis_${veiculoIndex}_${sistemaIndex}" value="externa" ${dados.tipo_iluminacao === 'externa' ? 'checked' : ''}> EXTERNA</label>
			<label><input type="radio" name="tipo_iluminacao_aplicaveis_${veiculoIndex}_${sistemaIndex}" value="ambos" ${dados.tipo_iluminacao === 'ambos' ? 'checked' : ''}> AMBOS</label>
		</div>
		<div class="checkbox-blockk"></div>
		<label class="checkbox-title">POSSUI MÓDULO DEDICADO?</label>
		<div class="checkbox-inline" onchange="toggleModuloDedicadoAplicaveis(${veiculoIndex}, ${sistemaIndex}); salvarDadosSistemaAplicaveis(${veiculoIndex}, ${sistemaIndex})">
			<label><input type="radio" name="modulo_dedicado_aplicaveis_${veiculoIndex}_${sistemaIndex}" value="sim" ${dados.modulo_dedicado === 'sim' ? 'checked' : ''}> SIM</label>
			<label><input type="radio" name="modulo_dedicado_aplicaveis_${veiculoIndex}_${sistemaIndex}" value="nao" ${dados.modulo_dedicado === 'nao' || !dados.modulo_dedicado ? 'checked' : ''}> NÃO</label>
		</div>
		
		<div id="standard-module-fields-aplicaveis_${veiculoIndex}_${sistemaIndex}" style="display: ${dados.modulo_dedicado === 'sim' ? 'block' : 'none'};">
			${standardModuleHtml}
		</div>
		
		<div id="development-fields-aplicaveis_${veiculoIndex}_${sistemaIndex}">
			${dados.modulo_dedicado === 'sim' ? standardDevelopmentHtml : pagesDevelopmentHtml}
		</div>
	`;
	if (dados.modulo_dedicado !== 'sim') {
		renderizarPaginasAplicaveis(veiculoIndex, sistemaIndex);
	}
} else if (isOutroForm) {
	container.innerHTML = `
		${commonTransferHtml}
		<div class="checkbox-blockk"></div>
		<label class="checkbox-title">POSSUI MÓDULO DEDICADO?</label>
		<div class="checkbox-inline" onchange="toggleModuloDedicadoAplicaveis(${veiculoIndex}, ${sistemaIndex}); salvarDadosSistemaAplicaveis(${veiculoIndex}, ${sistemaIndex})">
			<label><input type="radio" name="modulo_dedicado_aplicaveis_${veiculoIndex}_${sistemaIndex}" value="sim" ${dados.modulo_dedicado === 'sim' ? 'checked' : ''}> SIM</label>
			<label><input type="radio" name="modulo_dedicado_aplicaveis_${veiculoIndex}_${sistemaIndex}" value="nao" ${dados.modulo_dedicado === 'nao' || !dados.modulo_dedicado ? 'checked' : ''}> NÃO</label>
		</div>
		
		<div id="standard-module-fields-aplicaveis_${veiculoIndex}_${sistemaIndex}" style="display: ${dados.modulo_dedicado === 'sim' ? 'block' : 'none'};">
			${standardModuleHtml}
		</div>
		
		<div id="development-fields-aplicaveis_${veiculoIndex}_${sistemaIndex}">
			${dados.modulo_dedicado === 'sim' ? standardDevelopmentHtml : pagesDevelopmentHtml}
		</div>
	`;
	if (dados.modulo_dedicado !== 'sim') {
		renderizarPaginasAplicaveis(veiculoIndex, sistemaIndex);
	}
} else if (isStandardModuleForm) {
	container.innerHTML = commonTransferHtml + standardModuleHtml + standardDevelopmentHtml;
}

if (dados.modulo_dedicado === 'sim' || isStandardModuleForm) {
	setupDragAndDrop(`pagloc_aplicaveis_${veiculoIndex}_${sistemaIndex}`);
	setupEditableContent(`pagloc_aplicaveis_${veiculoIndex}_${sistemaIndex}`);
	setupEditableContent(`codmodulo_aplicaveis_${veiculoIndex}_${sistemaIndex}`);
	setupDragAndDrop(`pagcon_aplicaveis_${veiculoIndex}_${sistemaIndex}`);
	setupEditableContent(`pagcon_aplicaveis_${veiculoIndex}_${sistemaIndex}`);
	setupDragAndDrop(`pagdiag_aplicaveis_${veiculoIndex}_${sistemaIndex}`);
	setupEditableContent(`pagdiag_aplicaveis_${veiculoIndex}_${sistemaIndex}`);
}

toggleIdTransfAplicaveis(veiculoIndex, sistemaIndex);
}

function renderizarSistema(index) {
		const container = document.getElementById("sistemas-container");
		container.innerHTML = "";
		if (sistemasData.length === 0) return;

		const dados = sistemasData[index];
		const div = document.createElement("div");
		div.className = "system-block";
		const idx = index;

		div.innerHTML = `
		<label>Título do capítulo</label>
			<select name="sistema_${idx}" id="sistema_${idx}" onchange="salvarDadosSistema(${idx}); renderizarFormularioCapitulo(${idx});">
				<option value="">Selecione</option>
				<option value="Airbag" ${dados.sistema === 'Airbag' ? 'selected' : ''}>Airbag</option>
				<option value="Alimentação Positiva" ${dados.sistema === 'Alimentação Positiva' ? 'selected' : ''}>Alimentação Positiva</option>
				<option value="Ar-condicionado" ${dados.sistema === 'Ar-condicionado' ? 'selected' : ''}>Ar-condicionado</option>
				<option value="Central de Carroceria" ${dados.sistema === 'Central de Carroceria' ? 'selected' : ''}>Central de Carroceria</option>
				<option value="Central Multimídia" ${dados.sistema === 'Central Multimídia' ? 'selected' : ''}>Central Multimídia</option>
				<option value="Conectores de Peito" ${dados.sistema === 'Conectores de Peito' ? 'selected' : ''}>Conectores de Peito</option>
				<option value="Freio ABS" ${dados.sistema === 'Freio ABS' ? 'selected' : ''}>Freio ABS</option>
				<option value="Freio de Estacionamento Eletrônico" ${dados.sistema === 'Freio de Estacionamento Eletrônico' ? 'selected' : ''}>Freio de Estacionamento Eletrônico</option>
				<option value="Fusíveis e Relés" ${dados.sistema === 'Fusíveis e Relés' ? 'selected' : ''}>Fusíveis e Relés</option>
				<option value="Iluminação" ${dados.sistema === 'Iluminação' ? 'selected' : ''}>Iluminação</option>
				<option value="Injeção Eletrônica" ${dados.sistema === 'Injeção Eletrônica' ? 'selected' : ''}>Injeção Eletrônica</option>
				<option value="Sistema de Carga e Partida" ${dados.sistema === 'Sistema de Carga e Partida' ? 'selected' : ''}>Sistema de Carga e Partida</option>
				<option value="Injeção Eletrônica e Transmissão" ${dados.sistema === 'Injeção Eletrônica e Transmissão' ? 'selected' : ''}>Injeção Eletrônica e Transmissão</option>
				<option value="Painel de Instrumentos" ${dados.sistema === 'Painel de Instrumentos' ? 'selected' : ''}>Painel de Instrumentos</option>
				<option value="Rádio" ${dados.sistema === 'Rádio' ? 'selected' : ''}>Rádio</option>
				<option value="Redes de Comunicação" ${dados.sistema === 'Redes de Comunicação' ? 'selected' : ''}>Redes de Comunicação</option>
				<option value="Tração 4x4" ${dados.sistema === 'Tração 4x4' ? 'selected' : ''}>Tração 4x4</option>
				<option value="Transmissão Automática" ${dados.sistema === 'Transmissão Automática' ? 'selected' : ''}>Transmissão Automática</option>
				<option value="Outro" ${dados.sistema && ![
				'Airbag','Alimentação Positiva','Ar-condicionado','Central de Carroceria','Central Multimídia',
				'Conectores de Peito','Freio ABS','Freio de Estacionamento Eletrônico','Fusíveis e Relés',
				'Iluminação','Injeção Eletrônica','Sistema de Carga e Partida','Injeção Eletrônica e Transmissão',
				'Painel de Instrumentos','Rádio','Redes de Comunicação','Tração 4x4','Transmissão Automática'
				].includes(dados.sistema) ? 'selected' : ''}>Outro</option>
			</select>
			<div id="outrocampo_${idx}" style="display:none; margin-top: 5px;">
				<label>Especifique o título:</label>
				<input type="text" name="sistema_outro_${idx}" value="${dados.sistema && ![
					'Fusíveis e Relés','Alimentação Positiva','Conectores de Peito','Central de Carroceria','Injeção Eletrônica',
					'Sistema de Carga e Partida','Injeção Eletrônica e Transmissão','Transmissão Automática',
					'Tração 4x4','Redes de Comunicação','Painel de Instrumentos','Airbag','Ar-condicionado',
					'Freio ABS','Freio de Estacionamento Eletrônico','Rádio','Central Multimídia','Iluminação'
				].includes(dados.sistema) ? dados.sistema : ''}" onchange="salvarDadosSistema(${idx})">
			</div>
			<div id="formulario-capitulo_${idx}"></div>
		`;

		container.appendChild(div);

		const selectElement = div.querySelector(`#sistema_${idx}`);
		const outroCampo = div.querySelector(`#outrocampo_${idx}`);
		const outroInput = div.querySelector(`input[name="sistema_outro_${idx}"]`);

		const toggleOutroCampo = () => {
			if (selectElement.value === 'Outro' || (selectElement.value === '' && outroInput.value)) {
				outroCampo.style.display = 'block';
			} else {
				outroCampo.style.display = 'none';
			}
		};

		selectElement.addEventListener('change', toggleOutroCampo);
		toggleOutroCampo(); 

		if (dados.sistema) {
			renderizarFormularioCapitulo(idx);
		}
	}

function toggleModuloDedicadoPrincipal(index) {
	const radio = document.querySelector(`input[name="modulo_dedicado_${index}"]:checked`);
	const moduloDedicado = radio ? radio.value : 'nao';



	const standardFieldsContainer = document.getElementById(`standard-module-fields_${index}`);
	const developmentContainer = document.getElementById(`development-fields_${index}`);

	if (standardFieldsContainer) {
		standardFieldsContainer.style.display = (moduloDedicado === 'sim') ? 'block' : 'none';
	}

	if (developmentContainer) {
		if (moduloDedicado === 'sim') {
			developmentContainer.innerHTML = `
				<fieldset>
					<legend>DESENVOLVIMENTO</legend>
					<label>Página de Localização</label>
					<div class="development-field-container">
						<div contenteditable="true" class="editable-content" id="pagloc_${index}" data-field="pagloc" oninput="salvarDadosSistema(${index})"></div>
						<button type="button" class="btn-anexar" onclick="abrirSeletorArquivo('pagloc_${index}')">Anexar</button>
						<input type="file" id="file_pagloc_${index}" class="file-input-hidden" multiple accept="image/*,.pdf,.doc,.docx,.txt,.csv,.xls,.xlsx,.ppt,.pptx" onchange="processarArquivosSelecionados('pagloc_${index}', this.files)">
					</div>
					<label>Página de Conectores</label>
					<div class="development-field-container">
						<div contenteditable="true" class="editable-content" id="pagcon_${index}" data-field="pagcon" oninput="salvarDadosSistema(${index})"></div>
						<button type="button" class="btn-anexar" onclick="abrirSeletorArquivo('pagcon_${index}')">Anexar</button>
						<input type="file" id="file_pagcon_${index}" class="file-input-hidden" multiple accept="image/*,.pdf,.doc,.docx,.txt,.csv,.xls,.xlsx,.ppt,.pptx" onchange="processarArquivosSelecionados('pagcon_${index}', this.files)">
					</div>
					<label>Página de Diagramas</label>
					<div class="development-field-container">
						<div contenteditable="true" class="editable-content" id="pagdiag_${index}" data-field="pagdiag" oninput="salvarDadosSistema(${index})"></div>
						<button type="button" class="btn-anexar" onclick="abrirSeletorArquivo('pagdiag_${index}')">Anexar</button>
						<input type="file" id="file_pagdiag_${index}" class="file-input-hidden" multiple accept="image/*,.pdf,.doc,.docx,.txt,.csv,.xls,.xlsx,.ppt,.pptx" onchange="processarArquivosSelecionados('pagdiag_${index}', this.files)">
					</div>
				</fieldset>
			`;
			setupDragAndDrop(`pagloc_${index}`);
			setupEditableContent(`pagloc_${index}`);
			setupDragAndDrop(`pagcon_${index}`);
			setupEditableContent(`pagcon_${index}`);
			setupDragAndDrop(`pagdiag_${index}`);
			setupEditableContent(`pagdiag_${index}`);
		} else {
			developmentContainer.innerHTML = `
				<fieldset>
					<legend>DESENVOLVIMENTO</legend>
					<div id="dynamic-content-container_${index}"></div>
					<button type="button" class="btn-adicionar-caixa" onclick="adicionarPagina(${index})">+ Adicionar Página</button>
				</fieldset>
			`;
			const dados = sistemasData[index];
			dados.modulo = '';
			dados.nomematerial = '';
			dados.codmodulo = '';
			dados.codconectores = '';
			dados.pagloc = '';
			dados.pagcon = '';
			dados.pagdiag = '';
			renderizarPaginas(index);
		}
	}
}
			
function toggleIdTransfPrincipal(index) {
	const radio = document.querySelector(`input[name="transferencia_${index}"]:checked`);
	const idTransfInput = document.getElementById(`idtransf_${index}`);

	if (radio && idTransfInput) {
		idTransfInput.style.display = (radio.value === 'transferencia') ? 'block' : 'none';
	}
}

function togglePaginasPrevistaPrincipal(index) {
	const radio = document.querySelector(`input[name="transferencia_${index}"]:checked`);
	const container = document.querySelector(`[data-container-for='paginasprev_${index}']`);
	if (radio && container) {
		container.style.display = (radio.value === 'modificar') ? 'none' : 'block';
	}
}

function togglePaginasPrevistaAplicaveis(veiculoIndex, sistemaIndex) {
	const radio = document.querySelector(`input[name="transferencia_aplicaveis_${veiculoIndex}_${sistemaIndex}"]:checked`);
	const container = document.querySelector(`[data-container-for='paginasprev_aplicaveis_${veiculoIndex}_${sistemaIndex}']`);
	if (radio && container) {
		container.style.display = (radio.value === 'modificar') ? 'none' : 'block';
	}
}

function adicionarSistema() {
	const sistemasContainer = document.getElementById('sistemas-container');
	if (sistemasData.length > 0) salvarDadosSistema(paginaAtual);
	sistemasData.push({});
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

const systemDiv = document.querySelector(`#sistemas-container .system-block`);
if (!systemDiv) return;

const selectElement = systemDiv.querySelector(`select[name="sistema_${index}"]`);
if (!selectElement) return;

	const outroInputEl = systemDiv.querySelector(`input[name="sistema_outro_${index}"]`);
	const sistemaValor = selectElement.value === 'Outro' ? (outroInputEl ? outroInputEl.value : '') : selectElement.value;
	const transferenciaValue = systemDiv.querySelector(`input[name="transferencia_${index}"]:checked`)?.value;

	const getVal = (sel) => systemDiv.querySelector(sel)?.value || '';
	const getHtml = (sel) => systemDiv.querySelector(sel)?.innerHTML || '';
	const getRadio = (name) => systemDiv.querySelector(`input[name="${name}"]:checked`)?.value || '';
	
	const caixasExistentes = sistemasData[index] ? sistemasData[index].caixas : [];
	const paginasExistentes = sistemasData[index] ? sistemasData[index].paginas : [];

	sistemasData[index] = {
		caixas: caixasExistentes,
		paginas: paginasExistentes,
		sistema: sistemaValor,
		transferencia: transferenciaValue,
		idtransf: getVal(`#idtransf_${index}`),
		paginasprev: getVal(`input[name="paginasprev_${index}"]`),
		tipo_iluminacao: getRadio(`tipo_iluminacao_${index}`),
		modulo_dedicado: getRadio(`modulo_dedicado_${index}`),
        tipo_fusiveis: getRadio(`tipo_fusiveis_${index}`),
		modulo: getVal(`input[name="modulo_${index}"]`),
		nomematerial: getVal(`input[name="nomematerial_${index}"]`),
		codmodulo: getHtml(`#codmodulo_${index}`),
		codconectores: getVal(`textarea[name="codconectores_${index}"]`),
		pagloc: getHtml(`#pagloc_${index}`),
		pagcon: getHtml(`#pagcon_${index}`),
		pagdiag: getHtml(`#pagdiag_${index}`)
	};
	
	renderizarPaginacao();
}


// Funções para a aba "Veículos Aplicáveis"
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

				<div class="checkbox-block">
					<label class="checkbox-title">PESQUISA (VEÍCULO PRINCIPAL OU SEMELHANTE)</label>
					<div class="checkbox-inline" onchange="togglePesquisaTexto('aplicavel', ${veiculoIndex}); salvarDadosVeiculoAplicavel(${veiculoIndex})">
						<label><input type="radio" name="pesquisa_aplicaveis_${veiculoIndex}" value="sim" ${veiculo.dadosGerais.pesquisa === 'sim' ? 'checked' : ''}> SIM</label>
						<label><input type="radio" name="pesquisa_aplicaveis_${veiculoIndex}" value="nao" ${veiculo.dadosGerais.pesquisa !== 'sim' ? 'checked' : ''}> NÃO</label>
					</div>
				</div>

				<div class="editable-container" style="display: ${veiculo.dadosGerais.pesquisa === 'sim' ? 'block' : 'none'};">
					<div contenteditable="true" class="editable-content" id="pesquisa_texto_aplicaveis_${veiculoIndex}" data-field="pesquisa_texto_aplicaveis" oninput="salvarDadosVeiculoAplicavel(${veiculoIndex})" data-placeholder="I:\\INFORMAÇÕES\\Mazda\\Pesquisa\\RX-7...">${veiculo.dadosGerais.pesquisa_texto || ''}</div>
				</div>

				<div class="checkbox-blockk"></div>

				<label for="comentarios_aplicaveis_${veiculoIndex}">IMPORTANTE PARA O DESENVOLVIMENTO</label>
				<div class="development-field-container">
					<div contenteditable="true" class="editable-content" id="comentarios_aplicaveis_${veiculoIndex}" data-field="comentarios_aplicaveis" oninput="salvarDadosVeiculoAplicavel(${veiculoIndex})" data-placeholder="Descreva tudo que influenciará no desenvolvimento dos manuais...">${veiculo.dadosGerais.comentarios || ''}</div>
					<button type="button" class="btn-anexar" onclick="abrirSeletorArquivo('comentarios_aplicaveis_${veiculoIndex}')">Anexar</button>
					<input type="file" id="file_comentarios_aplicaveis_${veiculoIndex}" class="file-input-hidden" multiple accept="image/*,.pdf,.doc,.docx,.txt,.csv,.xls,.xlsx,.ppt,.pptx" onchange="processarArquivosSelecionados('comentarios_aplicaveis_${veiculoIndex}', this.files)">
				</div>

				<div class="checkbox-block"></div>

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

				<div class="checkbox-blockk"></div>

				<label for="ilustracao_texto_aplicaveis_${veiculoIndex}">PEDIDOS DE ILUSTRAÇÃO / TRATAMENTO DE IMAGEM</label>
				<div contenteditable="true" class="editable-content" id="ilustracao_texto_aplicaveis_${veiculoIndex}" data-field="ilustracao_texto_aplicaveis" oninput="salvarDadosVeiculoAplicavel(${veiculoIndex})" data-placeholder="P:\\Desenvolvimento\\+ DIAGRAMAS\\0. (2026-X)\\Mazda\\RX-7>1.3 256cv (13B - Wankel) (1994)\\Fotos e Ilustrações\\Pedidos...">${veiculo.dadosGerais.ilustracao_texto || ''}</div>

			<fieldset>
				<legend>ITENS DE SÉRIE / OPCIONAIS (Veículo ${veiculoIndex + 1})</legend>
				<div class="checkbox-block">
					<label class="checkbox-title">
						<input type="checkbox" id="toggle_itens_serie_${veiculoIndex}" 
							   onchange="toggleItensSerie(${veiculoIndex}); salvarDadosVeiculoAplicavel(${veiculoIndex})"
							   ${veiculo.dadosGerais.precisaPreencherItensSerie ? 'checked' : ''}>
						PREENCHER?
					</label>
				</div>

				<div class="checkbox-blockk"></div>
				
                 <div id="container_itens_serie_${veiculoIndex}" style="display: ${veiculo.dadosGerais.precisaPreencherItensSerie ? 'block' : 'none'};">
                     <div class="checkbox-block">
                       <label class="checkbox-title">TIPO DE CHAVE:</label>
                       <div class="checkbox-inline" onchange="salvarDadosVeiculoAplicavel(${veiculoIndex})">
                         <label><input type="checkbox" name="chave_aplicaveis_${veiculoIndex}" value="Comum" ${(veiculo.itensSerie.chave || []).includes('Comum') ? 'checked' : ''}> COMUM</label>
                         <label><input type="checkbox" name="chave_aplicaveis_${veiculoIndex}" value="Presencial (Botão)" ${(veiculo.itensSerie.chave || []).includes('Presencial (Botão)') ? 'checked' : ''}> PRESENCIAL (BOTÃO)</label>
                         <label><input type="checkbox" name="chave_aplicaveis_${veiculoIndex}" value="Encaixe Inteligente" ${(veiculo.itensSerie.chave || []).includes('Encaixe Inteligente') ? 'checked' : ''}> ENCAIXE INTELIGENTE</label>
                       </div>
                     </div>

                     <div class="checkbox-blockk"></div>

                     <div class="checkbox-block">
                       <label class="checkbox-title">FUNÇÃO START/STOP:</label>
                       <div class="checkbox-inline" onchange="salvarDadosVeiculoAplicavel(${veiculoIndex})">
                         <label><input type="radio" name="startstop_aplicaveis_${veiculoIndex}" value="sim_serie" ${veiculo.itensSerie.startstop === 'sim_serie' ? 'checked' : ''}> SIM (DE SÉRIE)</label>
                         <label><input type="radio" name="startstop_aplicaveis_${veiculoIndex}" value="sim_opcional" ${veiculo.itensSerie.startstop === 'sim_opcional' ? 'checked' : ''}> SIM (OPCIONAL)</label>
                         <label><input type="radio" name="startstop_aplicaveis_${veiculoIndex}" value="nao" ${veiculo.itensSerie.startstop === 'nao' ? 'checked' : ''}> NÃO</label>
                       </div>
                     </div>

                     <div class="checkbox-blockk"></div>

                     <div class="checkbox-block">
                       <label class="checkbox-title">AR-CONDICIONADO:</label>
                       <div class="checkbox-inline" onchange="salvarDadosVeiculoAplicavel(${veiculoIndex})">
                         <label><input type="checkbox" name="ac_aplicaveis_${veiculoIndex}" value="Manual" ${(veiculo.itensSerie.ac || []).includes('Manual') ? 'checked' : ''}> MANUAL</label>
                         <label><input type="checkbox" name="ac_aplicaveis_${veiculoIndex}" value="Automático" ${(veiculo.itensSerie.ac || []).includes('Automático') ? 'checked' : ''}> AUTOMÁTICO</label>
                         <label><input type="checkbox" name="ac_aplicaveis_${veiculoIndex}" value="Só Ar Quente" ${(veiculo.itensSerie.ac || []).includes('Só Ar Quente') ? 'checked' : ''}> SÓ AR QUENTE</label>
                       </div>
                     </div>

                     <div class="checkbox-blockk"></div>

                     <div class="checkbox-block">
                       <label class="checkbox-title">TRANSMISSÃO:</label>
                       <div class="checkbox-inline" onchange="salvarDadosVeiculoAplicavel(${veiculoIndex})">
                         <label><input type="checkbox" name="atmt_aplicaveis_${veiculoIndex}" value="AT" ${(veiculo.itensSerie.atmt || []).includes('AT') ? 'checked' : ''}> AT</label>
                         <label><input type="checkbox" name="atmt_aplicaveis_${veiculoIndex}" value="MT" ${(veiculo.itensSerie.atmt || []).includes('MT') ? 'checked' : ''}> MT</label>
                       </div>
                     </div>

                     <div class="checkbox-blockk"></div>

                     <div class="checkbox-block">
                         <label class="checkbox-title">TRAÇÃO:</label>
                         <div class="checkbox-inline" onchange="salvarDadosVeiculoAplicavel(${veiculoIndex})">
                             <label><input type="checkbox" name="tracao_aplicaveis_${veiculoIndex}" value="4X2" ${(veiculo.itensSerie.tracao || []).includes('4X2') ? 'checked' : ''}> 4X2</label>
                             <label><input type="checkbox" name="tracao_aplicaveis_${veiculoIndex}" value="4X4" ${(veiculo.itensSerie.tracao || []).includes('4X4') ? 'checked' : ''}> 4X4</label>
                             <label><input type="checkbox" name="tracao_aplicaveis_${veiculoIndex}" value="6X2" ${(veiculo.itensSerie.tracao || []).includes('6X2') ? 'checked' : ''}> 6X2</label>
                             <label><input type="checkbox" name="tracao_aplicaveis_${veiculoIndex}" value="6X4" ${(veiculo.itensSerie.tracao || []).includes('6X4') ? 'checked' : ''}> 6X4</label>
                             <label><input type="checkbox" name="tracao_aplicaveis_${veiculoIndex}" value="8X2" ${(veiculo.itensSerie.tracao || []).includes('8X2') ? 'checked' : ''}> 8X2</label>
                             <label><input type="checkbox" name="tracao_aplicaveis_${veiculoIndex}" value="8X4" ${(veiculo.itensSerie.tracao || []).includes('8X4') ? 'checked' : ''}> 8X4</label>
                             <label><input type="checkbox" name="tracao_aplicaveis_${veiculoIndex}" value="8X8" ${(veiculo.itensSerie.tracao || []).includes('8X8') ? 'checked' : ''}> 8X8</label>
                         </div>
                     </div>
                     
                     <div class="checkbox-blockk"></div>
                     
                 <label for="outros_serie_aplicaveis_${veiculoIndex}">OUTROS (DE SÉRIE):</label>
				<textarea id="outros_serie_aplicaveis_${veiculoIndex}" rows="3" placeholder="Itens de série não listados acima..." onchange="salvarDadosVeiculoAplicavel(${veiculoIndex})">${veiculo.itensSerie.outros_serie || ''}</textarea>

                 <label for="outros_opcional_aplicaveis_${veiculoIndex}">OUTROS (OPCIONAIS):</label>
                 <textarea id="outros_opcional_aplicaveis_${veiculoIndex}" rows="3" placeholder="Itens opcionais não listados acima..." onchange="salvarDadosVeiculoAplicavel(${veiculoIndex})">${veiculo.itensSerie.outros_opcional || ''}</textarea>
             
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

	setupDragAndDrop(`comentarios_aplicaveis_${veiculoIndex}`);
	setupEditableContent(`comentarios_aplicaveis_${veiculoIndex}`);
}

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

function salvarDadosComentarios() {
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

function salvarDadosVeiculoAplicavel(veiculoIndex) {
	if (veiculoIndex < 0 || veiculoIndex >= veiculosAplicaveisData.length) return;
	const veiculo = veiculosAplicaveisData[veiculoIndex];
	
	const getCheckedCheckboxValues = (name) => {
		const checkboxes = document.querySelectorAll(`input[name="${name}"]:checked`);
		return Array.from(checkboxes).map(cb => cb.value);
	};

	veiculo.dadosGerais = {
		veiculo: document.getElementById(`veiculo_aplicaveis_${veiculoIndex}`).value,
		iddiagramas: document.getElementById(`iddiagramas_aplicaveis_${veiculoIndex}`).value,
		idfusiveis: document.getElementById(`idfusiveis_aplicaveis_${veiculoIndex}`).value,
		pasta: document.getElementById(`pasta_aplicaveis_${veiculoIndex}`).innerHTML,
		pesquisa: document.querySelector(`input[name="pesquisa_aplicaveis_${veiculoIndex}"]:checked`)?.value,
		pesquisa_texto: document.getElementById(`pesquisa_texto_aplicaveis_${veiculoIndex}`).innerHTML,
		comentarios: document.getElementById(`comentarios_aplicaveis_${veiculoIndex}`).innerHTML,
		aplicacao_chassi: document.querySelector(`input[name="aplicacao_chassi_aplicaveis_${veiculoIndex}"]:checked`)?.value,
		aplicacao_chassi_texto: document.getElementById(`aplicacao_chassi_texto_aplicaveis_${veiculoIndex}`).value,
		ilustracao_texto: document.getElementById(`ilustracao_texto_aplicaveis_${veiculoIndex}`).innerHTML,
		precisaPreencherItensSerie: document.getElementById(`toggle_itens_serie_${veiculoIndex}`).checked,
	};

	veiculo.itensSerie = {
	  atmt: getCheckedCheckboxValues('atmt_aplicaveis_' + veiculoIndex),
	  chave: getCheckedCheckboxValues('chave_aplicaveis_' + veiculoIndex),
	  startstop: document.querySelector('input[name="startstop_aplicaveis_' + veiculoIndex + '"]:checked')?.value,
	  ac: getCheckedCheckboxValues('ac_aplicaveis_' + veiculoIndex),
	  tracao: getCheckedCheckboxValues('tracao_aplicaveis_' + veiculoIndex),
	  outros_serie: document.getElementById('outros_serie_aplicaveis_' + veiculoIndex).value,
	  outros_opcional: document.getElementById('outros_opcional_aplicaveis_' + veiculoIndex).value
	};

	renderizarPaginacaoVeiculosAplicaveis();
}

function abrirModalCopia(veiculoIndex) {
	targetVeiculoIndexParaCopia = veiculoIndex;

	const selectVeiculo = document.getElementById('select-veiculo-copia');
	selectVeiculo.innerHTML = ''; // Limpa opções anteriores

	// Adiciona Veículo Principal
	const optPrincipal = document.createElement('option');
	optPrincipal.value = 'principal';
	optPrincipal.textContent = 'Veículo Principal';
	selectVeiculo.appendChild(optPrincipal);

	// Adiciona Veículos Aplicáveis
	veiculosAplicaveisData.forEach((veiculo, idx) => {
		const optAplicavel = document.createElement('option');
		optAplicavel.value = `aplicavel_${idx}`;
		const veiculoLabel = extrairTooltipVeiculo(veiculo.dadosGerais.veiculo) || `Veículo ${idx + 1}`;
		optAplicavel.textContent = `Veículo Aplicável ${idx + 1}: ${veiculoLabel}`;
		selectVeiculo.appendChild(optAplicavel);
	});

	popularCapitulosParaCopia();

	document.getElementById('copy-chapter-modal').style.display = 'flex';
}

function popularCapitulosParaCopia() {
	const selectVeiculo = document.getElementById('select-veiculo-copia');
	const checkboxesContainer = document.getElementById('capitulos-checkboxes-copia');
	const selectedVeiculoValue = selectVeiculo.value;

	checkboxesContainer.innerHTML = ''; // Limpa conteúdo anterior

	let sourceSistemas = [];

	if (selectedVeiculoValue === 'principal') {
		sourceSistemas = sistemasData;
	} else if (selectedVeiculoValue.startsWith('aplicavel_')) {
		const veiculoIndex = parseInt(selectedVeiculoValue.split('_')[1], 10);
		if (veiculosAplicaveisData[veiculoIndex]) {
			sourceSistemas = veiculosAplicaveisData[veiculoIndex].sistemas;
		}
	}

	if (sourceSistemas && sourceSistemas.length > 0) {
		sourceSistemas.forEach((sistema, idx) => {
			const label = document.createElement('label');
			label.style.display = 'block';
			label.style.marginBottom = '8px';
			label.style.cursor = 'pointer';
			label.style.padding = '5px';
			label.style.borderRadius = '4px';
			
			const checkbox = document.createElement('input');
			checkbox.type = 'checkbox';
			checkbox.value = idx;
			checkbox.style.marginRight = '10px';
			checkbox.style.transform = 'scale(1.2)';
			
			const tituloCapitulo = sistema.sistema || 'Sem título';
			label.appendChild(checkbox);
			label.appendChild(document.createTextNode(`Capítulo ${idx + 1}: ${tituloCapitulo}`));
			
			label.addEventListener('mouseenter', () => {
				label.style.backgroundColor = '#f0f0f0';
			});
			label.addEventListener('mouseleave', () => {
				label.style.backgroundColor = 'transparent';
			});
			
			checkboxesContainer.appendChild(label);
		});
	} else {
		checkboxesContainer.innerHTML = '<p style="text-align: center; color: #999;">Nenhum capítulo encontrado</p>';
	}
}

function executarCopiaCapitulo() {
	const selectVeiculo = document.getElementById('select-veiculo-copia');
	const checkboxesContainer = document.getElementById('capitulos-checkboxes-copia');

	const selectedVeiculoValue = selectVeiculo.value;
	
	// Coleta todos os checkboxes marcados
	const checkboxesMarcados = checkboxesContainer.querySelectorAll('input[type="checkbox"]:checked');
	
	if (targetVeiculoIndexParaCopia === null) {
		alert('Erro: Veículo de destino inválido.');
		return;
	}
	
	if (checkboxesMarcados.length === 0) {
		alert('Selecione pelo menos um capítulo para copiar.');
		return;
	}

	let sourceSistemas = [];
	if (selectedVeiculoValue === 'principal') {
		sourceSistemas = sistemasData;
	} else if (selectedVeiculoValue.startsWith('aplicavel_')) {
		const veiculoIndex = parseInt(selectedVeiculoValue.split('_')[1], 10);
		sourceSistemas = veiculosAplicaveisData[veiculoIndex].sistemas;
	}

	const veiculoDestino = veiculosAplicaveisData[targetVeiculoIndexParaCopia];
	
	// Copia todos os capítulos selecionados
	checkboxesMarcados.forEach(checkbox => {
		const capituloIndex = parseInt(checkbox.value, 10);
		const capituloParaCopiar = sourceSistemas[capituloIndex];
		
		if (capituloParaCopiar) {
			// Cria uma cópia profunda do capítulo
			const copiaCapitulo = JSON.parse(JSON.stringify(capituloParaCopiar));
			veiculoDestino.sistemas.push(copiaCapitulo);
		}
	});

	// Atualiza a paginação e renderiza o último capítulo copiado
	veiculoDestino.paginaAtual = veiculoDestino.sistemas.length - 1;
	renderizarPaginacaoAplicaveis(targetVeiculoIndexParaCopia);
	renderizarSistemaAplicaveis(targetVeiculoIndexParaCopia, veiculoDestino.paginaAtual);
	
	// Fecha o modal e reseta o alvo
	document.getElementById('copy-chapter-modal').style.display = 'none';
	targetVeiculoIndexParaCopia = null;
	
	// Mensagem de sucesso
	const qtdCopiados = checkboxesMarcados.length;
	alert(`${qtdCopiados} capítulo(s) copiado(s) com sucesso!`);
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
		<label>Título do capítulo</label>
		<select name="sistema_aplicaveis_${veiculoIndex}_${sistemaIndex}" id="sistema_aplicaveis_${veiculoIndex}_${sistemaIndex}" onchange="salvarDadosSistemaAplicaveis(${veiculoIndex}, ${sistemaIndex}); renderizarFormularioCapituloAplicaveis(${veiculoIndex}, ${sistemaIndex});">
			<option value="">Selecione</option>
			<option value="Airbag" ${dados.sistema === 'Airbag' ? 'selected' : ''}>Airbag</option>
			<option value="Alimentação Positiva" ${dados.sistema === 'Alimentação Positiva' ? 'selected' : ''}>Alimentação Positiva</option>
			<option value="Ar-condicionado" ${dados.sistema === 'Ar-condicionado' ? 'selected' : ''}>Ar-condicionado</option>
			<option value="Central de Carroceria" ${dados.sistema === 'Central de Carroceria' ? 'selected' : ''}>Central de Carroceria</option>
			<option value="Central Multimídia" ${dados.sistema === 'Central Multimídia' ? 'selected' : ''}>Central Multimídia</option>
			<option value="Conectores de Peito" ${dados.sistema === 'Conectores de Peito' ? 'selected' : ''}>Conectores de Peito</option>
			<option value="Freio ABS" ${dados.sistema === 'Freio ABS' ? 'selected' : ''}>Freio ABS</option>
			<option value="Freio de Estacionamento Eletrônico" ${dados.sistema === 'Freio de Estacionamento Eletrônico' ? 'selected' : ''}>Freio de Estacionamento Eletrônico</option>
			<option value="Fusíveis e Relés" ${dados.sistema === 'Fusíveis e Relés' ? 'selected' : ''}>Fusíveis e Relés</option>
			<option value="Iluminação" ${dados.sistema === 'Iluminação' ? 'selected' : ''}>Iluminação</option>
			<option value="Injeção Eletrônica" ${dados.sistema === 'Injeção Eletrônica' ? 'selected' : ''}>Injeção Eletrônica</option>
			<option value="Sistema de Carga e Partida" ${dados.sistema === 'Sistema de Carga e Partida' ? 'selected' : ''}>Sistema de Carga e Partida</option>
			<option value="Injeção Eletrônica e Transmissão" ${dados.sistema === 'Injeção Eletrônica e Transmissão' ? 'selected' : ''}>Injeção Eletrônica e Transmissão</option>
			<option value="Painel de Instrumentos" ${dados.sistema === 'Painel de Instrumentos' ? 'selected' : ''}>Painel de Instrumentos</option>
			<option value="Rádio" ${dados.sistema === 'Rádio' ? 'selected' : ''}>Rádio</option>
			<option value="Redes de Comunicação" ${dados.sistema === 'Redes de Comunicação' ? 'selected' : ''}>Redes de Comunicação</option>
			<option value="Tração 4x4" ${dados.sistema === 'Tração 4x4' ? 'selected' : ''}>Tração 4x4</option>
			<option value="Transmissão Automática" ${dados.sistema === 'Transmissão Automática' ? 'selected' : ''}>Transmissão Automática</option>
			<option value="Outro" ${dados.sistema && ![
			'Airbag','Alimentação Positiva','Ar-condicionado','Central de Carroceria','Central Multimídia',
			'Conectores de Peito','Freio ABS','Freio de Estacionamento Eletrônico','Fusíveis e Relés',
			'Iluminação','Injeção Eletrônica','Sistema de Carga e Partida','Injeção Eletrônica e Transmissão',
			'Painel de Instrumentos','Rádio','Redes de Comunicação','Tração 4x4','Transmissão Automática'
			].includes(dados.sistema) ? 'selected' : ''}>Outro</option>
		</select>
		<div id="outrocampo_aplicaveis_${veiculoIndex}_${sistemaIndex}" style="display:none; margin-top: 5px;">
			<label>Especifique o título:</label>
			<input type="text" name="sistema_outro_aplicaveis_${veiculoIndex}_${sistemaIndex}" value="${dados.sistema && !['Fusíveis e Relés', 'Alimentação Positiva', 'Conectores de Peito', 'Central de Carroceria', 'Injeção Eletrônica', 'Sistema de Carga e Partida', 'Injeção Eletrônica e Transmissão', 'Transmissão Automática', 'Tração 4x4', 'Redes de Comunicação', 'Painel de Instrumentos', 'Airbag', 'Ar-condicionado', 'Freio ABS', 'Freio de Estacionamento Eletrônico', 'Rádio', 'Central Multimídia', 'Iluminação'].includes(dados.sistema) ? dados.sistema : ''}" onchange="salvarDadosSistemaAplicaveis(${veiculoIndex}, ${sistemaIndex})">
		</div>
		<div id="formulario-capitulo-aplicaveis_${veiculoIndex}_${sistemaIndex}"></div>
	`;
	container.appendChild(div);

	const selectElement = div.querySelector(`select[name="sistema_aplicaveis_${veiculoIndex}_${sistemaIndex}"]`);
	const outroCampo = div.querySelector(`#outrocampo_aplicaveis_${veiculoIndex}_${sistemaIndex}`);
	const outroInput = div.querySelector(`input[name="sistema_outro_aplicaveis_${veiculoIndex}_${sistemaIndex}"]`);

	const toggleOutroCampo = () => {
		if (selectElement.value === 'Outro' || (selectElement.value === '' && outroInput.value !== '')) {
			outroCampo.style.display = 'block';
		} else {
			outroCampo.style.display = 'none';
		}
	};

	selectElement.addEventListener('change', toggleOutroCampo);
	toggleOutroCampo();
	
	if (dados.sistema) {
		renderizarFormularioCapituloAplicaveis(veiculoIndex, sistemaIndex);
	}
}

function toggleIdTransfAplicaveis(veiculoIndex, sistemaIndex) {
	const radio = document.querySelector(`input[name="transferencia_aplicaveis_${veiculoIndex}_${sistemaIndex}"]:checked`);
	const idTransfInput = document.getElementById(`idtransf_aplicaveis_${veiculoIndex}_${sistemaIndex}`);

	if (radio && idTransfInput) {
		idTransfInput.style.display = (radio.value === 'transferencia_outro') ? 'block' : 'none';
	}
}

function toggleModuloDedicadoAplicaveis(veiculoIndex, sistemaIndex) {
	const radio = document.querySelector(`input[name="modulo_dedicado_aplicaveis_${veiculoIndex}_${sistemaIndex}"]:checked`);
	const moduloDedicado = radio ? radio.value : 'nao';



		const standardFieldsContainer = document.getElementById(`standard-module-fields-aplicaveis_${veiculoIndex}_${sistemaIndex}`);
		const developmentContainer = document.getElementById(`development-fields-aplicaveis_${veiculoIndex}_${sistemaIndex}`);

		if (standardFieldsContainer) {
			standardFieldsContainer.style.display = (moduloDedicado === 'sim') ? 'block' : 'none';
		}

		if (developmentContainer) {
			if (moduloDedicado === 'sim') {
				developmentContainer.innerHTML = `
					<fieldset>
						<legend>DESENVOLVIMENTO</legend>
						<label>Página de Localização</label>
						<div class="development-field-container">
							<div contenteditable="true" class="editable-content" id="pagloc_aplicaveis_${veiculoIndex}_${sistemaIndex}" data-field="pagloc_aplicaveis" oninput="salvarDadosSistemaAplicaveis(${veiculoIndex}, ${sistemaIndex})"></div>
							<button type="button" class="btn-anexar" onclick="abrirSeletorArquivo('pagloc_aplicaveis_${veiculoIndex}_${sistemaIndex}')">Anexar</button>
							<input type="file" id="file_pagloc_aplicaveis_${veiculoIndex}_${sistemaIndex}" class="file-input-hidden" multiple accept="image/*,.pdf,.doc,.docx,.txt,.csv,.xls,.xlsx,.ppt,.pptx" onchange="processarArquivosSelecionados('pagloc_aplicaveis_${veiculoIndex}_${sistemaIndex}', this.files)">
						</div>
						<label>Página de Conectores</label>
						<div class="development-field-container">
							<div contenteditable="true" class="editable-content" id="pagcon_aplicaveis_${veiculoIndex}_${sistemaIndex}" data-field="pagcon_aplicaveis" oninput="salvarDadosSistemaAplicaveis(${veiculoIndex}, ${sistemaIndex})"></div>
							<button type="button" class="btn-anexar" onclick="abrirSeletorArquivo('pagcon_aplicaveis_${veiculoIndex}_${sistemaIndex}')">Anexar</button>
							<input type="file" id="file_pagcon_aplicaveis_${veiculoIndex}_${sistemaIndex}" class="file-input-hidden" multiple accept="image/*,.pdf,.doc,.docx,.txt,.csv,.xls,.xlsx,.ppt,.pptx" onchange="processarArquivosSelecionados('pagcon_aplicaveis_${veiculoIndex}_${sistemaIndex}', this.files)">
						</div>
						<label>Página de Diagramas</label>
						<div class="development-field-container">
							<div contenteditable="true" class="editable-content" id="pagdiag_aplicaveis_${veiculoIndex}_${sistemaIndex}" data-field="pagdiag_aplicaveis" oninput="salvarDadosSistemaAplicaveis(${veiculoIndex}, ${sistemaIndex})"></div>
							<button type="button" class="btn-anexar" onclick="abrirSeletorArquivo('pagdiag_aplicaveis_${veiculoIndex}_${sistemaIndex}')">Anexar</button>
							<input type="file" id="file_pagdiag_aplicaveis_${veiculoIndex}_${sistemaIndex}" class="file-input-hidden" multiple accept="image/*,.pdf,.doc,.docx,.txt,.csv,.xls,.xlsx,.ppt,.pptx" onchange="processarArquivosSelecionados('pagdiag_aplicaveis_${veiculoIndex}_${sistemaIndex}', this.files)">
						</div>
					</fieldset>
				`;
				setupDragAndDrop(`pagloc_aplicaveis_${veiculoIndex}_${sistemaIndex}`);
				setupEditableContent(`pagloc_aplicaveis_${veiculoIndex}_${sistemaIndex}`);
				setupDragAndDrop(`pagcon_aplicaveis_${veiculoIndex}_${sistemaIndex}`);
				setupEditableContent(`pagcon_aplicaveis_${veiculoIndex}_${sistemaIndex}`);
				setupDragAndDrop(`pagdiag_aplicaveis_${veiculoIndex}_${sistemaIndex}`);
				setupEditableContent(`pagdiag_aplicaveis_${veiculoIndex}_${sistemaIndex}`);
			} else {
				developmentContainer.innerHTML = `
					<fieldset>
						<legend>DESENVOLVIMENTO</legend>
						<div id="dynamic-content-container-aplicaveis_${veiculoIndex}_${sistemaIndex}"></div>
						<button type="button" class="btn-adicionar-caixa" onclick="adicionarPaginaAplicaveis(${veiculoIndex}, ${sistemaIndex})">+ Adicionar Página</button>
					</fieldset>
				`;
				const dados = veiculosAplicaveisData[veiculoIndex].sistemas[sistemaIndex];
				dados.modulo = '';
				dados.nomematerial = '';
				dados.codmodulo = '';
				dados.codconectores = '';
				dados.pagloc = '';
				dados.pagcon = '';
				dados.pagdiag = '';
				renderizarPaginasAplicaveis(veiculoIndex, sistemaIndex);
			}
		}
	}

function adicionarSistemaAplicaveis(veiculoIndex) {
	const veiculo = veiculosAplicaveisData[veiculoIndex];
	if (veiculo.sistemas.length > 0 && veiculo.paginaAtual >= 0) {
		salvarDadosSistemaAplicaveis(veiculoIndex, veiculo.paginaAtual);
	}
	veiculo.sistemas.push({});
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

function mostrarPaginaAplicaveis(veiculoIndex, sistemaIndex) {
	const veiculo = veiculosAplicaveisData[veiculoIndex];
	if (sistemaIndex >= 0 && sistemaIndex < veiculo.sistemas.length) {
		if (veiculo.paginaAtual !== undefined && veiculo.paginaAtual >= 0) {
			salvarDadosSistemaAplicaveis(veiculoIndex, veiculo.paginaAtual);
		}
		veiculo.paginaAtual = sistemaIndex;
		renderizarPaginacaoAplicaveis(veiculoIndex);
		renderizarSistemaAplicaveis(veiculoIndex, veiculo.paginaAtual);
	}
}

function renderizarPaginacaoAplicaveis(veiculoIndex) {
	const paginacaoDiv = document.getElementById(`paginas-navegacao-aplicaveis_${veiculoIndex}`);
	paginacaoDiv.innerHTML = "";
	const veiculo = veiculosAplicaveisData[veiculoIndex];
	veiculo.sistemas.forEach((_, index) => {
		const btn = document.createElement("button");
		btn.type = "button";
		btn.innerText = index + 1;
		btn.onclick = () => mostrarPaginaAplicaveis(veiculoIndex, index);
		btn.classList.add("btn-paginacao");
		const tituloCap = veiculo.sistemas[index]?.sistema;
		btn.title = tituloCap ? `Capítulo: ${tituloCap}` : `Capítulo ${index + 1}`;
		if (index === veiculo.paginaAtual) {
			btn.classList.add("active");
		}
		paginacaoDiv.appendChild(btn);
	});
}

function salvarDadosSistemaAplicaveis(veiculoIndex, sistemaIndex) {
const veiculo = veiculosAplicaveisData[veiculoIndex];
if (!veiculo || !veiculo.sistemas[sistemaIndex]) return;

		const systemDiv = document.querySelector(`#sistemas-container-aplicaveis_${veiculoIndex} .system-block`);
		if (!systemDiv) return;

		const selectElement = systemDiv.querySelector(`select[name="sistema_aplicaveis_${veiculoIndex}_${sistemaIndex}"]`);
		const sistemaValor = selectElement.value === 'Outro' 
			? systemDiv.querySelector(`input[name="sistema_outro_aplicaveis_${veiculoIndex}_${sistemaIndex}"]`)?.value 
			: selectElement.value;
		
		const transferenciaValue = systemDiv.querySelector(`input[name="transferencia_aplicaveis_${veiculoIndex}_${sistemaIndex}"]:checked`)?.value;

		const getVal = (sel) => systemDiv.querySelector(sel)?.value || '';
		const getHtml = (sel) => systemDiv.querySelector(sel)?.innerHTML || '';
		const getRadio = (name) => systemDiv.querySelector(`input[name="${name}"]:checked`)?.value || '';

		const caixasExistentes = veiculo.sistemas[sistemaIndex] ? veiculo.sistemas[sistemaIndex].caixas : [];
		const paginasExistentes = veiculo.sistemas[sistemaIndex] ? veiculo.sistemas[sistemaIndex].paginas : [];

		veiculo.sistemas[sistemaIndex] = {
			caixas: caixasExistentes,
			paginas: paginasExistentes,

			sistema: sistemaValor,
			transferencia: transferenciaValue,
			idtransf: getVal(`#idtransf_aplicaveis_${veiculoIndex}_${sistemaIndex}`),
			paginasprev: getVal(`input[name="paginasprev_aplicaveis_${veiculoIndex}_${sistemaIndex}"]`),

			tipo_iluminacao: getRadio(`tipo_iluminacao_aplicaveis_${veiculoIndex}_${sistemaIndex}`),
			modulo_dedicado: getRadio(`modulo_dedicado_aplicaveis_${veiculoIndex}_${sistemaIndex}`),
			tipo_fusiveis: getRadio(`tipo_fusiveis_aplicaveis_${veiculoIndex}_${sistemaIndex}`),
			
			modulo: getVal(`input[name="modulo_aplicaveis_${veiculoIndex}_${sistemaIndex}"]`),
			nomematerial: getVal(`input[name="nomematerial_aplicaveis_${veiculoIndex}_${sistemaIndex}"]`),
			codmodulo: getHtml(`#codmodulo_aplicaveis_${veiculoIndex}_${sistemaIndex}`),
			codconectores: getVal(`textarea[name="codconectores_aplicaveis_${veiculoIndex}_${sistemaIndex}"]`),
			pagloc: getHtml(`#pagloc_aplicaveis_${veiculoIndex}_${sistemaIndex}`),
			pagcon: getHtml(`#pagcon_aplicaveis_${veiculoIndex}_${sistemaIndex}`),
			pagdiag: getHtml(`#pagdiag_aplicaveis_${veiculoIndex}_${sistemaIndex}`)
		};
		
		renderizarPaginacaoAplicaveis(veiculoIndex);
}

 function adicionarCaixaAplicaveis(veiculoIndex, sistemaIndex) {
     const sistema = veiculosAplicaveisData[veiculoIndex].sistemas[sistemaIndex];
     if (!sistema.caixas) sistema.caixas = [];
     sistema.caixas.push({ nome: '', descricoes: '' });
     renderizarCaixasAplicaveis(veiculoIndex, sistemaIndex);
 }

 function removerCaixaAplicaveis(veiculoIndex, sistemaIndex, caixaIndex) {
     veiculosAplicaveisData[veiculoIndex].sistemas[sistemaIndex].caixas.splice(caixaIndex, 1);
     renderizarCaixasAplicaveis(veiculoIndex, sistemaIndex);
 }

 function moverCaixaAplicaveis(veiculoIndex, sistemaIndex, caixaIndex, direcao) {
     const caixas = veiculosAplicaveisData[veiculoIndex].sistemas[sistemaIndex].caixas;
     const newIndex = caixaIndex + direcao;
     if (newIndex < 0 || newIndex >= caixas.length) return;
     const itemMovido = caixas.splice(caixaIndex, 1)[0];
     caixas.splice(newIndex, 0, itemMovido);
     renderizarCaixasAplicaveis(veiculoIndex, sistemaIndex);
 }

 function renderizarCaixasAplicaveis(veiculoIndex, sistemaIndex) {
     const container = document.getElementById(`dynamic-content-container-aplicaveis_${veiculoIndex}_${sistemaIndex}`);
     if (!container) return;
     const caixas = veiculosAplicaveisData[veiculoIndex].sistemas[sistemaIndex].caixas || [];
     container.innerHTML = '';
     caixas.forEach((caixa, i) => {
         const descId = `descricoes_aplicaveis_${veiculoIndex}_${sistemaIndex}_${i}`;
         const caixaDiv = document.createElement('div');
         caixaDiv.className = 'caixa-item';
         caixaDiv.innerHTML = `
             <label>Nome da Caixa</label>
             <input type="text" value="${caixa.nome || ''}" oninput="veiculosAplicaveisData[${veiculoIndex}].sistemas[${sistemaIndex}].caixas[${i}].nome = this.value" placeholder="Ex: Caixa de Fusíveis do Painel">
             <label>Descrições</label>
             <div class="development-field-container">
                 <div contenteditable="true" class="editable-content" id="${descId}">${caixa.descricoes || ''}</div>
                 <div class="caixa-actions-column">
                     <button type="button" class="btn-anexar" onclick="abrirSeletorArquivo('${descId}')">Anexar</button>
                     <input type="file" id="file_${descId}" class="file-input-hidden" multiple onchange="processarArquivosSelecionados('${descId}', this.files)">
                     <button type="button" class="btn-remover-caixa" onclick="removerCaixaAplicaveis(${veiculoIndex}, ${sistemaIndex}, ${i})">- Remover</button>
                     <div class="mover-buttons">
                         <button type="button" class="btn-mover-caixa" onclick="moverCaixaAplicaveis(${veiculoIndex}, ${sistemaIndex}, ${i}, -1)">▲</button>
                         <button type="button" class="btn-mover-caixa" onclick="moverCaixaAplicaveis(${veiculoIndex}, ${sistemaIndex}, ${i}, 1)">▼</button>
                     </div>
                 </div>
             </div>`;
         container.appendChild(caixaDiv);
         const descElement = document.getElementById(descId);
         descElement.oninput = () => { veiculosAplicaveisData[veiculoIndex].sistemas[sistemaIndex].caixas[i].descricoes = descElement.innerHTML; };
         setupDragAndDrop(descId);
         setupEditableContent(descId);
     });
 }

 function adicionarPaginaAplicaveis(veiculoIndex, sistemaIndex) {
     const sistema = veiculosAplicaveisData[veiculoIndex].sistemas[sistemaIndex];
     if (!sistema.paginas) sistema.paginas = [];
     sistema.paginas.push({ conteudo: '' });
     renderizarPaginasAplicaveis(veiculoIndex, sistemaIndex);
 }

 function removerPaginaAplicaveis(veiculoIndex, sistemaIndex, paginaIndex) {
     veiculosAplicaveisData[veiculoIndex].sistemas[sistemaIndex].paginas.splice(paginaIndex, 1);
     renderizarPaginasAplicaveis(veiculoIndex, sistemaIndex);
 }

 function moverPaginaAplicaveis(veiculoIndex, sistemaIndex, paginaIndex, direcao) {
     const paginas = veiculosAplicaveisData[veiculoIndex].sistemas[sistemaIndex].paginas;
     const newIndex = paginaIndex + direcao;
     if (newIndex < 0 || newIndex >= paginas.length) return;
     const itemMovido = paginas.splice(paginaIndex, 1)[0];
     paginas.splice(newIndex, 0, itemMovido);
     renderizarPaginasAplicaveis(veiculoIndex, sistemaIndex);
 }

 function renderizarPaginasAplicaveis(veiculoIndex, sistemaIndex) {
     const container = document.getElementById(`dynamic-content-container-aplicaveis_${veiculoIndex}_${sistemaIndex}`);
     if (!container) return;
     const paginas = veiculosAplicaveisData[veiculoIndex].sistemas[sistemaIndex].paginas || [];
     container.innerHTML = '';
     paginas.forEach((pagina, i) => {
         const descId = `descricoes_pagina_aplicaveis_${veiculoIndex}_${sistemaIndex}_${i}`;
         const paginaDiv = document.createElement('div');
         paginaDiv.className = 'caixa-item';
         paginaDiv.innerHTML = `
             <label>Página ${i + 1}</label>
             <div class="development-field-container">
                 <div contenteditable="true" class="editable-content" id="${descId}">${pagina.conteudo || ''}</div>
                 <div class="caixa-actions-column">
                     <button type="button" class="btn-anexar" onclick="abrirSeletorArquivo('${descId}')">Anexar</button>
                     <input type="file" id="file_${descId}" class="file-input-hidden" multiple onchange="processarArquivosSelecionados('${descId}', this.files)">
                     <button type="button" class="btn-remover-caixa" onclick="removerPaginaAplicaveis(${veiculoIndex}, ${sistemaIndex}, ${i})">- Remover</button>
                     <div class="mover-buttons">
                         <button type="button" class="btn-mover-caixa" onclick="moverPaginaAplicaveis(${veiculoIndex}, ${sistemaIndex}, ${i}, -1)">▲</button>
                         <button type="button" class="btn-mover-caixa" onclick="moverPaginaAplicaveis(${veiculoIndex}, ${sistemaIndex}, ${i}, 1)">▼</button>
                     </div>
                 </div>
             </div>`;
         container.appendChild(paginaDiv);
         const descElement = document.getElementById(descId);
         descElement.oninput = () => { veiculosAplicaveisData[veiculoIndex].sistemas[sistemaIndex].paginas[i].conteudo = descElement.innerHTML; };
         setupDragAndDrop(descId);
         setupEditableContent(descId);
     });
 }


function coletarDadosFormulario() {
	if (sistemasData.length > 0) {
		salvarDadosSistema(paginaAtual);
	}

	if (veiculosAplicaveisData.length > 0) {
		if (
			veiculosAplicaveisData[veiculoAplicavelAtual] &&
			veiculosAplicaveisData[veiculoAplicavelAtual].sistemas.length > 0 &&
			veiculosAplicaveisData[veiculoAplicavelAtual].paginaAtual >= 0
		) {
			salvarDadosSistemaAplicaveis(veiculoAplicavelAtual, veiculosAplicaveisData[veiculoAplicavelAtual].paginaAtual);
		}
		salvarDadosVeiculoAplicavel(veiculoAplicavelAtual);
	}

	const getCheckedCheckboxValues = (name) => {
		const checkboxes = document.querySelectorAll(`input[name="${name}"]:checked`);
		return Array.from(checkboxes).map(cb => cb.value);
	};

	const dataPrincipal = {
		planejado_por: document.getElementById("planejado_por").value,
		veiculo: document.getElementById("veiculo").value,
		clickup: document.getElementById("clickup").value,
		iddiagramas: document.getElementById("iddiagramas").value,
		idfusiveis: document.getElementById("idfusiveis").value,

		pasta: document.getElementById("pasta")?.value || '',
		pesquisa_texto: document.getElementById("pesquisa_texto")?.value || '',
		comentarios: document.getElementById("comentarios")?.innerHTML || '',
		ilustracao_texto: document.getElementById("ilustracao_texto")?.value || '',

		pesquisa: document.querySelector('input[name="pesquisa"]:checked')?.value,
		aplicacao_chassi: document.querySelector('input[name="aplicacao_chassi"]:checked')?.value,
		aplicacao_chassi_texto: document.getElementById("aplicacao_chassi_texto").value,
		atmt: getCheckedCheckboxValues('atmt'),
		chave: getCheckedCheckboxValues('chave'),
		startstop: document.querySelector('input[name="startstop"]:checked')?.value,
		ac: getCheckedCheckboxValues('ac'),
		tracao: getCheckedCheckboxValues("tracao"),
		outros_serie: document.getElementById("outros_serie").value,
		outros_opcional: document.getElementById("outros_opcional").value,
		qtd_partes: document.querySelector('input[name="qtd_partes"]:checked')?.value || 'uma',
		dificuldade: (function() {
			const qtdPartes = document.querySelector('input[name="qtd_partes"]:checked')?.value;
			if (qtdPartes === 'duas') {
				return document.getElementById("dificuldade_parte1")?.value || '';
			}
			return document.getElementById("dificuldade_unica")?.value || '';
		})(),
		dificuldade_parte2: document.getElementById("dificuldade_parte2")?.value || '',
		dificuldade_aplicaveis: document.getElementById("dificuldade_aplicaveis").value,
		sistemas: sistemasData
	};

	const aplicaveisAtualizados = veiculosAplicaveisData.map((veiculo, index) => {
		const container = document.querySelector(`.veiculo-aplicavel-item[data-index="${index}"]`);
		if (!container) return veiculo;

		const sistemaSelect = container.querySelector('.sistema-aplicavel');
		const sistemaValue = sistemaSelect ? sistemaSelect.value : veiculo.sistema;
		
		let sistemasDoVeiculo = veiculo.sistemas || [{}];
		let paginasColetadas = [];

		if (sistemaValue === "OUTROS") {
			const paginasContainer = container.querySelector('.paginas-extras-container');
			if (paginasContainer) {
				const itensPagina = paginasContainer.querySelectorAll('.pagina-extra-item');
				itensPagina.forEach(item => {
					const tituloInput = item.querySelector('.titulo-pagina-extra');
					const conteudoDiv = item.querySelector('.editable-content');
					paginasColetadas.push({
						titulo: tituloInput ? tituloInput.value : "Página Extra",
						conteudo: conteudoDiv ? conteudoDiv.innerHTML : "Nenhum conteúdo informado"
					});
				});
			}
		} else {
			const labels = ["Página de Localização", "Página de conectores", "Página de Diagrama"];
			const conteudos = container.querySelectorAll('.editable-content');
			labels.forEach((label, i) => {
				if (conteudos[i]) {
					paginasColetadas.push({
						titulo: label,
						conteudo: conteudos[i].innerHTML
					});
				}
			});
		}

		if (sistemasDoVeiculo[0]) {
			sistemasDoVeiculo[0].sistema = sistemaValue;
			sistemasDoVeiculo[0].paginas = paginasColetadas;
			sistemasDoVeiculo[0].outrosTitulo = container.querySelector('.outros-titulo-input')?.value || "";
		}

		return {
			...veiculo,
			sistemas: sistemasDoVeiculo
		};
	});

	return {
		principal: dataPrincipal,
		aplicaveis: aplicaveisAtualizados
	};
}

function salvarComoJSON() {
	const data = coletarDadosFormulario();
	const dataStr = JSON.stringify(data, null, 2);
	const blob = new Blob([dataStr], { type: "application/json" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	let nomeArquivo = "planejamento.json";
	if (data.principal.veiculo && data.principal.veiculo.includes('>')) {
		const partes = data.principal.veiculo.split('>');
		if (partes.length >= 5) {
			const ano = partes[1].trim();
			const modelo = partes[3].trim();
			const motor = partes[4].trim();
			nomeArquivo = `Planejamento - ${ano} ${modelo} ${motor}.json`;
		}
	} else if (data.principal.veiculo) {
		nomeArquivo = `Planejamento - ${data.principal.veiculo}.json`;
	}
	a.download = nomeArquivo;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}

function carregarDeJSON(input) {
	const file = input.files[0];
	if (file) {
		const reader = new FileReader();
		reader.onload = function(e) {
			try {
				const dataJSON = JSON.parse(e.target.result);
				const dataPrincipal = dataJSON.principal || {};
				const dataAplicaveis = dataJSON.aplicaveis || [];

				const setData = (id, value) => {
					const element = document.getElementById(id);
					if (element) { element.value = value || ''; }
				};
				const setChecked = (name, value) => {
					const element = document.querySelector(`input[name="${name}"][value="${value}"]`);
					if (element) { element.checked = true; }
				};
				const setCheckedCheckboxes = (name, values) => {
					if (!Array.isArray(values)) return;
					const checkboxes = document.querySelectorAll(`input[name="${name}"]`);
					checkboxes.forEach(cb => {
						cb.checked = values.includes(cb.value);
					});
				};

                 setData('planejado_por', dataPrincipal.planejado_por);
				setData('veiculo', dataPrincipal.veiculo);
				setData('clickup', dataPrincipal.clickup);
				setData('iddiagramas', dataPrincipal.iddiagramas);
				setData('idfusiveis', dataPrincipal.idfusiveis);
				setData('pasta', dataPrincipal.pasta);
				setData('pesquisa_texto', dataPrincipal.pesquisa_texto);
				setChecked('pesquisa', dataPrincipal.pesquisa);
				togglePesquisaTexto('principal', null);
				const comentariosElement = document.getElementById('comentarios');
				if (comentariosElement && dataPrincipal.comentarios) {
					comentariosElement.innerHTML = dataPrincipal.comentarios;
					updateEditablePlaceholder(comentariosElement);
				}
				setData('aplicacao_chassi_texto', dataPrincipal.aplicacao_chassi_texto);
				setChecked('aplicacao_chassi', dataPrincipal.aplicacao_chassi);
				setData('ilustracao_texto', dataPrincipal.ilustracao_texto);
				setCheckedCheckboxes('atmt', dataPrincipal.atmt);
				setCheckedCheckboxes('chave', dataPrincipal.chave);
				setChecked('startstop', dataPrincipal.startstop);
				setCheckedCheckboxes('ac', dataPrincipal.ac);
				setCheckedCheckboxes('tracao', dataPrincipal.tracao);
				setData('outros_serie', dataPrincipal.outros_serie);
				setData('outros_opcional', dataPrincipal.outros_opcional);
				setChecked('qtd_partes', dataPrincipal.qtd_partes || 'uma');
				toggleParte2Principal();

				// Carrega nos campos corretos baseado em qtd_partes
				if (dataPrincipal.qtd_partes === 'duas') {
					setData('dificuldade_parte1', dataPrincipal.dificuldade);
					setData('dificuldade_parte2', dataPrincipal.dificuldade_parte2);
				} else {
					setData('dificuldade_unica', dataPrincipal.dificuldade);
}
				sistemasData = dataPrincipal.sistemas || [];
				if (sistemasData.length > 0) {
					paginaAtual = 0;
					renderizarPaginacao();
					renderizarSistema(paginaAtual);
				} else {
					document.getElementById('sistemas-container').innerHTML = '';
					document.getElementById('paginas-navegacao').innerHTML = '';
				}

				veiculosAplicaveisData = dataAplicaveis;
				if (veiculosAplicaveisData.length > 0) {
					veiculoAplicavelAtual = 0;
					renderizarPaginacaoVeiculosAplicaveis();
					renderizarVeiculoAplicavel(veiculoAplicavelAtual);
				} else {
					document.getElementById('veiculos-aplicaveis-container').innerHTML = '';
					renderizarPaginacaoVeiculosAplicaveis();
				}
				setData('dificuldade_aplicaveis', dataPrincipal.dificuldade_aplicaveis);
				atualizarVisibilidadeDadosCardAplicaveis();

				alert("Arquivo JSON carregado com sucesso!");
			} catch (error) {
				console.error("Erro ao carregar ou processar o arquivo JSON:", error);
				alert("Ocorreu um erro ao carregar o arquivo. Verifique se o arquivo é um JSON válido e tente novamente.");
			}
		};
		reader.readAsText(file);
	}
}

	function validarFormularioGlobal() {
		  const erros = [];

		  document.querySelectorAll('.campo-invalido, .radio-invalido').forEach(el => el.classList.remove('campo-invalido', 'radio-invalido'));

		  const checarCampo = (id, nome) => {
			const el = document.getElementById(id);
			let valor = '';
			if (el) {
				if (el.isContentEditable) {
					valor = el.innerHTML.trim();
				} else {
					valor = el.value.trim();
				}
			}
			
			if (!el || valor === '' || valor === '<br>') {
			  erros.push(nome);
			  if (el) el.classList.add('campo-invalido');
			}
		  };

		  const checarRadio = (name, nome) => {
			const selecionado = document.querySelector(`input[name="${name}"]:checked`);
			if (!selecionado) {
			  erros.push(nome);
			  const radios = document.querySelectorAll(`input[name="${name}"]`);
			  if (radios.length > 0) {
				const container = radios[0].closest('.checkbox-inline');
				if (container) container.classList.add('radio-invalido');
			  }
			}
		  };

		  const checarAlgumCheckbox = (name, nome) => {
			const marcados = document.querySelectorAll(`input[name="${name}"]:checked`);
			if (marcados.length === 0) {
			  erros.push(nome);
			  const boxes = document.querySelectorAll(`input[name="${name}"]`);
			  if (boxes.length > 0) {
				const container = boxes[0].closest('.checkbox-inline');
				if (container) container.classList.add('radio-invalido');
			  }
			}
		  };

		  checarCampo('planejado_por', 'Planejado por');
		  checarCampo('clickup', 'Link do Card (ClickUp)');
		  checarCampo('veiculo', 'Veículo Referência');
		  checarCampo('iddiagramas', 'ID DIAGRAMAS');
		  checarCampo('idfusiveis', 'ID FUSÍVEIS');
		  checarCampo('pasta', 'Pasta do Veículo');
		  checarRadio('aplicacao_chassi', 'Associação / Chassi');

		  checarAlgumCheckbox('atmt', 'Transmissão');
		  checarAlgumCheckbox('chave', 'Comutador de Ignição');
		  checarRadio('startstop', 'Função Start/Stop');
		  checarAlgumCheckbox('ac', 'Ar-Condicionado');

		const qtdPartes = document.querySelector('input[name="qtd_partes"]:checked')?.value;
			if (qtdPartes === 'duas') {
				checarCampo('dificuldade_parte1', 'Dificuldade (Parte 1)');
				checarCampo('dificuldade_parte2', 'Dificuldade (Parte 2)');
			} else {
				checarCampo('dificuldade_unica', 'Dificuldade');
			}

           sistemasData.forEach((sistema, idx) => {
				const capLabel = `(Capítulo Principal ${idx + 1})`;
				if (!sistema.transferencia) {
					erros.push(`Opção de Transferência ${capLabel}`);
				} else if (sistema.transferencia === 'transferencia' && !sistema.idtransf) {
					erros.push(`ID de Transferência ${capLabel}`);
				} else if (sistema.transferencia !== 'modificar' && !sistema.paginasprev) {
					erros.push(`Nº páginas prevista ${capLabel}`);
					const el = document.querySelector(`input[name="paginasprev_${idx}"]`);
					if (el) el.classList.add('campo-invalido');
				}
				
				// VALIDAÇÃO DOS CAMPOS MÓDULO, NOME NO MATERIAL E CÓDIGO DE PEÇA
				const standardSystems = ['Airbag', 'Ar-condicionado', 'Central de Carroceria', 'Central Multimídia', 'Freio ABS', 'Freio de Estacionamento Eletrônico', 'Injeção Eletrônica', 'Injeção Eletrônica e Transmissão', 'Painel de Instrumentos', 'Rádio', 'Redes de Comunicação', 'Tração 4x4', 'Transmissão Automática'];
				const isCaixasForm = sistema.sistema === "Fusíveis e Relés";
				const isPaginasForm = ["Alimentação Positiva", "Conectores de Peito", "Sistema de Carga e Partida"].includes(sistema.sistema);
				const isModuloDedicado = sistema.modulo_dedicado === 'sim';
				
				// Valida apenas se for sistema padrão OU se tiver módulo dedicado
				if ((!isCaixasForm && !isPaginasForm && standardSystems.includes(sistema.sistema)) || isModuloDedicado) {
					if (!sistema.modulo || sistema.modulo.trim() === '') {
						erros.push(`Módulo principal ${capLabel}`);
						const el = document.querySelector(`input[name="modulo_${idx}"]`);
						if (el) el.classList.add('campo-invalido');
					}
					if (!sistema.nomematerial || sistema.nomematerial.trim() === '') {
						erros.push(`Nome no material ${capLabel}`);
						const el = document.querySelector(`input[name="nomematerial_${idx}"]`);
						if (el) el.classList.add('campo-invalido');
					}
					if (!sistema.codmodulo || sistema.codmodulo.trim() === '' || sistema.codmodulo.trim() === '<br>') {
						erros.push(`Código de Peça / Link ${capLabel}`);
						const el = document.getElementById(`codmodulo_${idx}`);
						if (el) el.classList.add('campo-invalido');
					}
				}
			});

		  if (veiculosAplicaveisData.length > 0) {
			salvarDadosVeiculoAplicavel(veiculoAplicavelAtual);

			veiculosAplicaveisData.forEach((veiculo, idx) => {
			  const sfx = `(Aplicável ${idx + 1})`;

			  if (!veiculo.dadosGerais.veiculo) erros.push(`Veículo Referência ${sfx}`);
			  if (!veiculo.dadosGerais.iddiagramas) erros.push(`ID DIAGRAMAS ${sfx}`);
			  if (!veiculo.dadosGerais.idfusiveis) erros.push(`ID FUSÍVEIS ${sfx}`);
               if (!veiculo.dadosGerais.pasta || veiculo.dadosGerais.pasta.trim() === '' || veiculo.dadosGerais.pasta.trim() === '<br>') erros.push(`Pasta do Veículo ${sfx}`);
			  if (!veiculo.dadosGerais.aplicacao_chassi) erros.push(`Associação / Chassi ${sfx}`);
			  
			  if (veiculo.dadosGerais.precisaPreencherItensSerie) {
				if (!Array.isArray(veiculo.itensSerie.atmt) || veiculo.itensSerie.atmt.length === 0) erros.push(`Transmissão ${sfx}`);
				if (!Array.isArray(veiculo.itensSerie.chave) || veiculo.itensSerie.chave.length === 0) erros.push(`Comutador de Ignição ${sfx}`);
				if (!veiculo.itensSerie.startstop) erros.push(`Função Start/Stop ${sfx}`);
				if (!Array.isArray(veiculo.itensSerie.ac) || veiculo.itensSerie.ac.length === 0) erros.push(`Ar-Condicionado ${sfx}`);
			  }
               
               veiculo.sistemas.forEach((sistema, sIdx) => {
				const capLabel = `(Aplicável ${idx + 1}, Capítulo ${sIdx + 1})`;
                 if (!sistema.transferencia) {
                     erros.push(`Opção de Transferência ${capLabel}`);
                 } else if (sistema.transferencia === 'transferencia_outro' && !sistema.idtransf) {
                     erros.push(`ID de Transferência ${capLabel}`);
                 } else if (sistema.transferencia !== 'modificar' && !sistema.paginasprev) {
					erros.push(`Nº páginas prevista ${capLabel}`);
					const el = document.querySelector(`input[name="paginasprev_aplicaveis_${idx}_${sIdx}"]`);
					if (el) el.classList.add('campo-invalido');
				}
               });
			});

			checarCampo('dificuldade_aplicaveis', 'Dificuldade (Aplicáveis)');
		  }

		  return [...new Set(erros)];
		}

// INÍCIO: LÓGICA DE GERAÇÃO DE PDF/ZIP

async function gerarPDF(sistemasParte2 = null) {
	// 1. Validar formulário
	const erros = validarFormularioGlobal();
	if (erros.length > 0) {
		const lista = document.getElementById('lista-campos-faltando');
		lista.innerHTML = '';
		erros.forEach(erro => {
			const li = document.createElement('li');
			li.textContent = erro;
			lista.appendChild(li);
		});
		document.getElementById('validation-modal').style.display = 'flex';
		return; 
	}

	// 2. Coletar todos os dados
	const dadosCompletos = coletarDadosFormulario();
	const dataPrincipalOriginal = dadosCompletos.principal;
	const dataAplicaveisOriginal = dadosCompletos.aplicaveis;

	const isSplit = Array.isArray(sistemasParte2) && sistemasParte2.length > 0;
	let partsToGenerate = [];

	if (isSplit) {
		const todosSistemas = dataPrincipalOriginal.sistemas;
		const sistemasParte1 = todosSistemas.filter(sistema => 
			!sistemasParte2.some(s2 => s2.sistema === sistema.sistema)
		);
		
		const pppParte1 = sistemasParte1.reduce((total, s) => total + parseInt(s.paginasprev || 0, 10), 0);
		
		const pppParte2 = sistemasParte2.reduce((total, s) => total + parseInt(s.paginasprev || 0, 10), 0);
		partsToGenerate.push({
			prefixo: "PARTE 1 - ",
			sufixoTitulo: " (PARTE 1)",
			dataPrincipal: {
				...dataPrincipalOriginal,
				sistemas: sistemasParte1,
				ppp_calculado: pppParte1
			},
			dataAplicaveis: [],
			incluirInfoGerais: true,
			incluirItensSerie: true
		});

		partsToGenerate.push({
			prefixo: "PARTE 2 - ",
			sufixoTitulo: " (PARTE 2)",
			dataPrincipal: {
				...dataPrincipalOriginal,
				sistemas: sistemasParte2,
				ppp_calculado: pppParte2
			},
			dataAplicaveis: dataAplicaveisOriginal, // Parte 2 TEM aplicáveis
			incluirInfoGerais: true, // Repete Info Gerais
			incluirItensSerie: true  // Repete Itens de Série
		});

	} else {
		const pppTotal = dataPrincipalOriginal.sistemas.reduce((total, s) => total + parseInt(s.paginasprev || 0, 10), 0);

		partsToGenerate.push({
			prefixo: "",
			sufixoTitulo: "",
			dataPrincipal: {
				...dataPrincipalOriginal,
				ppp_calculado: pppTotal
			},
			dataAplicaveis: dataAplicaveisOriginal,
			incluirInfoGerais: true,
			incluirItensSerie: true
		});
	}

	for (const [index, part] of partsToGenerate.entries()) {
		const isLastPart = index === partsToGenerate.length - 1;
		await gerarPDFDocumento(part, isLastPart, dadosCompletos);
	}
	salvarComoJSON();
}

async function gerarPDFDocumento(partData, isLastPart, dadosCompletosJSON) {
	
	const { prefixo, sufixoTitulo, dataPrincipal, dataAplicaveis, incluirInfoGerais, incluirItensSerie } = partData;
	const dataPrincipalOriginalParaZip = dadosCompletosJSON.principal;
	const dataAplicaveisOriginalParaZip = dadosCompletosJSON.aplicaveis;

	const { jsPDF } = window.jspdf;
	const doc = new jsPDF();
	const standardSystems = ['Airbag', 'Ar-condicionado', 'Central de Carroceria', 'Central Multimídia', 'Freio ABS', 'Freio de Estacionamento Eletrônico', 'Injeção Eletrônica', 'Injeção Eletrônica e Transmissão', 'Painel de Instrumentos', 'Rádio', 'Redes de Comunicação', 'Tração 4x4', 'Transmissão Automática'];
	let y = 10;
	const margin = 10;
	const lineHeight = 7;
	const pageHeight = doc.internal.pageSize.height;
	const lineSpacing = 6;

	const zip = new JSZip();
	const rootPrincipal = zip.folder('Veículo Principal');
	const rootAplicaveis = zip.folder('Veículos Aplicáveis');
	
	const sanitizeName = (name) => (name || '').toString().replace(/[\\\/:*?"<>|]/g, '').trim().slice(0, 120) || 'Sem título';
	const toArrayBuffer = async (dataUrl) => {
		const res = await fetch(dataUrl);
		return await res.arrayBuffer();
	};
	
	function hexToRgb(hex) {
		const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
		return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : [0, 0, 0];
	}

	function parseRgb(rgbString) {
		const match = rgbString.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
		return match ? [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])] : [0, 0, 0];
	}
	
	function mapFontSize(size) {
		const sizeNum = parseInt(size);
		const sizeMap = { 1: 8, 2: 10, 3: 12, 4: 14, 5: 18 };
		return sizeMap[sizeNum] || 12;
	}
     
	function htmlToFragments(element, parentStyle = {}, listState = null) {
		let fragments = [];
		const defaultStyle = {
			fontStyle: 'italic',
			fontWeight: 'normal',
			textDecoration: 'none',
			color: [0, 0, 0],
			fontSize: 12,
			isLink: false,
			url: '',
			isPath: false
		};
		let currentStyle = { ...defaultStyle, ...parentStyle };

		for (const node of element.childNodes) {
			if (node.nodeType === Node.TEXT_NODE) {
				const text = node.textContent;
				if (text && (text.trim().length > 0 || text === ' ' || text.includes('\n'))) {
					const isLikelyPath = /^[a-zA-Z]:\\|^\\\\/.test(text.trim());
					const isLikelyUrl = /(https?:\/\/|www\.)/.test(text.trim());
					
					fragments.push({
						type: isLikelyUrl ? 'link' : 'text',
						text: text, 
						style: {
							...currentStyle,
							isLink: isLikelyUrl,
							url: isLikelyUrl ? (text.trim().startsWith('http') ? text.trim() : 'http://' + text.trim()) : '',
							isPath: isLikelyPath,
							textDecoration: 'none',
							fontStyle: 'italic',
							color: isLikelyPath ? [0, 128, 0] : (isLikelyUrl ? [0, 0, 255] : currentStyle.color)
						}
					});
				}
			} else if (node.nodeType === Node.ELEMENT_NODE) {
				let newStyle = { ...currentStyle };
				let specialFragment = null;
				let nextListState = listState;
				let skipChildren = false;

				// Tratamento de blocos que forçam quebra de linha
				if (['div', 'p'].includes(node.tagName.toLowerCase())) {
					if (fragments.length > 0 && fragments[fragments.length - 1].type !== 'br') {
						fragments.push({ type: 'br' });
					}
				}

				switch (node.tagName.toLowerCase()) {
					case 'b': case 'strong': newStyle.fontWeight = 'bold'; break;
					case 'i': case 'em': newStyle.fontStyle = 'italic'; break;
					case 'u': newStyle.textDecoration = 'underline'; break;
					case 'font':
						if (node.color) newStyle.color = hexToRgb(node.color);
						if (node.size) newStyle.fontSize = mapFontSize(node.size);
						break;
					case 'span':
						if (node.style.color) newStyle.color = parseRgb(node.style.color);
						if (node.style.fontWeight === 'bold') newStyle.fontWeight = 'bold';
						if (node.style.fontStyle === 'italic') newStyle.fontStyle = 'italic';
						break;
					case 'br': specialFragment = { type: 'br' }; break;
					case 'img':
						specialFragment = {
							type: 'image',
							src: node.getAttribute('data-original-image'),
							filename: node.getAttribute('data-filename') || 'imagem.png',
							style: { ...currentStyle }
						};
						break;
					case 'a':
						const href = node.getAttribute('href') || '';
						const isLikelyPath = /^[a-zA-Z]:\\|^\\\\/.test(href.trim());
						const isLikelyUrl = /(https?:\/\/|www\.)/.test(href.trim());

						if (isLikelyPath) {
							// Para caminhos de PASTA, escrevemos o endereço completo em verde
							fragments.push({
								type: 'text',
								text: href,
								style: {
									...currentStyle,
									isPath: true,
									fontStyle: 'italic',
									color: [0, 128, 0]
								}
							});
							skipChildren = true;
						} else if (isLikelyUrl) {
							// Para links de INTERNET, usamos o tipo 'link' para exibir "LINK" no PDF
							fragments.push({
								type: 'link',
								text: href,
								link: href.startsWith('http') ? href : 'http://' + href,
								style: {
									...currentStyle,
									fontStyle: 'italic',
									color: [0, 0, 255]
								}
							});
							skipChildren = true;
						} else if (node.classList.contains('attachment')) {
							specialFragment = {
								type: 'attachment',
								src: node.getAttribute('href'),
								filename: node.getAttribute('data-filename') || 'anexo',
								style: { ...currentStyle }
							};
							skipChildren = true;
						} else {
							newStyle.isLink = true;
							newStyle.url = href;
							newStyle.color = [0, 0, 255];
						}
						break;
					case 'ul': nextListState = { type: 'ul' }; break;
					case 'ol': nextListState = { type: 'ol', counter: 1 }; break;
					case 'li':
						if (fragments.length > 0 && fragments[fragments.length - 1].type !== 'br') {
							fragments.push({ type: 'br' });
						}
						if (listState) {
							let indent = '    ';
							let marker = listState.type === 'ul' ? '•  ' : `${listState.counter++}.  `;
							fragments.push({ type: 'text', text: indent + marker, style: currentStyle });
						}
						break;
				}

				if (specialFragment) fragments.push(specialFragment);

				if (node.hasChildNodes() && !skipChildren) {
					fragments = fragments.concat(htmlToFragments(node, newStyle, nextListState));
				}

				if (['ul', 'ol'].includes(node.tagName.toLowerCase())) {
					if (fragments.length > 0 && fragments[fragments.length - 1].type !== 'br') {
						fragments.push({ type: 'br' });
					}
				}
			}
		}
		return fragments;
	}

	async function renderFragments(fragments, x, startY, maxWidth, rootFolder, sistema, idx, isAplicavel = false, veiculo = null, veiculoIndex = 0) {
		let currentX = x;
		let currentY = startY;
		const pageBottom = pageHeight - margin;
		const dataPrincipalOriginal = dadosCompletosJSON.principal;
		
		const getCombinedFontStyle = (style) => {
			if (style.fontWeight === 'bold' && style.fontStyle === 'italic') return 'bolditalic';
			if (style.fontWeight === 'bold') return 'bold';
			if (style.fontStyle === 'italic') return 'italic';
			return 'normal';
		};

		const applyStyle = (style) => {
			doc.setFontSize(style.fontSize || 12);
			doc.setFont('helvetica', getCombinedFontStyle(style));
			doc.setTextColor(style.color[0], style.color[1], style.color[2]);
		};

		for (const fragment of fragments) {
			if (currentY > pageBottom) {
				doc.addPage();
				currentY = margin;
				currentX = x;
			}

			if (fragment.type === 'text' || fragment.type === 'link') {
            if (fragment.style && fragment.style.isPath) {
               const pathFontSize = fragment.style.fontSize || 12;
					const availableWidth = maxWidth - currentX;

					applyStyle({ ...fragment.style, fontSize: pathFontSize });

					let pathText = fragment.text;
					while (pathText.length > 0) {
						let fitLength = pathText.length;
						let part = pathText;

						while (doc.getTextWidth(part) > availableWidth && fitLength > 1) {
							fitLength--;
							part = pathText.substring(0, fitLength);
						}

						let needsHyphen = fitLength < pathText.length;
						if (needsHyphen) part += '-';

						doc.text(part, currentX, currentY);

						currentY += lineHeight;
						currentX = x;
						pathText = pathText.substring(fitLength);
					}
                continue;
            }
				
				if (fragment.type === 'link' || (fragment.style && fragment.style.isLink)) {
					applyStyle(fragment.style);
					
					let urlDest = fragment.link || (fragment.style && fragment.style.url) || fragment.text;
					urlDest = urlDest.trim();
					
					if (!urlDest.startsWith('http') && !urlDest.startsWith('mailto:')) {
						urlDest = 'http://' + urlDest;
					}
					
					const displayLinkText = "LINK";
					const tw = doc.getTextWidth(displayLinkText);
					const th = (fragment.style.fontSize || 12) * 0.3527; // Converte pt para mm aproximadamente

					doc.setTextColor(0, 0, 255);
					doc.text(displayLinkText, currentX, currentY);
					doc.link(currentX, currentY - th, tw, th, { url: urlDest });
					
					doc.setDrawColor(0, 0, 255);
					doc.line(currentX, currentY + 0.5, currentX + tw, currentY + 0.5);
					
					currentX += tw + 2;
				} 
				else {
					applyStyle(fragment.style);
					const textContent = fragment.text || "";
					const lines = textContent.split('\n');

					for (let i = 0; i < lines.length; i++) {
						const line = lines[i];
						if (line.length > 0 || lines.length > 1) {
							const words = line.split(/(\s+)/).filter(w => w.length > 0);
							for (const word of words) {
								const wordWidth = doc.getTextWidth(word);
								if (currentX + wordWidth > (x + maxWidth) && word.trim().length > 0) {
									currentY += lineHeight;
									currentX = x;
									if (currentY > pageBottom) { doc.addPage(); currentY = margin; }
								}
								doc.text(word, currentX, currentY);
								currentX += wordWidth;
							}
						}
						if (i < lines.length - 1) {
							currentY += lineHeight;
							currentX = x;
							if (currentY > pageBottom) { doc.addPage(); currentY = margin; }
						}
					}
				}
			} else if (fragment.type === 'br') {
						currentY += lineHeight;
						currentX = x;
					} else if (fragment.type === 'image' && fragment.src) {
						if (currentY + 20 > pageBottom) { doc.addPage(); currentY = margin; currentX = x; }
						
						let folderName;
						let baseFolder;

						if(isAplicavel) {
							const veiculoRef = veiculo ? sanitizeName(extrairTooltipVeiculo(veiculo.dadosGerais.veiculo)) : `Veiculo ${veiculoIndex + 1}`;
							baseFolder = rootAplicaveis.folder(veiculoRef);
						} else {
							baseFolder = rootPrincipal;
						}

						if(sistema) {
							const capTitulo = sanitizeName(sistema.sistema || `Capitulo ${idx + 1}`);
							folderName = getChapterFolderName(isAplicavel ? veiculo : dataPrincipalOriginal, sistema, capTitulo);
						} else {
							folderName = "Informações Gerais";
						}
						
						const targetFolder = baseFolder.folder(folderName);
						const fileBuffer = await toArrayBuffer(fragment.src);
						targetFolder.file(fragment.filename, fileBuffer);
						
						// Adiciona texto "imagem.png (ANEXADO NO ZIP)"
						// applyStyle({ ...fragment.style, color: [150, 0, 0], fontStyle: 'italic' });
						// const zipText = `${fragment.filename} (ANEXADO NO ZIP)`;
						// doc.text(zipText, currentX, currentY);
						// currentX += doc.getTextWidth(zipText) + 2;
						
						try {
							const imgProps = doc.getImageProperties(fragment.src);
							// Define largura igual à largura útil da página (maxWidth)
							let imgW = maxWidth;
							// Calcula altura proporcional
							let imgH = (imgProps.height * imgW) / imgProps.width;

							// Verifica se cabe na página atual, senão cria nova
							if (currentY + imgH > pageBottom) {
								doc.addPage();
								currentY = margin;
							}

							doc.addImage(fragment.src, imgProps.fileType, x, currentY, imgW, imgH);
							
							// Atualiza a posição Y para depois da imagem (+ um pequeno espaço)
							currentY += imgH + 5; 
							currentX = x; // Reseta X para a margem esquerda
						} catch (err) {
							console.error("Erro ao renderizar imagem:", err);
							// Fallback: Se der erro na imagem, mostra o texto antigo
							applyStyle({ ...fragment.style, color: [150, 0, 0], fontStyle: 'italic' });
							const zipText = `${fragment.filename} (ANEXADO NO ZIP - Erro ao renderizar)`;
							doc.text(zipText, currentX, currentY);
							currentX += doc.getTextWidth(zipText) + 2;
							}

					} else if (fragment.type === 'attachment') {
						if (currentY + 20 > pageBottom) { doc.addPage(); currentY = margin; currentX = x; }
						
						let folderName;
						let baseFolder;

						if(isAplicavel) {
							const veiculoRef = veiculo ? sanitizeName(extrairTooltipVeiculo(veiculo.dadosGerais.veiculo)) : `Veiculo ${veiculoIndex + 1}`;
							baseFolder = rootAplicaveis.folder(veiculoRef);
						} else {
							baseFolder = rootPrincipal;
						}

						if(sistema) {
							const capTitulo = sanitizeName(sistema.sistema || `Capitulo ${idx + 1}`);
							folderName = getChapterFolderName(isAplicavel ? veiculo : dataPrincipalOriginal, sistema, capTitulo);
						} else {
							folderName = "Informações Gerais";
						}
						
						const targetFolder = baseFolder.folder(folderName);
						const fileBuffer = await toArrayBuffer(fragment.src);
						targetFolder.file(fragment.filename, fileBuffer);

						applyStyle({ ...fragment.style, color: [0, 0, 150], fontStyle: 'italic' });
						const zipText = `${fragment.filename} (ANEXADO NO ZIP)`;
						doc.text(zipText, currentX, currentY);
						currentX += doc.getTextWidth(zipText) + 2;
					}
				}

				return currentY;
			}
	
	const addText = (text, size, style = 'normal', indent = 0) => {
		if (!text) return;
		const maxWidth = doc.internal.pageSize.width - (margin * 2) - indent;
		doc.setFontSize(size);
		doc.setFont('helvetica', style);
		const paragraphs = String(text).split('\n');
		for (const paragraph of paragraphs) {
			const lines = doc.splitTextToSize(paragraph, maxWidth);
			for (const line of lines) {
				if (y + lineHeight > pageHeight - margin) { doc.addPage(); y = margin; }
				doc.text(line, margin + indent, y);
				y += lineHeight;
			}
		}
	};

	const addLabeledValue = (label, value, indent = 0, size = 12) => {
		if (value === undefined || value === null || String(value).trim() === '') return;
		const fullLabel = `- ${label}: `;
		const fullValue = String(value);
		const availableWidth = doc.internal.pageSize.width - margin * 2;
		const x = margin + indent;
		doc.setFontSize(size);
		doc.setFont('helvetica', 'bold');
		const labelWidth = doc.getTextWidth(fullLabel);
		doc.setFont('helvetica', 'normal');
		const valueWidth = availableWidth - x - labelWidth;
		const paragraphs = fullValue.split('\n');
		let isFirstLineOfValue = true;
		for (const paragraph of paragraphs) {
			const lines = doc.splitTextToSize(paragraph, valueWidth);
			for (const line of lines) {
				 if (y + lineHeight > pageHeight - margin) { doc.addPage(); y = margin; }
				if (isFirstLineOfValue) {
					doc.setFont('helvetica', 'bold');
					doc.text(fullLabel, x, y);
					doc.setFont('helvetica', 'normal');
					doc.text(line, x + labelWidth, y);
					isFirstLineOfValue = false;
				} else {
					doc.text(line, x + labelWidth, y);
				}
				y += lineHeight;
			}
		}
	};

	async function addRichContent(htmlString, startY, indent, rootFolder, sistema, idx, isAplicavel = false, veiculo = null, veiculoIndex = 0) {
		if (!htmlString || !htmlString.trim()) {
			addText('Nenhum conteúdo informado.', 12, 'italic', indent);
			return y + lineHeight;
		}
		const tempDiv = document.createElement('div');
		tempDiv.innerHTML = htmlString;
		const fragments = htmlToFragments(tempDiv);
		const finalY = await renderFragments(fragments, margin + indent, startY, doc.internal.pageSize.width - (margin * 2) - indent, rootFolder, sistema, idx, isAplicavel, veiculo, veiculoIndex);
		doc.setTextColor(0, 0, 0);
		return finalY;
	}
	
	const formatArray = (arr) => Array.isArray(arr) && arr.length ? arr.join(', ') : '';
	const mapStartStop = (v) => ({ sim_serie: 'Sim (De Série)', sim_opcional: 'Sim (Opcional)', nao: 'Não' }[v] || '');

	const addCenteredText = (text, size, style = 'normal', color = [0, 0, 0]) => {
		if (y > pageHeight - margin) { doc.addPage(); y = margin; }
		doc.setFontSize(size);
		doc.setFont('helvetica', style);
		doc.setTextColor(color[0], color[1], color[2]);
		const textWidth = doc.getTextWidth(text);
		const centerX = (doc.internal.pageSize.width - textWidth) / 2;
		doc.text(text, centerX, y);
		y += lineHeight;
		doc.setTextColor(0, 0, 0);
	};
	
	
	const addColoredText = (text, size, style = 'normal', indent = 0, color = [0, 0, 0]) => {
		if (y > pageHeight - margin) { doc.addPage(); y = margin; }
		doc.setFontSize(size);
		doc.setFont('helvetica', style);
		doc.setTextColor(color[0], color[1], color[2]);
		const textWidth = doc.getTextWidth(text);
		const centerX = (doc.internal.pageSize.width - textWidth) / 2;
		doc.text(text, centerX, y);
		y += lineHeight;
		doc.setTextColor(0, 0, 0);
	};

	const addHighlightedText = (text, size, style = 'bold', indent = 0, r = 212, g = 255, b = 214) => {
		if (y > pageHeight - margin) { doc.addPage(); y = margin; }
		doc.setFontSize(size);
		doc.setFont('helvetica', style);
		const x = margin + indent;
		const textWidth = doc.getTextWidth(text);
		const rectX = x - 2;
		const rectY = y - lineHeight + 1.5;
		const rectW = textWidth + 4;
		const rectH = lineHeight;
		doc.setFillColor(r, g, b);
		doc.rect(rectX, rectY, rectW, rectH, 'F');
		doc.setTextColor(0, 0, 0);
		doc.text(text, x, y);
		y += lineHeight;
	};
	
	const addSeparatorLine = () => {
		if (y > pageHeight - margin) { doc.addPage(); y = margin; }
		doc.setDrawColor(128, 128, 128);
		doc.setLineWidth(0.5);
		doc.line(margin, y, doc.internal.pageSize.width - margin, y);
		y += lineHeight;
	};
	
	const titleColor = [68, 114, 196];

	// --- VEÍCULO PRINCIPAL ---
	addCenteredText(`PLANEJAMENTO - VEÍCULO PRINCIPAL${sufixoTitulo}`, 20, 'bold');
	addColoredText(dataPrincipal.clickup, 14, 'italic', 0, titleColor);
	
	if (incluirInfoGerais) {
		y += lineHeight * 2;
		addColoredText("INFORMAÇÕES GERAIS", 18, 'bold', 0, titleColor);
		y += lineSpacing;
		addLabeledValue('PLANEJADO POR', dataPrincipal.planejado_por);
		addText('- VEÍCULO REFERÊNCIA:', 12, "bold", 0);
		addText(dataPrincipal.veiculo, 10, "italic", 4);
		y += lineHeight;
		addLabeledValue('ID DIAGRAMAS', dataPrincipal.iddiagramas);
		addLabeledValue('ID FUSÍVEIS', dataPrincipal.idfusiveis);
		
		y += lineHeight;
		
		addText('- PASTA DO VEÍCULO:', 12, "bold", 0);
		y = await addRichContent(dataPrincipal.pasta, y, 4, rootPrincipal, null, -1);
				
		y += lineHeight;
		
		addText('- IMPORTANTE PARA O DESENVOLVIMENTO:', 12, 'bold', 0);
		y = await addRichContent(dataPrincipal.comentarios, y, 4, rootPrincipal, null, -1);
		
		y += 14;
		
		addLabeledValue('ASSOCIAÇÃO / CHASSI', dataPrincipal.aplicacao_chassi === 'mesma' ? 'Mesma associação' : (dataPrincipal.aplicacao_chassi === 'ajustar' ? 'Ajustar associação' : 'N/A'));
		if (dataPrincipal.aplicacao_chassi_texto) {
			addText(dataPrincipal.aplicacao_chassi_texto, 12, 'normal', 4);
		}
		
		y += lineHeight;
		
		addText('- PEDIDOS DE ILUSTRAÇÃO / TRATAMENTO DE IMAGEM:', 12, 'bold', 0);
		y = await addRichContent(dataPrincipal.ilustracao_texto || 'Nenhum pedido.', y, 4, rootPrincipal, null, -1);
		
		y += lineHeight;
		
		addLabeledValue('PESQUISA', dataPrincipal.pesquisa === 'sim' ? 'Sim' : 'Não');
		if (dataPrincipal.pesquisa === 'sim' && dataPrincipal.pesquisa_texto) {
		y = await addRichContent(dataPrincipal.pesquisa_texto, y, 4, rootPrincipal, null, -1);
		}
		
		y += lineHeight;
		
	}

	if (incluirItensSerie) {
		addText('- ITENS DE SÉRIE / OPCIONAIS:', 12, "bold", 0);
		addLabeledValue('Tipo de Chave', formatArray(dataPrincipal.chave));
		addLabeledValue('Função Start/Stop', mapStartStop(dataPrincipal.startstop));
		addLabeledValue('Ar-condicionado', formatArray(dataPrincipal.ac));
		addLabeledValue('Transmissão', formatArray(dataPrincipal.atmt));
		addLabeledValue('Tração', formatArray(dataPrincipal.tracao));
		addText('- Outros (De Série):', 12, "bold", 0);
		addText(dataPrincipal.outros_serie, 12, "normal", 4);
		addText('- Outros (Opcionais):', 12, "bold", 0);
		addText(dataPrincipal.outros_opcional, 12, "normal", 4);
		
		y += lineSpacing;
		y += 6;
	} // Fim do if (incluirItensSerie)
	
	addColoredText("SISTEMAS", 18, 'bold', 0, titleColor);
	y += lineSpacing;
	
	if (dataPrincipal.sistemas && dataPrincipal.sistemas.length > 0) {
		for (const [idx, sistema] of dataPrincipal.sistemas.entries()) {
			if (y > pageHeight - margin * 4) { doc.addPage(); y = margin; }
			y += lineSpacing / 2;

			let tituloCapitulo = sistema.sistema || '';
			if (sistema.sistema === 'Iluminação') {
				if (sistema.tipo_iluminacao === 'interna') tituloCapitulo = 'ILUMINAÇÃO INTERNA';
				else if (sistema.tipo_iluminacao === 'externa') tituloCapitulo = 'ILUMINAÇÃO EXTERNA';
				else if (sistema.tipo_iluminacao === 'ambos') tituloCapitulo = 'ILUMINAÇÃO INTERNA E EXTERNA';
				else tituloCapitulo = 'ILUMINAÇÃO';
			} else if (sistema.sistema === 'Fusíveis e Relés') {
				const tipo = (sistema.tipo_fusiveis || 'Simplificado').toUpperCase();
				tituloCapitulo = `FUSÍVEIS E RELÉS (${tipo})`;
			} else if (sistema.sistema === 'Outro' && !tituloCapitulo) {
				tituloCapitulo = 'Outro (Não especificado)'.toUpperCase();
			} else {
				tituloCapitulo = tituloCapitulo.toUpperCase();
			}
			
			addHighlightedText(`${tituloCapitulo}`, 14, 'bold', 0, 212, 255, 214);
			
			let linhaTransferencia = '';
			if (sistema.transferencia === 'transferencia') linhaTransferencia = `- Transferência - ID: ${sistema.idtransf || ''}`;
			else if (sistema.transferencia === 'zero') linhaTransferencia = `- Fazer do Zero`;
			else if (sistema.transferencia === 'modificar') linhaTransferencia = `- Modificar Publicado`;
			if (linhaTransferencia) addText(linhaTransferencia, 12, "bold", 0);
			
			addLabeledValue('Nº páginas prevista', `${sistema.transferencia === 'modificar' ? '0' : (sistema.paginasprev || '')}`);
			
			const standardSystems = ['Airbag', 'Ar-condicionado', 'Central de Carroceria', 'Central Multimídia', 'Freio ABS', 'Freio de Estacionamento Eletrônico', 'Injeção Eletrônica', 'Injeção Eletrônica e Transmissão', 'Painel de Instrumentos', 'Rádio', 'Redes de Comunicação', 'Tração 4x4', 'Transmissão Automática'];
			const isCaixasForm = sistema.sistema === "Fusíveis e Relés";
			const isPaginasForm = ["Alimentação Positiva", "Conectores de Peito", "Sistema de Carga e Partida"].includes(sistema.sistema);
			const isModuloDedicado = sistema.modulo_dedicado === 'sim';
			const isStandardModuleForm = standardSystems.includes(sistema.sistema);
			
			if (sistema.sistema === 'Iluminação' || (sistema.sistema === 'Outro' && tituloCapitulo !== 'Outro (Não especificado)')) {
				addLabeledValue('Módulo Dedicado', isModuloDedicado ? 'Sim' : 'Não');
			}

			// EXIBE OS CAMPOS DE MÓDULO para sistemas padrão OU quando tem módulo dedicado
			if (isStandardModuleForm || isModuloDedicado) {
				addLabeledValue('Módulo principal', `${sistema.modulo || ''}`);
				addLabeledValue('Nome no material', `${sistema.nomematerial || ''}`);
				addText(`- Códigos de Conectores:`, 12, "bold", 0);
				addText(`${sistema.codconectores || ''}`, 12, 'normal', 4)
				addText(`- Código de Peça / Link:`, 12, "bold", 0);
				y = await addRichContent(sistema.codmodulo, y, 4, rootPrincipal, sistema, idx);
				y += 6;
			}
			y += 6;

			addText('DESENVOLVIMENTO:', 14, "bold", 0);
			y += lineSpacing / 2;

			// RENDERIZA O DESENVOLVIMENTO baseado no tipo
			if (isCaixasForm) {
				if (sistema.caixas && sistema.caixas.length > 0) {
					for (const [caixaIdx, caixa] of sistema.caixas.entries()) {
						addText(`- Caixa ${caixaIdx + 1}: ${caixa.nome || 'Sem nome'}`, 12, "bold", 0);
						y = await addRichContent(caixa.descricoes, y, 4, rootPrincipal, sistema, idx);
						y += lineHeight * 2;
					}
				} else { addText('Nenhuma caixa adicionada.', 12, 'italic', 4); y += lineHeight; }
			} 
			else if (isPaginasForm || (!isModuloDedicado && !isStandardModuleForm)) {
				if (sistema.paginas && sistema.paginas.length > 0) {
					for (const [paginaIdx, pagina] of sistema.paginas.entries()) {
						addText(`- Página ${paginaIdx + 1}:`, 12, "bold", 0);
						y = await addRichContent(pagina.conteudo, y, 4, rootPrincipal, sistema, idx);
						y += lineHeight * 2;
					}
				} else { addText('Nenhuma página adicionada.', 12, 'italic', 4); y+= lineHeight; }
			} 
			else {
				addText(`- Página de Localização:`, 12, "bold", 0);
				y = await addRichContent(sistema.pagloc, y, 4, rootPrincipal, sistema, idx);
				y += lineHeight * 2;
				addText(`- Página de Conectores:`, 12, "bold", 0);
				y = await addRichContent(sistema.pagcon, y, 4, rootPrincipal, sistema, idx);
				y += lineHeight * 2;
				addText(`- Página de Diagramas:`, 12, "bold", 0);
				y = await addRichContent(sistema.pagdiag, y, 4, rootPrincipal, sistema, idx);
				y += lineHeight * 2;
			}
		}
	} else { addText("Nenhum sistema adicionado (nesta parte).", 12, "italic", 4); y += lineHeight; }
	y += lineHeight;
	addSeparatorLine();
	y += lineHeight;

	addColoredText("DADOS DO CARD", 18, 'bold', 0, titleColor);
	y += lineHeight;

	// Se for PARTE 2 e houver dados específicos, usa eles; senão usa os da Parte 1
	const dificuldadeExibir = (prefixo === "PARTE 2 - " && dataPrincipal.dificuldade_parte2) 
		? dataPrincipal.dificuldade_parte2 
		: dataPrincipal.dificuldade;
	
	addText(`DIFICULDADE:`, 14, "bold", 0);
	addText(`- ${dificuldadeExibir}`, 12, 'normal', 4);
	

	let somaTotal = dataPrincipal.ppp_calculado || 0;
	let somaTransferidas = 0, somaCriadas = 0;
	if (dataPrincipal.sistemas) dataPrincipal.sistemas.forEach(s => {
		const paginas = parseInt(s.paginasprev) || 0;
		if (s.transferencia === 'transferencia' || s.transferencia === 'modificar') somaTransferidas += paginas;
		else somaCriadas += paginas;
	});
	y += lineSpacing;
	addText(`PPP:`, 14, "bold", 0);
	addText(`- Total (esta parte): ${somaTotal}\n- Páginas Criadas do zero: ${somaCriadas}\n- Páginas Transferidas: ${somaTransferidas}`, 12, "normal", 4);

	//VEÍCULOS APLICÁVEIS
	if (dataAplicaveis && dataAplicaveis.length > 0) {
		doc.addPage();
		y = margin;
		addCenteredText("PLANEJAMENTO - VEÍCULOS APLICÁVEIS", 20, 'bold');
		for (const [index, veiculo] of dataAplicaveis.entries()) {
			if (y > pageHeight - margin * 4) { doc.addPage(); y = margin; }
			y += lineSpacing;
			y += lineHeight;
			
			addColoredText(`VEÍCULO APLICÁVEL #${index + 1}`, 18, "bold", 0, titleColor);
			y += lineSpacing;
			
			addText('- VEÍCULO REFERÊNCIA:', 12, "bold", 0);
			addText(veiculo.dadosGerais.veiculo, 10, "italic", 4);
			
			y += lineSpacing;
			
			addLabeledValue('ID DIAGRAMAS', veiculo.dadosGerais.iddiagramas);
			addLabeledValue('ID FUSÍVEIS', veiculo.dadosGerais.idfusiveis);
			
			y += lineSpacing;
			
			addText('- PASTA DO VEÍCULO:', 12, "bold");
			y = await addRichContent(veiculo.dadosGerais.pasta, y, 4, rootAplicaveis, null, -1, true, veiculo, index);
			
			y += lineHeight * 2;
			
			addText('- IMPORTANTE PARA O DESENVOLVIMENTO:', 12, 'bold');
			y = await addRichContent(veiculo.dadosGerais.comentarios, y, 4, rootAplicaveis, null, -1, true, veiculo, index);
			
			y += lineHeight;
			y += lineHeight / 2;
			
			addLabeledValue('ASSOCIAÇÃO / CHASSI', veiculo.dadosGerais.aplicacao_chassi === 'mesma' ? 'Mesma associação' : (veiculo.dadosGerais.aplicacao_chassi === 'ajustar' ? 'Ajustar associação' : 'N/A'));
			if (veiculo.dadosGerais.aplicacao_chassi_texto) {
				addText(veiculo.dadosGerais.aplicacao_chassi_texto, 12, 'normal', 4);
			}
			y += lineHeight;

			addText('- PEDIDOS DE ILUSTRAÇÃO / TRATAMENTO DE IMAGEM:', 12, 'bold');
			y = await addRichContent(veiculo.dadosGerais.ilustracao_texto || 'Nenhum pedido.', y, 4, rootAplicaveis, null, -1, true, veiculo, index);
			
			y += lineHeight * 2;
			
			addLabeledValue('PESQUISA', veiculo.dadosGerais.pesquisa === 'sim' ? 'Sim' : 'Não');
			if (veiculo.dadosGerais.pesquisa === 'sim' && veiculo.dadosGerais.pesquisa_texto) {
				y = await addRichContent(veiculo.dadosGerais.pesquisa_texto, y, 4, rootAplicaveis, null, -1, true, veiculo, index);
			}
						
			if (veiculo.dadosGerais.precisaPreencherItensSerie) {                    
				addText('- ITENS DE SÉRIE/OPCIONAIS:', 12, "bold");
				addLabeledValue('Tipo de Chave', formatArray(veiculo.itensSerie.chave));
				addLabeledValue('Função Start/Stop', mapStartStop(veiculo.itensSerie.startstop));
				addLabeledValue('Ar-condicionado', formatArray(veiculo.itensSerie.ac));
				addLabeledValue('Transmissão', formatArray(veiculo.itensSerie.atmt));
				addLabeledValue('Tração', formatArray(veiculo.itensSerie.tracao));
				addText('- Outros (De Série):', 12, "bold", 0);
				addText(veiculo.itensSerie.outros_serie, 12, "normal", 4);
				addText('- Outros (Opcionais):', 12, "bold", 0);
				addText(veiculo.itensSerie.outros_opcional, 12, "normal", 4);
				y += lineHeight;
				y += 6;
			}
			
			y += lineHeight * 2;
			addColoredText("SISTEMAS", 18, 'bold', 0, titleColor);
			if (veiculo.sistemas && veiculo.sistemas.length > 0) {
				for (const [idx, sistema] of veiculo.sistemas.entries()) {
					if (y > pageHeight - margin * 4) { doc.addPage(); y = margin; }
					y += lineHeight;

					let tituloCapitulo = sistema.sistema || '';
					if (sistema.sistema === 'Iluminação') {
						if (sistema.tipo_iluminacao === 'interna') tituloCapitulo = 'ILUMINAÇÃO INTERNA';
						else if (sistema.tipo_iluminacao === 'externa') tituloCapitulo = 'ILUMINAÇÃO EXTERNA';
						else if (sistema.tipo_iluminacao === 'ambos') tituloCapitulo = 'ILUMINAÇÃO INTERNA E EXTERNA';
						else tituloCapitulo = 'ILUMINAÇÃO';
					} else if (sistema.sistema === 'Fusíveis e Relés') {
						const tipo = (sistema.tipo_fusiveis || 'Simplificado').toUpperCase();
						tituloCapitulo = `FUSÍVEIS E RELÉS (${tipo})`;
					} else if (sistema.sistema === 'Outro' && !tituloCapitulo) {
						tituloCapitulo = 'Outro (Não especificado)'.toUpperCase();
					} else {
						tituloCapitulo = tituloCapitulo.toUpperCase();
					}
					
					addHighlightedText(`${tituloCapitulo}`, 14, 'bold', 0, 250, 231, 67);
					
					if (sistema.transferencia === 'transferencia_principal') {
						const idPrincipal = (sistema.sistema === 'Fusíveis e Relés')
							? dataPrincipal.idfusiveis // Usa o ID Fusiveis do *principal*
							: dataPrincipal.iddiagramas; // Usa o ID Diagramas do *principal*
						addLabeledValue('Transferência (do Principal) - ID', ` ${idPrincipal || 'N/A'}`);
					} else if (sistema.transferencia === 'transferencia_outro') {
						addLabeledValue('Transferência (Outro) - ID', ` ${sistema.idtransf || 'N/A'}`);
					} else if (sistema.transferencia === 'modificar') {
						addText(`- Modificar Publicado`, 12, "normal", 0);
					}
					addLabeledValue('Nº páginas prevista', sistema.transferencia === 'modificar' ? '0' : sistema.paginasprev);
					
					const isCaixasForm = sistema.sistema === "Fusíveis e Relés";
					const isPaginasFixas = ["Alimentação Positiva", "Conectores de Peito", "Sistema de Carga e Partida"].includes(sistema.sistema);
					const isModuloDedicado = String(sistema.modulo_dedicado).toLowerCase() === 'sim';
					
					// Determina se o sistema é do tipo "Manual/Outro" (Iluminação ou qualquer coisa que não seja as fixas/padrão)
					const sistemasPadrao = [
						"Airbag", "Ar-condicionado", "Central de Carroceria", "Central Multimídia", 
						"Freio ABS", "Freio de Estacionamento Eletrônico", "Injeção Eletrônica", 
						"Injeção Eletrônica e Transmissão", "Painel de Instrumentos", "Rádio", 
						"Redes de Comunicação", "Tração 4x4", "Transmissão Automática"
					];
					const isSistemaManual = !sistemasPadrao.includes(sistema.sistema) && !isCaixasForm && !isPaginasFixas;

					// REGRA DE OURO: Usa páginas manuais se for uma página fixa OU se for um sistema manual sem módulo dedicado
					const isPaginasForm = isPaginasFixas || (isSistemaManual && !isModuloDedicado);
		
					if (sistema.sistema === 'Iluminação' || (sistema.sistema === 'Outro' && tituloCapitulo !== 'Outro (Não especificado)')) {
						addLabeledValue('Módulo Dedicado', isModuloDedicado ? 'Sim' : 'Não');
					}

					if (!isCaixasForm && !isPaginasForm && isModuloDedicado) {
						addLabeledValue('Módulo principal', sistema.modulo);
						addLabeledValue('Nome no material', sistema.nomematerial);
						addText(`- Códigos de Conectores:`, 12, "bold", 0);
						addText(sistema.codconectores, 12, 'normal', 4)
						addText(`- Código de Peça / Link:`, 12, "bold", 0);
						y = await addRichContent(sistema.codmodulo, y, 4, rootAplicaveis, sistema, idx, true, veiculo, index);
						y += 6;
					}
					y += 6;
					
					addText(`DESENVOLVIMENTO:`, 14, "bold", 0);
					y += lineSpacing / 2;
					
					if (isCaixasForm) {
						// Layout de Fusíveis (Caixas)
						if (sistema.caixas && sistema.caixas.length > 0) {
							for (const caixa of sistema.caixas) {
								addText(`- ${caixa.nome || 'Caixa'}:`, 12, "bold", 0);
								y = await addRichContent(caixa.descricoes, y, 4, rootPrincipal, sistema, idx);
								y += 5;
							}
						}
					} 
					else if (isPaginasForm) {
						// Layout de Páginas Dinâmicas (+ Adicionar Página)
						// Entra aqui: Alimentação, Peito, Carga e Partida OU (Outro/Iluminação com Módulo NÃO)
						if (sistema.paginas && sistema.paginas.length > 0) {
							for (const [pIdx, pagina] of sistema.paginas.entries()) {
								const tituloPg = pagina.titulo || `Página ${pIdx + 1}`;
								addText(`- ${tituloPg}:`, 12, "bold", 0);
								y = await addRichContent(pagina.conteudo, y, 4, rootPrincipal, sistema, idx);
								y += 8;
							}
						} else {
							addText('Nenhuma página adicionada.', 12, 'italic', 4);
							y += lineHeight;
						}
					} 
					else {
						addText(`- Página de Localização:`, 12, "bold", 0);
						y = await addRichContent(sistema.pagloc, y, 4, rootAplicaveis, sistema, idx, true, veiculo, index);
						y += 12;
						// y += lineHeight;
						
						addText(`- Página de Conectores:`, 12, "bold", 0);
						y = await addRichContent(sistema.pagcon, y, 4, rootAplicaveis, sistema, idx, true, veiculo, index);
						y += 12;
						// y += lineHeight;
						
						addText(`- Página de Diagramas:`, 12, "bold", 0);
						y = await addRichContent(sistema.pagdiag, y, 4, rootAplicaveis, sistema, idx, true, veiculo, index);
						y += 12;
						// y += lineHeight;
					}
				}
			} else {
				addText("Nenhum sistema adicionado.", 12, "normal", 4); y += lineHeight;}
		
			y += lineHeight;
			addSeparatorLine();
		}

		y += lineHeight;
		addColoredText("DADOS DO CARD (APLICÁVEIS)", 18, 'bold', 0, titleColor);
		y += lineHeight;
		addText(`DIFICULDADE:`, 14, "bold", 0);
		addText(`- ${dataPrincipal.dificuldade_aplicaveis}`, 12, 'normal', 4);
		//addLabeledValue('Dificuldade', dataPrincipal.dificuldade_aplicaveis);
		let somaTotalAplicaveis = 0, somaTransferidasAplicaveis = 0, somaCriadasAplicaveis = 0;
		dataAplicaveis.forEach(v => {
			if (v.sistemas && v.sistemas.length > 0) {
				v.sistemas.forEach(s => {
					const paginas = parseInt(s.paginasprev) || 0;
					somaTotalAplicaveis += paginas;
					if (s.transferencia === 'transferencia_principal' || s.transferencia === 'transferencia_outro' || s.transferencia === 'modificar') {
						somaTransferidasAplicaveis += paginas;
					}
				});
			}
		});
		y += lineHeight;
		addText(`PPA:`, 14, "bold");
		addText(`- Total: ${somaTotalAplicaveis}\n- Páginas Aplicadas: ${somaTransferidasAplicaveis}`, 12, "normal", 4);
	}
	
	let nomeBase = "planejamento";
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
	
	const nomeArquivoPDF = `${prefixo}${nomeBase}.pdf`;
	doc.save(nomeArquivoPDF);

	if (isLastPart) {
		
		const zipCompleto = new JSZip();
		const zipRootPrincipal = zipCompleto.folder('Veículo Principal');
		const zipRootAplicaveis = zipCompleto.folder('Veículos Aplicáveis');
		
		const dadosZipPrincipal = dadosCompletosJSON.principal;
		const dadosZipAplicaveis = dadosCompletosJSON.aplicaveis;

		await addRichContent(dadosZipPrincipal.pasta, 0, 0, zipRootPrincipal, null, -1);
		await addRichContent(dadosZipPrincipal.comentarios, 0, 0, zipRootPrincipal, null, -1);
		await addRichContent(dadosZipPrincipal.ilustracao_texto, 0, 0, zipRootPrincipal, null, -1);
		if (dadosZipPrincipal.pesquisa === 'sim' && dadosZipPrincipal.pesquisa_texto) {
			await addRichContent(dadosZipPrincipal.pesquisa_texto, 0, 0, zipRootPrincipal, null, -1);
		}
		for (const [idx, sistema] of dadosZipPrincipal.sistemas.entries()) {
			const isCaixas = sistema.sistema === "Fusíveis e Relés";
			const isPaginas = ["Alimentação Positiva", "Conectores de Peito", "Sistema de Carga e Partida"].includes(sistema.sistema);
			const isModulo = sistema.modulo_dedicado === 'sim';
			
			if (isCaixas && sistema.caixas) {
				for (const caixa of sistema.caixas) await addRichContent(caixa.descricoes, 0, 0, zipRootPrincipal, sistema, idx);
			} else if (isPaginas || (!isModulo && (sistema.sistema === 'Iluminação' || sistema.sistema === 'Outro'))) {
				if(sistema.paginas) for (const pagina of sistema.paginas) await addRichContent(pagina.conteudo, 0, 0, zipRootPrincipal, sistema, idx);
			} else {
				await addRichContent(sistema.codmodulo, 0, 0, zipRootPrincipal, sistema, idx);
				await addRichContent(sistema.pagloc, 0, 0, zipRootPrincipal, sistema, idx);
				await addRichContent(sistema.pagcon, 0, 0, zipRootPrincipal, sistema, idx);
				await addRichContent(sistema.pagdiag, 0, 0, zipRootPrincipal, sistema, idx);
			}
		}

		if (dadosZipAplicaveis) {
			for (const [vIdx, veiculo] of dadosZipAplicaveis.entries()) {
				await addRichContent(veiculo.dadosGerais.pasta, 0, 0, zipRootAplicaveis, null, -1, true, veiculo, vIdx);
				await addRichContent(veiculo.dadosGerais.comentarios, 0, 0, zipRootAplicaveis, null, -1, true, veiculo, vIdx);
				await addRichContent(veiculo.dadosGerais.ilustracao_texto, 0, 0, zipRootAplicaveis, null, -1, true, veiculo, vIdx);
				if (veiculo.dadosGerais.pesquisa === 'sim' && veiculo.dadosGerais.pesquisa_texto) {
					await addRichContent(veiculo.dadosGerais.pesquisa_texto, 0, 0, zipRootAplicaveis, null, -1, true, veiculo, vIdx);
				}
				
				for (const [sIdx, sistema] of veiculo.sistemas.entries()) {
					const isCaixas = sistema.sistema === "Fusíveis e Relés";
					const isPaginas = ["Alimentação Positiva", "Conectores de Peito", "Sistema de Carga e Partida"].includes(sistema.sistema);
					const isModulo = sistema.modulo_dedicado === 'sim';
					
					if (isCaixas && sistema.caixas) {
						for (const caixa of sistema.caixas) await addRichContent(caixa.descricoes, 0, 0, zipRootAplicaveis, sistema, sIdx, true, veiculo, vIdx);
					} else if (isPaginas || (!isModulo && (sistema.sistema === 'Iluminação' || sistema.sistema === 'Outro'))) {
						if(sistema.paginas) for (const pagina of sistema.paginas) await addRichContent(pagina.conteudo, 0, 0, zipRootAplicaveis, sistema, sIdx, true, veiculo, vIdx);
					} else {
						await addRichContent(sistema.codmodulo, 0, 0, zipRootAplicaveis, sistema, sIdx, true, veiculo, vIdx);
						await addRichContent(sistema.pagloc, 0, 0, zipRootAplicaveis, sistema, sIdx, true, veiculo, vIdx);
						await addRichContent(sistema.pagcon, 0, 0, zipRootAplicaveis, sistema, sIdx, true, veiculo, vIdx);
						await addRichContent(sistema.pagdiag, 0, 0, zipRootAplicaveis, sistema, sIdx, true, veiculo, vIdx);
					}
				}
			}
		}
		const zipContent = await zipCompleto.generateAsync({ type: 'blob' });
		
		if (zipContent && zipContent.size > 22) { // Garante que o ZIP não está vazio
			const nomeZip = `${nomeBase}.zip`;
			const a = document.createElement('a');
			const url = URL.createObjectURL(zipContent);
			a.href = url;
			a.download = nomeZip;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		}
	}
}
// FIM: LÓGICA DE GERAÇÃO DE PDF/ZIP e INÍCIO: FUNÇÕES DO MODAL DE DIVISÃO: Abre o Modal de "SIM/NÃO"
function abrirModalDivisaoPDF() {
	document.getElementById('pdfSplitModal').style.display = 'flex';
}

// Fecha o Modal de "SIM/NÃO"
function fecharModalDivisaoPDF() {
	document.getElementById('pdfSplitModal').style.display = 'none';
}

// Abre o Modal de Seleção de Capítulos (SIM)
function abrirModalSelecaoCapitulos() {
	fecharModalDivisaoPDF(); // Fecha o primeiro modal
	const dataPrincipal = coletarDadosFormulario().principal;
	const sistemas = dataPrincipal.sistemas;
	
	const checkboxesDiv = document.getElementById('capitulos-checkboxes');
	checkboxesDiv.innerHTML = ''; // Limpa conteúdo anterior

	if (!sistemas || sistemas.length === 0) {
		checkboxesDiv.innerHTML = '<p style="text-align: center; color: #f44336; font-weight: bold;">NENHUM CAPÍTULO ENCONTRADO. O PDF será gerado em parte única.</p>';
		document.getElementById('confirmSelection').textContent = 'GERAR PDF ÚNICO';
	} else {
		document.getElementById('confirmSelection').textContent = 'OK';
		sistemas.forEach((sistema, index) => {
			const label = document.createElement('label');
			label.innerHTML = `<input type="checkbox" data-index="${index}" data-nome="${sistema.sistema}" value="${sistema.sistema}"> Capítulo: ${sistema.sistema} (Páginas: ${sistema.paginasprev || '0'})`;
			checkboxesDiv.appendChild(label);
		});
	}

	document.getElementById('chapterSelectionModal').style.display = 'flex';
} // Fecha o Modal de Seleção

function fecharModalSelecaoCapitulos() {
	document.getElementById('chapterSelectionModal').style.display = 'none';
}

function toggleParte2Principal() {
    const radio = document.querySelector('input[name="qtd_partes"]:checked');
    const containerUnica = document.getElementById('card-parte-unica-container');
    const containerDuasPartes = document.getElementById('card-duas-partes-container');

    if (!radio) return;

    if (radio.value === 'uma') {
        if (containerUnica) containerUnica.style.display = 'block';
        if (containerDuasPartes) containerDuasPartes.style.display = 'none';
    } else if (radio.value === 'duas') {
        if (containerUnica) containerUnica.style.display = 'none';
        if (containerDuasPartes) containerDuasPartes.style.display = 'block';
    }
}

document.addEventListener('DOMContentLoaded', (event) => {
	
	const splitSim = document.getElementById('splitSim');
	const splitNao = document.getElementById('splitNao');

	if (splitSim && splitNao) {
		splitSim.addEventListener('click', abrirModalSelecaoCapitulos); // SIM abre a seleção
		splitNao.addEventListener('click', () => {
			fecharModalDivisaoPDF();
			gerarPDF(null); // NÃO chama gerarPDF com null (PDF ÚNICO)
		});
	} else {
		console.error("Erro: Botões do modal 'pdfSplitModal' (splitSim, splitNao) não encontrados.");
	}

	// Lógica para o segundo Modal (OK/CANCELAR)
	const confirmSelection = document.getElementById('confirmSelection');
	const cancelSelection = document.getElementById('cancelSelection');
	
	if (confirmSelection && cancelSelection) {
		cancelSelection.addEventListener('click', fecharModalSelecaoCapitulos);

		confirmSelection.addEventListener('click', () => {
			const dataPrincipal = coletarDadosFormulario().principal;
			const todosSistemas = dataPrincipal.sistemas;
			const checkboxes = document.querySelectorAll('#capitulos-checkboxes input[type="checkbox"]:checked');
			
			const sistemasSelecionadosParaParte2 = [];

			checkboxes.forEach(checkbox => {
				const nomeSistema = checkbox.getAttribute('data-nome');
				const sistemaEncontrado = todosSistemas.find(s => s.sistema === nomeSistema);
				if (sistemaEncontrado) {
					sistemasSelecionadosParaParte2.push(sistemaEncontrado);
				}
			});
			
			fecharModalSelecaoCapitulos();
			gerarPDF(sistemasSelecionadosParaParte2); 
		});
	} else {
		console.error("Erro: Botões do modal 'chapterSelectionModal' (confirmSelection, cancelSelection) não encontrados.");
	}  
	
     alternarAbas('principal');
     setupDragAndDrop('comentarios');
     setupEditableContent('comentarios');
	
	document.querySelectorAll('.editable-content').forEach(el => {
		updateEditablePlaceholder(el);
		autoResizeEditableContent(el);
	});
 });

 window.addEventListener('beforeunload', function (e) {
     const confirmationMessage = 'AVISO: Todas as alterações não salvas serão perdidas';
     e.returnValue = confirmationMessage;
     return confirmationMessage;
 });
