function salvarDadosVeiculoAplicavel(veiculoIndex) {
	if (veiculoIndex < 0 || veiculoIndex >= veiculosAplicaveisData.length) return;
	const veiculo = veiculosAplicaveisData[veiculoIndex];

	veiculo.dadosGerais = {
		veiculo: document.getElementById(`veiculo_aplicaveis_${veiculoIndex}`)?.value || '',
		idoscilogramas: document.getElementById(`idoscilogramas_aplicaveis_${veiculoIndex}`)?.value || '',
		pasta: document.getElementById(`pasta_aplicaveis_${veiculoIndex}`)?.value || '',
		aplicacao_chassi: document.querySelector(`input[name="aplicacao_chassi_aplicaveis_${veiculoIndex}"]:checked`)?.value,
		aplicacao_chassi_texto: document.getElementById(`aplicacao_chassi_texto_aplicaveis_${veiculoIndex}`)?.value || '',
	};
}

function abrirModalCopia(veiculoIndex) {
	targetVeiculoIndexParaCopia = veiculoIndex;

	const selectVeiculo = document.getElementById('select-veiculo-copia');
	selectVeiculo.innerHTML = '';

	const optPrincipal = document.createElement('option');
	optPrincipal.value = 'principal';
	optPrincipal.textContent = 'Veículo Principal';
	selectVeiculo.appendChild(optPrincipal);

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

	checkboxesContainer.innerHTML = '';

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
			label.appendChild(document.createTextNode(`Título ${idx + 1}: ${tituloCapitulo}`));
			
			label.addEventListener('mouseenter', () => {
				label.style.backgroundColor = '#f0f0f0';
			});
			label.addEventListener('mouseleave', () => {
				label.style.backgroundColor = 'transparent';
			});
			
			checkboxesContainer.appendChild(label);
		});
	} else {
		checkboxesContainer.innerHTML = '<p style="text-align: center; color: #999;">Nenhum título encontrado</p>';
	}
}

function executarCopiaCapitulo() {
	const selectVeiculo = document.getElementById('select-veiculo-copia');
	const checkboxesContainer = document.getElementById('capitulos-checkboxes-copia');
	const selectedVeiculoValue = selectVeiculo.value;
	
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
	
	checkboxesMarcados.forEach(checkbox => {
		const capituloIndex = parseInt(checkbox.value, 10);
		const capituloParaCopiar = sourceSistemas[capituloIndex];
		
		if (capituloParaCopiar) {
			const copiaCapitulo = JSON.parse(JSON.stringify(capituloParaCopiar));
			veiculoDestino.sistemas.push(copiaCapitulo);
		}
	});

	veiculoDestino.paginaAtual = veiculoDestino.sistemas.length - 1;
	renderizarPaginacaoAplicaveis(targetVeiculoIndexParaCopia);
	renderizarSistemaAplicaveis(targetVeiculoIndexParaCopia, veiculoDestino.paginaAtual);
	
	document.getElementById('copy-chapter-modal').style.display = 'none';
	targetVeiculoIndexParaCopia = null;
	
	const qtdCopiados = checkboxesMarcados.length;
	alert(`${qtdCopiados} capítulo(s) copiado(s) com sucesso!`);
}

