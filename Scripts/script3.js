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
	let isCopiandoDoPrincipal = false;
	
	if (selectedVeiculoValue === 'principal') {
		sourceSistemas = sistemasData;
		isCopiandoDoPrincipal = true;
	} else if (selectedVeiculoValue.startsWith('aplicavel_')) {
		const veiculoIndex = parseInt(selectedVeiculoValue.split('_')[1], 10);
		sourceSistemas = veiculosAplicaveisData[veiculoIndex].sistemas;
		isCopiandoDoPrincipal = false;
	}

	const veiculoDestino = veiculosAplicaveisData[targetVeiculoIndexParaCopia];
	
	// Copia todos os capítulos selecionados
	checkboxesMarcados.forEach(checkbox => {
		const capituloIndex = parseInt(checkbox.value, 10);
		const capituloParaCopiar = sourceSistemas[capituloIndex];
		
		if (capituloParaCopiar) {
			// Cria uma cópia profunda do capítulo
			const copiaCapitulo = JSON.parse(JSON.stringify(capituloParaCopiar));
			
			// CORREÇÃO: Ajusta o campo 'transferencia' se estiver copiando do principal
			if (isCopiandoDoPrincipal) {
				// Converte os valores do principal para os valores dos aplicáveis
				if (copiaCapitulo.transferencia === 'transferencia') {
					copiaCapitulo.transferencia = 'transferencia_principal';
				} else if (copiaCapitulo.transferencia === 'zero') {
					// Define como transferência do principal por padrão
					copiaCapitulo.transferencia = 'transferencia_principal';
				}
				// 'modificar' permanece igual
			}
			// Se estiver copiando de outro aplicável, os valores já estão corretos
			
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
		<div id="outrocampo_aplicaveis_${veiculoIndex}_${sistemaIndex}" style="display:none; margin-top: 5px;">
			<label>Especifique o título:</label>
			<input type="text" name="sistema_outro_aplicaveis_${veiculoIndex}_${sistemaIndex}" value="${dados.sistema && !['Fusíveis e Relés', 'Alimentação Positiva', 'Conectores de Peito', 'Central de Carroceria', 'Injeção Eletrônica', 'Sistema de Carga e Partida', 'Injeção Eletrônica e Transmissão', 'Transmissão Automática', 'Tração 4x4', 'Redes de Comunicação', 'Painel de Instrumentos', 'Airbag', 'Ar-condicionado', 'Freio ABS', 'Freio EBS', 'Freio de Estacionamento Eletrônico', 'Rádio', 'Central Multimídia', 'Iluminação'].includes(dados.sistema) ? dados.sistema : ''}" onchange="salvarDadosSistemaAplicaveis(${veiculoIndex}, ${sistemaIndex})">
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
				const standardSystems = ['Airbag', 'Ar-condicionado', 'Central de Carroceria', 'Central Multimídia', 'Freio ABS', 'Freio EBS', 'Freio de Estacionamento Eletrônico', 'Injeção Eletrônica', 'Injeção Eletrônica e Transmissão', 'Painel de Instrumentos', 'Rádio', 'Redes de Comunicação', 'Tração 4x4', 'Transmissão Automática'];
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