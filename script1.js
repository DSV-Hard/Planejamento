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
				<option value="Freio EBS" ${dados.sistema === 'Freio EBS' ? 'selected' : ''}>Freio EBS</option>
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
				'Conectores de Peito','Freio ABS','Freio EBS','Freio de Estacionamento Eletrônico','Fusíveis e Relés',
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
					'Freio ABS','Freio EBS','Freio de Estacionamento Eletrônico','Rádio','Central Multimídia','Iluminação'
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
    
    // CORREÇÃO: Usa document em vez de systemDiv para garantir que pega o rádio correto
    const getRadio = (name) => document.querySelector(`input[name="${name}"]:checked`)?.value || '';
    
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


// segunda parte

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