// === VEÍCULOS APLICÁVEIS: SISTEMAS INTERNOS (TÍTULO E DESCRIÇÃO) ===
function renderizarSistemaAplicaveis(veiculoIndex, sistemaIndex) {
	const container = document.getElementById(`sistemas-container-aplicaveis_${veiculoIndex}`);
	if (!container) return;
	container.innerHTML = "";
	const veiculo = veiculosAplicaveisData[veiculoIndex];
	if(!veiculo.sistemas || sistemaIndex < 0 || sistemaIndex >= veiculo.sistemas.length) return;
	const dados = veiculo.sistemas[sistemaIndex];

	if (!dados) return;

	const div = document.createElement("div");
	div.className = "system-block";

	div.innerHTML = `
		<label for="titulo_capitulo_aplicaveis_${veiculoIndex}_${sistemaIndex}">Título:</label>
		<input type="text" id="titulo_capitulo_aplicaveis_${veiculoIndex}_${sistemaIndex}" value="${dados.sistema || ''}" placeholder="Exemplos: Requisição, Análise, Pesquisas, Sincronismo do Motor..." onchange="salvarDadosSistemaAplicaveis(${veiculoIndex}, ${sistemaIndex})">
		
		<label style="margin-top: 15px;">Descrição geral:</label>
		<div class="development-field-container">
			<div contenteditable="true" class="editable-content" id="descricao_capitulo_aplicaveis_${veiculoIndex}_${sistemaIndex}" data-field="descricao" oninput="salvarDadosSistemaAplicaveis(${veiculoIndex}, ${sistemaIndex})" data-placeholder="Descreva o título utilizando texto, imagens e links aqui...">${dados.descricao || ''}</div>
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
	if (veiculo.sistemas && veiculo.sistemas.length > 0 && veiculo.paginaAtual >= 0) {
		salvarDadosSistemaAplicaveis(veiculoIndex, veiculo.paginaAtual);
	}
	if (!veiculo.sistemas) veiculo.sistemas = [];
	veiculo.sistemas.push({ sistema: '', descricao: '' });
	veiculo.paginaAtual = veiculo.sistemas.length - 1;
	renderizarPaginacaoAplicaveis(veiculoIndex);
	renderizarSistemaAplicaveis(veiculoIndex, veiculo.paginaAtual);
}

function moverSistemaAplicavel(veiculoIndex, direcao) {
	const veiculo = veiculosAplicaveisData[veiculoIndex];
	if (!veiculo || !veiculo.sistemas || veiculo.sistemas.length < 2) return;

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
	if (!veiculo || !veiculo.sistemas || veiculo.sistemas.length === 0) return;

	const sistemaIndex = veiculo.paginaAtual; 
	const sistemaRemover = veiculo.sistemas[sistemaIndex];
	const tituloCapitulo = sistemaRemover.sistema || `Título ${sistemaIndex + 1}`;

	const confirmModal = document.getElementById('confirm-modal');
	const confirmMessage = document.getElementById('confirm-modal-message');
	const confirmYesBtn = document.getElementById('confirm-modal-yes');
	const confirmNoBtn = document.getElementById('confirm-modal-no');

	confirmMessage.innerHTML = `Deseja excluir o Título Nº ${sistemaIndex + 1} (${tituloCapitulo}) do Veículo Aplicável ${veiculoIndex + 1}?`;
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
	if (!paginacaoDiv) return;
	paginacaoDiv.innerHTML = "";
	const veiculo = veiculosAplicaveisData[veiculoIndex];
	if(!veiculo.sistemas) return;

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
	if (!veiculo || !veiculo.sistemas || !veiculo.sistemas[sistemaIndex]) return;

	const tituloInput = document.getElementById(`titulo_capitulo_aplicaveis_${veiculoIndex}_${sistemaIndex}`);
	const descricaoContent = document.getElementById(`descricao_capitulo_aplicaveis_${veiculoIndex}_${sistemaIndex}`);

	veiculo.sistemas[sistemaIndex] = {
		sistema: tituloInput ? tituloInput.value : '',
		descricao: descricaoContent ? descricaoContent.innerHTML : ''
	};
	
	renderizarPaginacaoAplicaveis(veiculoIndex);
}

// === COLETA DE DADOS, JSON E VALIDAÇÃO ===
function coletarDadosFormulario() {
	if (sistemasData.length > 0) {
		salvarDadosSistema(paginaAtual);
	}

	if (veiculosAplicaveisData.length > 0) {
		if (
			veiculosAplicaveisData[veiculoAplicavelAtual] &&
			veiculosAplicaveisData[veiculoAplicavelAtual].sistemas && 
			veiculosAplicaveisData[veiculoAplicavelAtual].sistemas.length > 0 &&
			veiculosAplicaveisData[veiculoAplicavelAtual].paginaAtual >= 0
		) {
			salvarDadosSistemaAplicaveis(veiculoAplicavelAtual, veiculosAplicaveisData[veiculoAplicavelAtual].paginaAtual);
		}
		salvarDadosVeiculoAplicavel(veiculoAplicavelAtual);
	}

	const dataPrincipal = {
		planejado_por: document.getElementById("planejado_por")?.value || '',
		veiculo: document.getElementById("veiculo")?.value || '',
		clickup: document.getElementById("clickup")?.value || '',
		idoscilogramas: document.getElementById("idoscilogramas")?.value || '',
		pasta: document.getElementById("pasta")?.value || '',
		aplicacao_chassi: document.querySelector('input[name="aplicacao_chassi"]:checked')?.value,
		aplicacao_chassi_texto: document.getElementById("aplicacao_chassi_texto")?.value || '',
		sistemas: sistemasData
	};

	return {
		principal: dataPrincipal,
		aplicaveis: veiculosAplicaveisData
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
			nomeArquivo = `Oscilograma - ${ano} ${modelo} ${motor}.json`;
		}
	} else if (data.principal.veiculo) {
		nomeArquivo = `Oscilograma - ${data.principal.veiculo}.json`;
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

				setData('planejado_por', dataPrincipal.planejado_por);
				setData('veiculo', dataPrincipal.veiculo);
				setData('clickup', dataPrincipal.clickup);
				setData('idoscilogramas', dataPrincipal.idoscilogramas);
				setData('pasta', dataPrincipal.pasta);
				setData('aplicacao_chassi_texto', dataPrincipal.aplicacao_chassi_texto);
				setChecked('aplicacao_chassi', dataPrincipal.aplicacao_chassi);

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

	checarCampo('planejado_por', 'Desenvolvedor');
	checarCampo('clickup', 'Link do Card (ClickUp)');
	checarCampo('veiculo', 'Veículo Referência');
	checarCampo('idoscilogramas', 'ID OSCILOGRAMA');
	checarCampo('pasta', 'Pasta do Veículo');
	checarRadio('aplicacao_chassi', 'Associação / Chassi');

	sistemasData.forEach((sistema, idx) => {
		const capLabel = `(Capítulo Principal ${idx + 1})`;
		if (!sistema.sistema || sistema.sistema.trim() === '') {
			erros.push(`Título do Capítulo ${capLabel}`);
			const el = document.getElementById(`titulo_capitulo_${idx}`);
			if (el) el.classList.add('campo-invalido');
		}
	});

	if (veiculosAplicaveisData.length > 0) {
		salvarDadosVeiculoAplicavel(veiculoAplicavelAtual);

		veiculosAplicaveisData.forEach((veiculo, idx) => {
			const sfx = `(Aplicável ${idx + 1})`;

			if (!veiculo.dadosGerais.veiculo) erros.push(`Veículo Referência ${sfx}`);
			if (!veiculo.dadosGerais.idoscilogramas) erros.push(`ID OSCILOGRAMA ${sfx}`);
			if (!veiculo.dadosGerais.pasta || veiculo.dadosGerais.pasta.trim() === '' || veiculo.dadosGerais.pasta.trim() === '<br>') erros.push(`Pasta do Veículo ${sfx}`);
			if (!veiculo.dadosGerais.aplicacao_chassi) erros.push(`Associação / Chassi ${sfx}`);
			
			if (veiculo.sistemas) {
				veiculo.sistemas.forEach((sistema, sIdx) => {
					const capLabel = `(Aplicável ${idx + 1}, Capítulo ${sIdx + 1})`;
					if (!sistema.sistema || sistema.sistema.trim() === '') {
						erros.push(`Título do Capítulo ${capLabel}`);
						const el = document.getElementById(`titulo_capitulo_aplicaveis_${idx}_${sIdx}`);
						if (el) el.classList.add('campo-invalido');
					}
				});
			}
		});
	}

	return [...new Set(erros)];
}
