/* ==========================================================================
           1. ESTADO GLOBAL DA APLICAÇÃO
           ========================================================================== */
        
        // Itens Padrão de Exceção e suas Sub-opções Específicas atualizadas
        const ITENS_FIXOS_DEFINICAO = [
            {
                id: "tipo_chave",
                nome: "TIPO DE CHAVE",
                opcoes: ["COMUM", "PRESENCIAL (BOTÃO)", "ENCAIXE INTELIGENTE"],
                tipoInput: "checkbox"
            },
            {
                id: "ar_condicionado",
                nome: "AR-CONDICIONADO",
                opcoes: ["MANUAL", "AUTOMÁTICO", "SÓ AR QUENTE"],
                tipoInput: "checkbox"
            },
            {
                id: "transmissao",
                nome: "TRANSMISSÃO",
                opcoes: ["AT", "MT"],
                tipoInput: "checkbox"
            },
            {
                id: "tracao",
                nome: "TRAÇÃO",
                opcoes: ["4X2", "4X4", "6X2", "6X4", "8X2", "8X4", "8X8"],
                tipoInput: "checkbox"
            }
        ];

        // Estado do formulário - Itens customizados agora aceitam tipos "simple" ou "multiple" e visibilidade
        let appState = {
            itensCustom: [], // Lista de objetos contendo { tipo, nome, obs/opcoes, oculto, expandido } para os itens customizados
            principal: {
                nome: "Veículo Principal",
                valores: {} // chave: { status: 'S'|'O'|'-', detalhes: [] }
            },
            aplicaveis: [] // Array de { id, nome, valores: { ... } }
        };
        window.appState = appState;
        window.appStateItens = appState;

        // Identificador sequencial para veículos aplicáveis e index do ativo
        let nextVeiculoId = 1;
        let activeVeiculoIndex = 0;

		// ==========================================================================
        // CONFIRMAÇÃO DE SAÍDA DA PÁGINA (Prevenção de perda de dados)
        // ==========================================================================
        window.addEventListener('beforeunload', function (e) {
            // Cancela o evento padrão de fechamento imediato
            e.preventDefault();
            
            // Define a propriedade de retorno (obrigatório para navegadores legados e alguns modernos)
            const mensagem = "Ao sair da página, perderás os dados não salvos. DESEJA FECHAR?";
            e.returnValue = mensagem;
            
            // Retorna a mensagem
            return mensagem;
        });

        /* ==========================================================================
           2. INICIALIZAÇÃO DA APLICAÇÃO
           ========================================================================== */
        function inicializarModuloItens() {
            if (window._itensModuloInicializado) return;
            window._itensModuloInicializado = true;
            // Inicializar estados padrão se vazios
            ITENS_FIXOS_DEFINICAO.forEach(item => {
                appState.principal.valores[item.id] = { status: "-", detalhes: [] };
            });

            // Adicionar itens customizados padrões mapeados por tipo ("simple" ou "multiple") com a propriedade "oculto" e "expandido"
            appState.itensCustom = [
                { tipo: "simple", nome: "FUNÇÃO START/STOP", obs: "", oculto: false },
                { tipo: "multiple", nome: "ADAS", opcoes: ["Câmera Frontal", "Radar Frontal", "Piloto Automático", "Piloto Automático Adaptativo", "Visão 360º"], oculto: false, expandido: false },
                { tipo: "multiple", nome: "AIRBAGS", opcoes: ["2 FRONTAL", "2 LATERAL", "2 CORTINA", "DE JOELHO"], oculto: false, expandido: false },
                { tipo: "multiple", nome: "ASSISTÊNCIA DE ESTACIONAMENTO", opcoes: ["Sensores Tras.", "Sensores Diant.", "Sensores Laterais", "Estacionamento Autônomo"], oculto: false, expandido: false },
                { tipo: "multiple", nome: "FARÓIS", opcoes: ["Foco simples", "Foco duplo", "LED", "Halógeno"], oculto: false, expandido: false },
                { tipo: "multiple", nome: "LANTERNAS", opcoes: ["LED", "Halógeno"], oculto: false, expandido: false },
                { tipo: "multiple", nome: "RETROVISORES EXTERNOS", opcoes: ["Elétricos", "Mecânicos", "Função tilt down", "Aquecido"], oculto: false, expandido: false },
                { tipo: "multiple", nome: "VIDROS ELÉTRICOS", opcoes: ["Portas Dianteiras", "Portas Traseiras", "Função One Touch (Dianteira)", "Função One Touch (4 portas)"], oculto: false, expandido: false },
                { tipo: "multiple", nome: "SISTEMAS DE SOM", opcoes: ["Rádio", "Central Multimídia 6 polegadas", "Central Multimídia 24 polegadas"], oculto: false, expandido: false },
                { tipo: "simple", nome: "TETO SOLAR", obs: "", oculto: false }
            ];

            appState.itensCustom.forEach(item => {
                // Padroniza as sub-opções iniciais como maiúsculas para evitar disparidades
                if (item.tipo === 'multiple' && item.opcoes) {
                    item.opcoes = item.opcoes.map(opt => opt.toUpperCase());
                }
                appState.principal.valores[item.nome] = { status: "-", detalhes: [] };
            });

            // Renderizar as interfaces
            renderizarPainelPrincipal();
            renderizarVeiculosAplicaveis();
            atualizarResumoTab();

            // Suporte a hash para navegação direta de abas
            if (window.location.hash === '#aplicaveis') {
                switchTab('aplicaveis');
                if (appState.aplicaveis.length === 0) {
                    adicionarVeiculoAplicavelItens();
                }
            } else if (window.location.hash === '#copiar-modal') {
                switchTab('aplicaveis');
                if (appState.aplicaveis.length === 0) {
                    adicionarVeiculoAplicavelItens();
                }
                copiarSistemasVeiculoPrincipal(0);
            }
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', inicializarModuloItens);
        } else {
            inicializarModuloItens();
        }

        /* ==========================================================================
           3. LÓGICA DE ABAS (TABS)
           ========================================================================== */
        function switchTab(tabId) {
            // Update tab button active status
            const tabButtons = document.querySelectorAll('.tab-btn');
            tabButtons.forEach(btn => {
                btn.classList.remove('active');
            });
            
            const btnMap = {
                'resumo': 0,
                'principal': 1,
                'aplicaveis': 2
            };
            if (btnMap[tabId] !== undefined && tabButtons[btnMap[tabId]]) {
                tabButtons[btnMap[tabId]].classList.add('active');
            } else if (window.event && window.event.currentTarget) {
                window.event.currentTarget.classList.add('active');
            }

            // Hide all tab containers
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });

            // Show current container
            const targetTab = document.getElementById(`tab-${tabId}`);
            if (targetTab) {
                targetTab.classList.add('active');
            }

            // Alternância de tema de fundo e sombras (amarelo claro na aba aplicáveis)
            if (tabId === 'aplicaveis') {
                document.body.classList.add('theme-aplicaveis');
            } else {
                document.body.classList.remove('theme-aplicaveis');
            }

            // Sincronizar ao alternar
            if (tabId === 'resumo') {
                atualizarResumoTab();
            }
        }

        /* ==========================================================================
           4. RENDERIZAÇÃO: VEÍCULO PRINCIPAL (CONFIGURAÇÃO DE SÉRIE & OPCIONAIS)
           ========================================================================== */
        // Compatibilidade reversa caso alguma rotina legada chame a função anterior
        function renderizarAbaItensMestre() {
            renderizarPainelPrincipal();
        }

        function renderizarPainelPrincipal() {
            // 1. Renderizar os Itens Fixos Core
            const containerFixos = document.getElementById('principal-itens-fixos-container');
            if (containerFixos) {
                containerFixos.innerHTML = '';
                ITENS_FIXOS_DEFINICAO.forEach(item => {
                    const itemEstado = appState.principal.valores[item.id] || { status: "-", detalhes: [] };
                    
                    const row = document.createElement('div');
                    row.className = 'item-row-card';
                    row.style.alignItems = 'center';
                    
                    let subOptionsHTML = item.opcoes.map(opt => {
                        const isChecked = itemEstado.detalhes && itemEstado.detalhes.includes(opt) ? 'checked' : '';
                        const idCheck = `chk-principal-p-${item.id}-${opt.replace(/\s+/g, '')}`;
                        return `
                            <label for="${idCheck}" style="display: inline-flex; align-items: center; gap: 5px; cursor: pointer; font-size: 0.9em; margin-right: 12px;">
                                <input type="checkbox" id="${idCheck}" value="${opt}" ${isChecked} 
                                       onchange="atualizarCheckboxDetalhe('principal', null, '${item.id}', '${opt}', this.checked)">
                                ${opt}
                            </label>
                        `;
                    }).join('');

                    row.innerHTML = `
                        <div class="item-info">
                            <span class="item-title" style="font-weight: 700; text-transform: uppercase;">${item.nome}</span>
                            <div class="item-details-selector" style="margin-top: 6px;">
                                ${subOptionsHTML}
                            </div>
                        </div>
                        <div style="width: 195px; display: flex; justify-content: flex-end; align-items: center;">
                            <span style="font-size: 0.8em; font-weight: bold; color: var(--text-muted); background: #eee; padding: 3px 10px; border-radius: 12px;">
                                Item Fixo
                            </span>
                        </div>
                    `;
                    containerFixos.appendChild(row);
                });
            }

            // 2. Renderizar os Outros Itens (Customizados) com edição e preenchimento integrados
            const containerCustom = document.getElementById('principal-itens-custom-container');
            if (!containerCustom) return;
            containerCustom.innerHTML = '';

            if (appState.itensCustom.length === 0) {
                containerCustom.innerHTML = `<p style="text-align: center; color: var(--text-muted); font-size: 0.9em; padding: 15px;">Nenhum item customizado adicionado ainda. Utilize os botões acima para cadastrar.</p>`;
                return;
            }

            appState.itensCustom.forEach((item, index) => {
                const itemEstado = appState.principal.valores[item.nome] || { status: "-", detalhes: [] };
                
                const card = document.createElement('div');
                card.className = 'item-card-unified';
                if (item.oculto) {
                    card.style.opacity = "0.45";
                    card.style.borderStyle = "dashed";
                }

                if (item.tipo === 'multiple') {
                    // ITEM MÚLTIPLO
                    const isExpandido = item.expandido !== false;
                    
                    // Renderiza cada sub-opção com o [ S O - ] perfeitamente alinhado na coluna item-tristate-col (115px)
                    const optionsHTML = (item.opcoes || []).map((opt, optIdx) => {
                        const activeOptObj = Array.isArray(itemEstado.detalhes) 
                            ? itemEstado.detalhes.find(d => d && (d.opcao === opt || d === opt)) 
                            : null;
                        
                        let activeStatus = '-';
                        if (activeOptObj) {
                            activeStatus = typeof activeOptObj === 'object' ? (activeOptObj.status || 'S') : 'S';
                        }

                        return `
                            <div class="sub-option-row">
                                <div style="display: flex; align-items: center; gap: 8px; flex: 1; min-width: 150px;">
                                    <span style="font-size: 0.85em; color: var(--text-muted);"><i class="fa-regular fa-square"></i></span>
                                    <input type="text" class="form-control" style="font-size: 0.9em; height: 34px; padding: 2px 8px; text-transform: uppercase; font-weight: 600;" 
                                           value="${opt}" 
                                           oninput="let s=this.selectionStart, e=this.selectionEnd; this.value=this.value.toUpperCase(); this.setSelectionRange(s,e);" 
                                           onchange="atualizarOpcaoItemMúltiplo(${index}, ${optIdx}, this.value)" 
                                           placeholder="Opção (Ex: FRONTAL)">
                                    <button class="arrow-btn" style="width: 24px; height: 24px; font-size: 1.0em !important;" 
                                            onclick="removerOpcaoItemMúltiplo(${index}, ${optIdx})" title="Remover esta opção">
                                        <i class="fa-solid fa-xmark" style="color: #d32f2f;"></i>
                                    </button>
                                </div>
                                
                                <!-- Mini Tristate Alinhado Perfeitamente na Coluna de 115px (igual aos itens simples) -->
                                <div class="item-tristate-col">
                                    <div class="tristate-options">
                                        <button class="tristate-btn ${activeStatus === 'S' ? 'active' : ''}" data-val="S" 
                                                onclick="atualizarTristateOpcaoMúltipla('principal', null, '${item.nome}', '${opt}', 'S')">S</button>
                                        <button class="tristate-btn ${activeStatus === 'O' ? 'active' : ''}" data-val="O" 
                                                onclick="atualizarTristateOpcaoMúltipla('principal', null, '${item.nome}', '${opt}', 'O')">O</button>
                                        <button class="tristate-btn ${activeStatus === '-' ? 'active' : ''}" data-val="-" 
                                                onclick="atualizarTristateOpcaoMúltipla('principal', null, '${item.nome}', '${opt}', '-')">-</button>
                                    </div>
                                </div>

                                <!-- Espaçador de Ações (80px) para manter o alinhamento com a coluna da direita -->
                                <div class="item-actions-col"></div>
                            </div>
                        `;
                    }).join('');

                    card.innerHTML = `
                        <!-- Linha Principal do Cabeçalho do Item Múltiplo -->
                        <div class="item-card-main-row">
                            <!-- Setas Verticais de Reordenação -->
                            <div class="item-arrows-col">
                                <button class="arrow-btn" onclick="moverItemCustom(${index}, -1)" title="Mover 1 posição acima">
                                    <i class="fa-solid fa-caret-up"></i>
                                </button>
                                <button class="arrow-btn" onclick="moverItemCustom(${index}, 1)" title="Mover 1 posição abaixo">
                                    <i class="fa-solid fa-caret-down"></i>
                                </button>
                            </div>

                            <!-- Input Nome do Item Múltiplo -->
                            <div class="item-inputs-col">
                                <input type="text" class="form-control" style="font-weight: 700; text-transform: uppercase; width: 100%;" 
                                       value="${item.nome}" 
                                       oninput="let s=this.selectionStart, e=this.selectionEnd; this.value=this.value.toUpperCase(); this.setSelectionRange(s,e);" 
                                       onchange="atualizarNomeItemCustom(${index}, this.value)" 
                                       placeholder="Nome do item múltiplo (ex: AIRBAGS)">
                            </div>

                            <!-- Coluna Tristate no cabeçalho: Espaço Vazio de 115px para manter alinhamento colunar -->
                            <div class="item-tristate-col"></div>

                            <!-- Coluna de Ações (Ocultar e Excluir) -->
                            <div class="item-actions-col">
                                <button class="icon-action-btn" onclick="toggleOcultarItem(${index})" title="${item.oculto ? 'Item oculto na tabela. Clique para exibir' : 'Clique para ocultar da tabela'}">
                                    <i class="fa-solid ${item.oculto ? 'fa-eye-slash' : 'fa-eye'}" style="${item.oculto ? 'color: #d32f2f;' : ''}"></i>
                                </button>
                                <button class="icon-action-btn btn-trash" onclick="removerItemMestre(${index})" title="Excluir este item">
                                    <i class="fa-solid fa-trash-can"></i>
                                </button>
                            </div>
                        </div>

                        <!-- Container das Sub-opções editáveis com Tristate individual -->
                        <div style="background-color: #ffffff; padding: 10px; border-radius: 8px; border: 1px dashed var(--gray-border); margin-left: 42px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                                <span style="font-size: 0.82em; font-weight: bold; color: var(--text-muted); letter-spacing: 0.3px;">
                                    LISTA DE OPÇÕES DISPONÍVEIS:
                                </span>
                                <button class="orange-button" style="padding: 3px 10px; font-size: 0.78em; height: auto;" onclick="adicionarOpcaoItemMúltiplo(${index})">
                                    <i class="fa-solid fa-plus"></i> Opção
                                </button>
                            </div>
                            <div style="display: flex; flex-direction: column;">
                                ${optionsHTML || `<p style="font-size: 0.85em; color: var(--text-muted); font-style: italic; padding: 5px;">Nenhuma opção adicionada ainda. Clique em + Opção acima.</p>`}
                            </div>
                        </div>
                    `;
                } else {
                    // ITEM SIMPLES
                    const currentStatus = itemEstado.status || '-';

                    card.innerHTML = `
                        <div class="item-card-main-row">
                            <!-- Setas Verticais de Reordenação -->
                            <div class="item-arrows-col">
                                <button class="arrow-btn" onclick="moverItemCustom(${index}, -1)" title="Mover 1 posição acima">
                                    <i class="fa-solid fa-caret-up"></i>
                                </button>
                                <button class="arrow-btn" onclick="moverItemCustom(${index}, 1)" title="Mover 1 posição abaixo">
                                    <i class="fa-solid fa-caret-down"></i>
                                </button>
                            </div>

                            <!-- Inputs Nome e Observação -->
                            <div class="item-inputs-col">
                                <input type="text" class="form-control" style="font-weight: 700; text-transform: uppercase; flex: 1; min-width: 180px;" 
                                       value="${item.nome}" 
                                       oninput="let s=this.selectionStart, e=this.selectionEnd; this.value=this.value.toUpperCase(); this.setSelectionRange(s,e);" 
                                       onchange="atualizarNomeItemCustom(${index}, this.value)" 
                                       placeholder="Nome do item (ex: FUNÇÃO START/STOP)">
                                <input type="text" class="form-control" style="flex: 1.5; min-width: 220px;" 
                                       value="${item.obs || ''}" 
                                       onchange="atualizarObsItemCustom(${index}, this.value)" 
                                       placeholder="Descreva observações, se houver...">
                            </div>

                            <!-- Coluna Tristate S / O / - (Alinhada na coluna de 115px) -->
                            <div class="item-tristate-col">
                                <div class="tristate-options">
                                    <button class="tristate-btn ${currentStatus === 'S' ? 'active' : ''}" data-val="S" 
                                            onclick="atualizarStatusItemSimplesDirect('principal', null, '${item.nome}', 'S')">S</button>
                                    <button class="tristate-btn ${currentStatus === 'O' ? 'active' : ''}" data-val="O" 
                                            onclick="atualizarStatusItemSimplesDirect('principal', null, '${item.nome}', 'O')">O</button>
                                    <button class="tristate-btn ${currentStatus === '-' ? 'active' : ''}" data-val="-" 
                                            onclick="atualizarStatusItemSimplesDirect('principal', null, '${item.nome}', '-')">-</button>
                                </div>
                            </div>

                            <!-- Coluna de Ações (Ocultar e Excluir) -->
                            <div class="item-actions-col">
                                <button class="icon-action-btn" onclick="toggleOcultarItem(${index})" title="${item.oculto ? 'Item oculto na tabela. Clique para exibir' : 'Clique para ocultar da tabela'}">
                                    <i class="fa-solid ${item.oculto ? 'fa-eye-slash' : 'fa-eye'}" style="${item.oculto ? 'color: #d32f2f;' : ''}"></i>
                                </button>
                                <button class="icon-action-btn btn-trash" onclick="removerItemMestre(${index})" title="Excluir este item">
                                    <i class="fa-solid fa-trash-can"></i>
                                </button>
                            </div>
                        </div>
                    `;
                }

                containerCustom.appendChild(card);
            });
        }

        // Função para expandir ou colapsar dinamicamente a lista de opções do item múltiplo
        function toggleExpandirItemMúltiplo(index) {
            const item = appState.itensCustom[index];
            item.expandido = !item.expandido;
            renderizarPainelPrincipal();
        }

        // Função de ativação/desativação da visibilidade do item
        function toggleOcultarItem(index) {
            const item = appState.itensCustom[index];
            item.oculto = !item.oculto;
            
            renderizarPainelPrincipal();
            renderizarVeiculosAplicaveis();
            atualizarResumoTab();
            
            showToast(item.oculto ? `Item "${item.nome.trim()}" ocultado da tabela de resumo!` : `Item "${item.nome.trim()}" agora está visível na tabela!`);
        }

        function atualizarOpcaoItemMúltiplo(itemIndex, optIndex, novoValor) {
            const item = appState.itensCustom[itemIndex];
            const valorAntigo = item.opcoes[optIndex];
            const valorNovo = novoValor.trim().toUpperCase();
            
            if (valorAntigo === valorNovo) return;

            // Atualiza na lista mestre
            item.opcoes[optIndex] = valorNovo;

            // Função auxiliar para atualizar o nome da opção dentro dos detalhes salvos de um veículo
            const atualizarDetalhesVeiculo = (valores) => {
                if (valores && valores[item.nome] && Array.isArray(valores[item.nome].detalhes)) {
                    valores[item.nome].detalhes = valores[item.nome].detalhes.map(d => {
                        if (!d) return d;
                        if (typeof d === 'string') {
                            return d === valorAntigo ? valorNovo : d;
                        } else if (typeof d === 'object') {
                            if (d.opcao === valorAntigo) {
                                d.opcao = valorNovo;
                            }
                            return d;
                        }
                        return d;
                    });
                }
            };

            // Aplica o rename no veículo principal
            atualizarDetalhesVeiculo(appState.principal.valores);

            // Aplica o rename em todos os veículos aplicáveis
            if (Array.isArray(appState.aplicaveis)) {
                appState.aplicaveis.forEach(v => {
                    atualizarDetalhesVeiculo(v.valores);
                });
            }
            
            // Re-renderiza e sincroniza instantaneamente com os painéis e resumo
            renderizarPainelPrincipal();
            renderizarVeiculosAplicaveis();
            atualizarResumoTab();
        }

        function removerOpcaoItemMúltiplo(itemIndex, optIndex) {
            const item = appState.itensCustom[itemIndex];
            const optRemovida = item.opcoes[optIndex];
            item.opcoes.splice(optIndex, 1);
            
            // Limpa o estado se algum veículo já possuía essa opção selecionada
            const filterFn = d => {
                if (!d) return false;
                if (typeof d === 'string') return d !== optRemovida;
                return d.opcao !== optRemovida;
            };

            if (appState.principal.valores[item.nome] && appState.principal.valores[item.nome].detalhes) {
                appState.principal.valores[item.nome].detalhes = appState.principal.valores[item.nome].detalhes.filter(filterFn);
            }
            appState.aplicaveis.forEach(v => {
                if (v.valores[item.nome] && v.valores[item.nome].detalhes) {
                    v.valores[item.nome].detalhes = v.valores[item.nome].detalhes.filter(filterFn);
                }
            });

            renderizarPainelPrincipal();
            renderizarVeiculosAplicaveis();
            atualizarResumoTab();
            showToast('Opção removida!');
        }

        function adicionarOpcaoItemMúltiplo(itemIndex) {
            const item = appState.itensCustom[itemIndex];
            if (!item.opcoes) item.opcoes = [];
            const novaOpt = `OPÇÃO ${item.opcoes.length + 1}`;
            item.opcoes.push(novaOpt);
            
            item.expandido = true;

            renderizarPainelPrincipal();
            renderizarVeiculosAplicaveis();
            atualizarResumoTab();
            showToast('Opção adicionada!');
        }

        // Função de reordenação dos itens customizados
        function moverItemCustom(index, direcao) {
            const novoIndex = index + direcao;
            if (novoIndex < 0 || novoIndex >= appState.itensCustom.length) return;
            
            // Troca de posição
            const temp = appState.itensCustom[index];
            appState.itensCustom[index] = appState.itensCustom[novoIndex];
            appState.itensCustom[novoIndex] = temp;
            
            renderizarPainelPrincipal();
            renderizarVeiculosAplicaveis();
            atualizarResumoTab();
            showToast('Ordem do item atualizada!');
        }

        function adicionarNovoItemMestre(tipo = 'simple') {
            const index = appState.itensCustom.length + 1;
            let novoItemObj;
            
            if (tipo === 'multiple') {
                const novoItemNome = `ITEM MÚLTIPLO ${index}`;
                novoItemObj = { tipo: "multiple", nome: novoItemNome, opcoes: ["OPÇÃO 1", "OPÇÃO 2"], oculto: false, expandido: true };
            } else {
                const novoItemNome = `OUTRO ITEM ${index}`;
                novoItemObj = { tipo: "simple", nome: novoItemNome, obs: "", oculto: false };
            }
            
            appState.itensCustom.push(novoItemObj);
            
            // Inicializar status padrão nos veículos usando o nome como chave
            appState.principal.valores[novoItemObj.nome] = { status: "-", detalhes: [] };
            appState.aplicaveis.forEach(v => {
                v.valores[novoItemObj.nome] = { status: "-", detalhes: [] };
            });

            renderizarPainelPrincipal();
            renderizarVeiculosAplicaveis();
            atualizarResumoTab();
            showToast(`Item ${tipo === 'multiple' ? 'Múltiplo' : 'Simples'} cadastrado!`);
        }

        function atualizarNomeItemCustom(index, novoValor) {
            const itemObj = appState.itensCustom[index];
            const valorAntigo = itemObj.nome;
            novoValor = novoValor.toUpperCase().trim();

            if (!novoValor) {
                showToast('O nome do item não pode ser vazio!');
                renderizarPainelPrincipal();
                return;
            }

            const existeOutro = appState.itensCustom.some((item, i) => item.nome === novoValor && i !== index);
            if (existeOutro) {
                showToast('Este item já existe na lista!');
                renderizarPainelPrincipal();
                return;
            }

            // Atualizar no objeto de estado
            itemObj.nome = novoValor;

            // Migrar os dados preenchidos anteriormente de forma limpa
            if (appState.principal.valores[valorAntigo]) {
                appState.principal.valores[novoValor] = appState.principal.valores[valorAntigo];
                delete appState.principal.valores[valorAntigo];
            } else {
                appState.principal.valores[novoValor] = { status: "-", detalhes: [] };
            }

            appState.aplicaveis.forEach(v => {
                if (v.valores[valorAntigo]) {
                    v.valores[novoValor] = v.valores[valorAntigo];
                    delete v.valores[valorAntigo];
                } else {
                    v.valores[novoValor] = { status: "-", detalhes: [] };
                }
            });

            renderizarPainelPrincipal();
            renderizarVeiculosAplicaveis();
            atualizarResumoTab();
            showToast('Nome do item atualizado!');
        }

        function atualizarObsItemCustom(index, novaObs) {
            appState.itensCustom[index].obs = novaObs.trim();
            atualizarResumoTab();
            showToast('Observação do item atualizada!');
        }

        function removerItemMestre(index) {
            const itemObj = appState.itensCustom[index];
            const itemNome = itemObj.nome;
            appState.itensCustom.splice(index, 1);

            // Remover dos registros dos veículos
            delete appState.principal.valores[itemNome];
            appState.aplicaveis.forEach(v => {
                delete v.valores[itemNome];
            });

            renderizarPainelPrincipal();
            renderizarVeiculosAplicaveis();
            atualizarResumoTab();
            showToast('Item removido com sucesso!');
        }

        function atualizarStatusItemSimplesDirect(contexto, vIndex, itemChave, novoStatus) {
            let target = contexto === 'principal' ? appState.principal.valores : appState.aplicaveis[vIndex].valores;
            if (!target[itemChave]) {
                target[itemChave] = { status: "-", detalhes: [] };
            }
            target[itemChave].status = novoStatus;
            
            if (contexto === 'principal') {
                renderizarPainelPrincipal();
            } else {
                renderizarVeiculosAplicaveis();
            }
            atualizarResumoTab();
        }

        /* ==========================================================================
           6. RENDERIZAÇÃO: VEÍCULOS APLICÁVEIS COM REORDENAÇÃO HORIZONTAL (Aba 4)
           ========================================================================== */
        function renderizarBotoesNumerados() {
            const containerBotoes = document.getElementById('veiculos-botoes-container');
            if (!containerBotoes) return;
            containerBotoes.innerHTML = '';

            appState.aplicaveis.forEach((veiculo, idx) => {
                const isActive = idx === activeVeiculoIndex;
                
                // Wrapper de alinhamento vertical para o botão numérico + suas setas sob ele
                const wrapper = document.createElement('div');
                wrapper.style.display = 'inline-flex';
                wrapper.style.flexDirection = 'column';
                wrapper.style.alignItems = 'center';
                wrapper.style.gap = '2px';

                const btn = document.createElement('button');
                btn.className = isActive ? 'orange-button' : 'orange-button secondary';
                btn.style.borderRadius = '50%';
                btn.style.width = '38px';
                btn.style.height = '38px';
                btn.style.padding = '0';
                btn.style.display = 'inline-flex';
                btn.style.alignItems = 'center';
                btn.style.justifyContent = 'center';
                btn.style.fontWeight = 'bold';
                btn.style.fontSize = '1em';
                
                // Tooltip mostrando o nome atualizado do veículo
                btn.title = veiculo.nome; 
                btn.innerText = idx + 1;
                btn.onclick = function() {
                    activeVeiculoIndex = idx;
                    renderizarVeiculosAplicaveis();
                };

                wrapper.appendChild(btn);
                containerBotoes.appendChild(wrapper);
            });
        }

        function renderizarVeiculosAplicaveis() {
            const container = document.getElementById('veiculos-aplicaveis-lista');
            container.innerHTML = '';

            // Update screen dynamic numbering buttons
            renderizarBotoesNumerados();

            if (appState.aplicaveis.length === 0) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 40px; border: 2px dashed var(--gray-border); border-radius: 12px; background: #ffffff;">
                        <i class="fa-solid fa-truck-ramp-box" style="font-size: 3em; color: var(--text-muted); margin-bottom: 15px;"></i>
                        <p style="color: var(--text-muted); font-weight: 500;">Nenhum veículo aplicável cadastrado para esta Sprint.</p>
                        <button class="orange-button" style="margin-top: 15px;" onclick="adicionarVeiculoAplicavelItens()">
                            Adicionar Primeiro Veículo
                        </button>
                    </div>
                `;
                return;
            }

            // Garante que o index ativo esteja nos limites do array
            if (activeVeiculoIndex >= appState.aplicaveis.length) {
                activeVeiculoIndex = appState.aplicaveis.length - 1;
            }
            if (activeVeiculoIndex < 0) {
                activeVeiculoIndex = 0;
            }

            const veiculo = appState.aplicaveis[activeVeiculoIndex];
            const vIndex = activeVeiculoIndex;

            const card = document.createElement('div');
            card.className = 'veiculo-card';
            card.id = `veiculo-card-${veiculo.id}`;

            // Header com orientação e alinhamento do carrinho laranja e campo do veículo aplicável com classe veiculo-nome-wrapper
            const header = document.createElement('div');
            header.className = 'veiculo-card-header';
            header.style.display = 'flex';
            header.style.alignItems = 'flex-end';
            header.style.justifyContent = 'space-between';
            header.style.padding = '12px 20px';
            header.innerHTML = `
                <div style="display: flex; align-items: flex-end; gap: 12px; flex: 1; max-width: 65%;">
                    <i class="fa-solid fa-car" style="font-size: 1.5em; color: var(--orange-main); margin-bottom: 6px;"></i>
                    <div class="veiculo-nome-wrapper">
                        <label style="font-size: 0.75em; font-weight: 700; color: var(--orange-hover); margin-bottom: 2px; text-transform: uppercase;">Modelo, Motor e Versão:</label>
                        <input type="text" class="form-control input-nome-aplicavel" style="font-weight: bold; background: transparent; border: none; padding: 2px 4px; height: 30px; box-shadow: none;" 
                               value="${veiculo.nome}" oninput="atualizarNomeVeiculoAplicavel(${vIndex}, this.value)" 
                               onchange="if (typeof filtrarNomeVeiculo === 'function') { const f = filtrarNomeVeiculo(this.value); if (f && f !== this.value) { this.value = f; atualizarNomeVeiculoAplicavel(${vIndex}, f); atualizarResumoTab(); } }"
                               placeholder="Nome do Veículo Aplicável">
                    </div>
                </div>
                <div style="display: flex; gap: 8px; align-items: flex-end;">
                    <button class="orange-button" style="padding: 6px 14px; font-size: 0.85em; height: 38px; margin-bottom: 4px;" onclick="copiarSistemasVeiculoPrincipal(${vIndex})" title="Copiar todas as configurações do Veículo Principal para este veículo">
                        <i class="fa-solid fa-copy"></i> Copiar Sistemas
                    </button>
                    <button class="red-button" style="padding: 6px 12px; font-size: 0.85em; height: 38px; margin-bottom: 4px;" onclick="removerVeiculoAplicavel(${vIndex})">
                        <i class="fa-solid fa-trash-can"></i> Excluir Veículo
                    </button>
                </div>
            `;

            const body = document.createElement('div');
            body.className = 'veiculo-card-body';

            // Estrutura idêntica ao VEÍCULO PRINCIPAL com os blocos "Itens Fixos" e "Outros Itens Cadastrados"
            const secaoConfig = document.createElement('div');
            secaoConfig.className = 'section-card';
            secaoConfig.style.boxShadow = 'none';
            secaoConfig.style.border = '1px solid var(--gray-border)';
            secaoConfig.style.marginBottom = '0';
            secaoConfig.style.backgroundColor = '#ffffff';

            secaoConfig.innerHTML = `
                <h3 class="section-title">
                    <span>Configuração de Série & Opcionais</span>
                    <span style="font-size: 0.75em; font-weight: normal; color: var(--text-muted);">
                        Preenchimento dos itens para ${veiculo.nome}.
                    </span>
                </h3>
                <!-- Bloco Didático de Legendas -->
                <div class="legendas-box">
                    <p class="legendas-title">LEGENDAS:</p>
                    <div class="legendas-items">
                        <span class="legenda-item"><strong class="badge-circle s">S</strong> = De Série</span>
                        <span class="legenda-item"><strong class="badge-circle o">O</strong> = Opcional</span>
                        <span class="legenda-item"><strong class="badge-circle n">-</strong> = Não Possui</span>
                    </div>
                </div>

                <!-- Bloco 1: Itens Fixos -->
                <div style="margin-bottom: 25px;">
                    <h4 style="color: var(--primary-green); margin-bottom: 10px; font-size: 0.95em; border-left: 3px solid var(--orange-main); padding-left: 8px;">
                        Itens Fixos
                    </h4>
                    
                    <div id="aplicavel-itens-fixos-container-${vIndex}" class="items-grid-container">
                    </div>
                </div>

                <!-- Bloco 2: Outros Itens Cadastrados -->
                <div>
                    <h4 style="color: var(--primary-green); margin-bottom: 12px; font-size: 0.95em; border-left: 3px solid var(--orange-main); padding-left: 8px;">
                        Outros Itens Cadastrados
                    </h4>

                    <div id="aplicavel-itens-custom-container-${vIndex}" style="margin-top: 10px;">
                    </div>
                </div>
            `;

            body.appendChild(secaoConfig);
            card.appendChild(header);
            card.appendChild(body);
            container.appendChild(card);

            // 1. Injetar os Itens Fixos Core do Veículo Aplicável (idêntico ao Veículo Principal)
            const containerFixos = document.getElementById(`aplicavel-itens-fixos-container-${vIndex}`);
            if (containerFixos) {
                ITENS_FIXOS_DEFINICAO.forEach(item => {
                    const itemEstado = veiculo.valores[item.id] || { status: "-", detalhes: [] };
                    
                    const row = document.createElement('div');
                    row.className = 'item-row-card';
                    row.style.alignItems = 'center';

                    let subOptionsHTML = item.opcoes.map(opt => {
                        const isChecked = itemEstado.detalhes && itemEstado.detalhes.includes(opt) ? 'checked' : '';
                        const idCheck = `chk-aplicavel-${vIndex}-${item.id}-${opt.replace(/\s+/g, '')}`;
                        return `
                            <label for="${idCheck}" style="display: inline-flex; align-items: center; gap: 5px; cursor: pointer; font-size: 0.9em; margin-right: 12px;">
                                <input type="checkbox" id="${idCheck}" value="${opt}" ${isChecked} 
                                       onchange="atualizarCheckboxDetalhe('aplicavel', ${vIndex}, '${item.id}', '${opt}', this.checked)">
                                ${opt}
                            </label>
                        `;
                    }).join('');

                    row.innerHTML = `
                        <div class="item-info">
                            <span class="item-title" style="font-weight: 700; text-transform: uppercase;">${item.nome}</span>
                            <div class="item-details-selector" style="margin-top: 6px;">
                                ${subOptionsHTML}
                            </div>
                        </div>
                        <div style="width: 195px; display: flex; justify-content: flex-end; align-items: center;">
                            <span style="font-size: 0.8em; font-weight: bold; color: var(--text-muted); background: #eee; padding: 3px 10px; border-radius: 12px;">
                                Item Fixo
                            </span>
                        </div>
                    `;
                    containerFixos.appendChild(row);
                });
            }

            // 2. Injetar os Itens Customizados do Veículo Aplicável (idêntico ao Veículo Principal com tristates S / O / -)
            const containerCustom = document.getElementById(`aplicavel-itens-custom-container-${vIndex}`);
            if (containerCustom) {
                const itensVisiveis = appState.itensCustom.filter(i => !i.oculto);
                if (itensVisiveis.length === 0) {
                    containerCustom.innerHTML = `<p style="text-align: center; color: var(--text-muted); font-size: 0.9em; padding: 15px;">Nenhum item cadastrado no Veículo Principal.</p>`;
                } else {
                    appState.itensCustom.forEach(item => {
                        if (item.oculto) return;
                        
                        const itemEstado = veiculo.valores[item.nome] || { status: "-", detalhes: [] };

                        const itemCard = document.createElement('div');
                        itemCard.className = 'item-card-unified';

                        if (item.tipo === 'multiple') {
                            // Sub-opções com Tristate S / O / - perfeitamente alinhadas
                            const optionsHTML = (item.opcoes || []).map(opt => {
                                const activeOptObj = Array.isArray(itemEstado.detalhes) 
                                    ? itemEstado.detalhes.find(d => d && (d.opcao === opt || d === opt)) 
                                    : null;
                                
                                let activeStatus = '-';
                                if (activeOptObj) {
                                    activeStatus = typeof activeOptObj === 'object' ? (activeOptObj.status || 'S') : 'S';
                                }

                                return `
                                    <div class="sub-option-row">
                                        <div style="display: flex; align-items: center; gap: 8px; flex: 1; min-width: 150px;">
                                            <span style="font-size: 0.85em; color: var(--text-muted);"><i class="fa-regular fa-square"></i></span>
                                            <span style="font-size: 0.9em; font-weight: 600; text-transform: uppercase;">${opt}</span>
                                        </div>
                                        
                                        <!-- Mini Tristate Alinhado Perfeitamente na Coluna de 115px -->
                                        <div class="item-tristate-col">
                                            <div class="tristate-options">
                                                <button class="tristate-btn ${activeStatus === 'S' ? 'active' : ''}" data-val="S" 
                                                        onclick="atualizarTristateOpcaoMúltipla('aplicavel', ${vIndex}, '${item.nome}', '${opt}', 'S')">S</button>
                                                <button class="tristate-btn ${activeStatus === 'O' ? 'active' : ''}" data-val="O" 
                                                        onclick="atualizarTristateOpcaoMúltipla('aplicavel', ${vIndex}, '${item.nome}', '${opt}', 'O')">O</button>
                                                <button class="tristate-btn ${activeStatus === '-' ? 'active' : ''}" data-val="-" 
                                                        onclick="atualizarTristateOpcaoMúltipla('aplicavel', ${vIndex}, '${item.nome}', '${opt}', '-')">-</button>
                                            </div>
                                        </div>

                                        <!-- Espaçador de Ações (80px) para manter o alinhamento com a coluna da direita -->
                                        <div class="item-actions-col"></div>
                                    </div>
                                `;
                            }).join('');

                            itemCard.innerHTML = `
                                <div class="item-card-main-row">
                                    <div class="item-arrows-col" style="visibility: hidden;"></div>

                                    <div class="item-inputs-col">
                                        <span class="item-title" style="font-weight: 700; text-transform: uppercase;">${item.nome}</span>
                                    </div>

                                    <div class="item-tristate-col"></div>
                                    <div class="item-actions-col"></div>
                                </div>

                                <div style="background-color: #ffffff; padding: 10px; border-radius: 8px; border: 1px dashed var(--gray-border); margin-left: 42px;">
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                                        <span style="font-size: 0.82em; font-weight: bold; color: var(--text-muted); letter-spacing: 0.3px;">
                                            OPÇÕES DISPONÍVEIS:
                                        </span>
                                    </div>
                                    <div style="display: flex; flex-direction: column;">
                                        ${optionsHTML || `<p style="font-size: 0.85em; color: var(--text-muted); font-style: italic; padding: 5px;">Nenhuma opção disponível.</p>`}
                                    </div>
                                </div>
                            `;
                        } else {
                            // Item Simples com Tristate S / O / -
                            const currentStatus = itemEstado.status || '-';

                            itemCard.innerHTML = `
                                <div class="item-card-main-row">
                                    <div class="item-arrows-col" style="visibility: hidden;"></div>

                                    <div class="item-inputs-col">
                                        <span class="item-title" style="font-weight: 700; text-transform: uppercase;">${item.nome}</span>
                                        ${item.obs ? `<span style="font-size: 0.85em; color: var(--text-muted); font-style: italic;">(${item.obs})</span>` : ''}
                                    </div>

                                    <div class="item-tristate-col">
                                        <div class="tristate-options">
                                            <button class="tristate-btn ${currentStatus === 'S' ? 'active' : ''}" data-val="S" 
                                                    onclick="atualizarStatusItemSimplesDirect('aplicavel', ${vIndex}, '${item.nome}', 'S')">S</button>
                                            <button class="tristate-btn ${currentStatus === 'O' ? 'active' : ''}" data-val="O" 
                                                    onclick="atualizarStatusItemSimplesDirect('aplicavel', ${vIndex}, '${item.nome}', 'O')">O</button>
                                            <button class="tristate-btn ${currentStatus === '-' ? 'active' : ''}" data-val="-" 
                                                    onclick="atualizarStatusItemSimplesDirect('aplicavel', ${vIndex}, '${item.nome}', '-')">-</button>
                                        </div>
                                    </div>

                                    <div class="item-actions-col"></div>
                                </div>
                            `;
                        }

                        containerCustom.appendChild(itemCard);
                    });
                }
            }
        }

        function adicionarVeiculoAplicavelItens() {
            const id = nextVeiculoId++;
            const novoVeiculo = {
                id: id,
                nome: `Veículo Aplicável #${appState.aplicaveis.length + 1}`,
                valores: {}
            };

            // Inicializar status padrão com "-" e detalhes vazios (não clona automaticamente)
            ITENS_FIXOS_DEFINICAO.forEach(item => {
                novoVeiculo.valores[item.id] = { status: "-", detalhes: [] };
            });
            appState.itensCustom.forEach(item => {
                novoVeiculo.valores[item.nome] = { status: "-", detalhes: [] };
            });

            appState.aplicaveis.push(novoVeiculo);
            activeVeiculoIndex = appState.aplicaveis.length - 1;

            // Sincroniza criando o veículo correspondente no Planejamento se ainda não existir
            const listaPlanAdd = (typeof veiculosAplicaveisData !== 'undefined' && Array.isArray(veiculosAplicaveisData))
                ? veiculosAplicaveisData
                : ((typeof window !== 'undefined' && Array.isArray(window.veiculosAplicaveisData)) ? window.veiculosAplicaveisData : null);
            if (Array.isArray(listaPlanAdd)) {
                while (listaPlanAdd.length < appState.aplicaveis.length) {
                    if (typeof criarNovoVeiculoAplicavel === 'function') {
                        criarNovoVeiculoAplicavel();
                    } else {
                        listaPlanAdd.push({ dadosGerais: {}, sistemas: [] });
                    }
                }
                if (typeof renderizarPaginacaoVeiculosAplicaveis === 'function') renderizarPaginacaoVeiculosAplicaveis();
                if (typeof atualizarVisibilidadeDadosCardAplicaveis === 'function') atualizarVisibilidadeDadosCardAplicaveis();
            }

            renderizarVeiculosAplicaveis();
            atualizarResumoTab();
            showToast('Veículo aplicável adicionado! Se desejar carregar os itens, clique em "Copiar Sistemas".');
        }

        let pendenteDestinoVIndex = null;
        let pendenteDoadorTipo = null; // 'principal' ou 'aplicavel'
        let pendenteDoadorIndex = null;
        let pendenteDoadorNome = "";

        // Helper para verificar se um veículo aplicável possui alguma opção preenchida
        function veiculoPossuiPreenchimento(vIndex) {
            const v = appState.aplicaveis[vIndex];
            if (!v || !v.valores) return false;
            
            for (const chave in v.valores) {
                const item = v.valores[chave];
                if (!item) continue;
                
                // Status direto (como S ou O em itens simples)
                if (item.status && item.status !== '-') {
                    return true;
                }
                
                // Sub-opções ou checkboxes preenchidos
                if (Array.isArray(item.detalhes) && item.detalhes.length > 0) {
                    for (let i = 0; i < item.detalhes.length; i++) {
                        const det = item.detalhes[i];
                        if (typeof det === 'string' && det.trim() !== '') {
                            return true;
                        }
                        if (det && typeof det === 'object' && det.status && det.status !== '-') {
                            return true;
                        }
                    }
                }
            }
            return false;
        }

        function abrirModalCopiarSistemas(vIndex) {
            if (!appState.aplicaveis[vIndex]) return;
            pendenteDestinoVIndex = vIndex;
            pendenteDoadorTipo = null;
            pendenteDoadorIndex = null;
            pendenteDoadorNome = "";

            const destino = appState.aplicaveis[vIndex];
            const nomeDestino = destino.nome || `Veículo Aplicável #${vIndex + 1}`;

            // Exibir visão de seleção de doador e ocultar alerta
            const visaoSelecao = document.getElementById('modal-copiar-visao-selecao');
            const visaoAlerta = document.getElementById('modal-copiar-visao-alerta');
            if (visaoSelecao) visaoSelecao.style.display = 'block';
            if (visaoAlerta) visaoAlerta.style.display = 'none';

            // Preencher os veículos doadores disponíveis
            const containerDoadores = document.getElementById('modal-copiar-doadores-container');
            if (containerDoadores) {
                containerDoadores.innerHTML = '';

                // 1. Veículo Principal (Sempre disponível como doador)
                const inputPrincipal = document.getElementById('nome-veiculo-principal');
                const nomePrincipal = (inputPrincipal && inputPrincipal.value.trim()) 
                                     ? inputPrincipal.value.trim() 
                                     : (appState.principal.nome || "Veículo Principal");

                const cardPrincipal = document.createElement('div');
                cardPrincipal.className = 'veiculo-doador-card';
                cardPrincipal.onclick = () => selecionarVeiculoDoador('principal', null, nomePrincipal);
                cardPrincipal.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 14px;">
                        <div class="veiculo-doador-icon principal">
                            <i class="fa-solid fa-car"></i>
                        </div>
                        <div>
                            <div class="veiculo-doador-nome">${nomePrincipal}</div>
                            <span class="veiculo-doador-tag principal">VEÍCULO PRINCIPAL</span>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 6px; color: var(--primary-green); font-weight: 700; font-size: 0.85em;">
                        <span>Copiar deste</span>
                        <i class="fa-solid fa-chevron-right"></i>
                    </div>
                `;
                containerDoadores.appendChild(cardPrincipal);

                // 2. Outros Veículos Aplicáveis (exceto o próprio que receberá a cópia)
                appState.aplicaveis.forEach((outroVeiculo, idx) => {
                    if (idx === vIndex) return; // Não lista a si mesmo

                    const nomeOutro = outroVeiculo.nome || `Veículo Aplicável #${idx + 1}`;
                    const cardOutro = document.createElement('div');
                    cardOutro.className = 'veiculo-doador-card';
                    cardOutro.onclick = () => selecionarVeiculoDoador('aplicavel', idx, nomeOutro);
                    cardOutro.innerHTML = `
                        <div style="display: flex; align-items: center; gap: 14px;">
                            <div class="veiculo-doador-icon aplicavel">
                                <i class="fa-solid fa-car"></i>
                            </div>
                            <div>
                                <div class="veiculo-doador-nome">${nomeOutro}</div>
                                <span class="veiculo-doador-tag aplicavel">VEÍCULO APLICÁVEL #${idx + 1}</span>
                            </div>
                        </div>
                        <div style="display: flex; align-items: center; gap: 6px; color: var(--orange-main); font-weight: 700; font-size: 0.85em;">
                            <span>Copiar deste</span>
                            <i class="fa-solid fa-chevron-right"></i>
                        </div>
                    `;
                    containerDoadores.appendChild(cardOutro);
                });
            }

            const modal = document.getElementById('modal-confirmacao-copia');
            if (modal) {
                modal.classList.add('active');
            }
        }

        function selecionarVeiculoDoador(tipo, idx, nomeDoador) {
            pendenteDoadorTipo = tipo;
            pendenteDoadorIndex = idx;
            pendenteDoadorNome = nomeDoador;

            const targetIdx = pendenteDestinoVIndex;
            if (targetIdx === null || !appState.aplicaveis[targetIdx]) {
                fecharModalCopiarSistemas();
                return;
            }

            // CHECK: O veículo aplicável destino possui alguma das opções preenchidas?
            const temPreenchimento = veiculoPossuiPreenchimento(targetIdx);

            if (temPreenchimento) {
                // Caso POSSUA dados preenchidos: Exibir o popup de alerta sobre sobrescrita
                const visaoSelecao = document.getElementById('modal-copiar-visao-selecao');
                const visaoAlerta = document.getElementById('modal-copiar-visao-alerta');
                const labelDoador = document.getElementById('modal-alerta-nome-doador');
                if (labelDoador) {
                    labelDoador.innerText = nomeDoador;
                }
                if (visaoSelecao) visaoSelecao.style.display = 'none';
                if (visaoAlerta) visaoAlerta.style.display = 'block';
            } else {
                // Caso esteja "EM BRANCO": A cópia é feita imediatamente sem alerta de perda de dados
                executarConfirmacaoCopiarSistemas();
            }
        }

        function voltarParaSelecaoDoador() {
            const visaoSelecao = document.getElementById('modal-copiar-visao-selecao');
            const visaoAlerta = document.getElementById('modal-copiar-visao-alerta');
            if (visaoSelecao) visaoSelecao.style.display = 'block';
            if (visaoAlerta) visaoAlerta.style.display = 'none';
        }

        function fecharModalCopiarSistemas() {
            pendenteDestinoVIndex = null;
            pendenteDoadorTipo = null;
            pendenteDoadorIndex = null;
            pendenteDoadorNome = "";
            const modal = document.getElementById('modal-confirmacao-copia');
            if (modal) {
                modal.classList.remove('active');
            }
        }

        function executarConfirmacaoCopiarSistemas() {
            if (pendenteDestinoVIndex === null || !appState.aplicaveis[pendenteDestinoVIndex]) {
                fecharModalCopiarSistemas();
                return;
            }
            const targetIdx = pendenteDestinoVIndex;

            // Obter os valores do doador selecionado
            let valoresOrigem = null;
            if (pendenteDoadorTipo === 'principal') {
                valoresOrigem = appState.principal.valores;
            } else if (pendenteDoadorTipo === 'aplicavel' && pendenteDoadorIndex !== null && appState.aplicaveis[pendenteDoadorIndex]) {
                valoresOrigem = appState.aplicaveis[pendenteDoadorIndex].valores;
            }

            if (!valoresOrigem) {
                fecharModalCopiarSistemas();
                return;
            }

            // Clona profundamente os valores (todos os capítulos/itens)
            appState.aplicaveis[targetIdx].valores = JSON.parse(JSON.stringify(valoresOrigem));

            const nomeDestino = appState.aplicaveis[targetIdx].nome || `Veículo #${targetIdx + 1}`;
            const nomeDoador = pendenteDoadorNome || (pendenteDoadorTipo === 'principal' ? 'Veículo Principal' : 'Veículo Doador');

            fecharModalCopiarSistemas();
            renderizarVeiculosAplicaveis();
            atualizarResumoTab();
            showToast(`Itens copiados com sucesso de "${nomeDoador}" para "${nomeDestino}"!`);
        }

        // Compatibilidade reversa
        function copiarSistemasVeiculoPrincipal(vIndex) {
            abrirModalCopiarSistemas(vIndex);
        }

        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                fecharModalCopiarSistemas();
            }
        });

        function atualizarNomeVeiculoAplicavel(vIndex, novoNome) {
            appState.aplicaveis[vIndex].nome = novoNome;
            // Elevando a segurança de tooltips com sincronização em lote
            const botoes = document.getElementById('veiculos-botoes-container')?.children;
            if (botoes && botoes[vIndex]) {
                const innerBtn = botoes[vIndex].querySelector('button');
                if (innerBtn) innerBtn.title = novoNome;
            }
        }

        function removerVeiculoAplicavel(vIndex) {
            appState.aplicaveis.splice(vIndex, 1);
            if (activeVeiculoIndex >= appState.aplicaveis.length) {
                activeVeiculoIndex = Math.max(0, appState.aplicaveis.length - 1);
            }

            // Sincroniza removendo também no Planejamento para manter as abas com os mesmos veículos
            const listaPlanRem = (typeof veiculosAplicaveisData !== 'undefined' && Array.isArray(veiculosAplicaveisData))
                ? veiculosAplicaveisData
                : ((typeof window !== 'undefined' && Array.isArray(window.veiculosAplicaveisData)) ? window.veiculosAplicaveisData : null);
            if (Array.isArray(listaPlanRem) && listaPlanRem.length > vIndex) {
                listaPlanRem.splice(vIndex, 1);
                if (typeof veiculoAplicavelAtual !== 'undefined') {
                    veiculoAplicavelAtual = Math.max(0, Math.min(vIndex, listaPlanRem.length - 1));
                    if (typeof window !== 'undefined') window.veiculoAplicavelAtual = veiculoAplicavelAtual;
                }
                if (typeof renderizarVeiculoAplicavel === 'function') {
                    if (listaPlanRem.length > 0) {
                        renderizarVeiculoAplicavel(typeof veiculoAplicavelAtual !== 'undefined' ? veiculoAplicavelAtual : 0);
                        if (typeof renderizarPaginacaoVeiculosAplicaveis === 'function') renderizarPaginacaoVeiculosAplicaveis();
                    } else {
                        const c = document.getElementById('veiculos-aplicaveis-container');
                        if (c) c.innerHTML = '';
                        const p = document.getElementById('paginacao-veiculos-aplicaveis');
                        if (p) p.innerHTML = '';
                    }
                }
                if (typeof atualizarVisibilidadeDadosCardAplicaveis === 'function') {
                    atualizarVisibilidadeDadosCardAplicaveis();
                }
            }

            renderizarVeiculosAplicaveis();
            atualizarResumoTab();
            showToast('Veículo aplicável removido.');
        }

        /* ==========================================================================
           7. ELEMENTO DINÂMICO: CARD DE PREENCHIMENTO DE ITEM (ALINHAMENTO COLUNAR UNIFICADO)
           ========================================================================== */
        function criarCardPreenchimentoItem(itemDef, itemEstado, contexto, itemChave, vIndex = null) {
            const card = document.createElement('div');
            card.className = 'item-card-unified';

            const ehItemFixo = ITENS_FIXOS_DEFINICAO.some(f => f.id === itemChave);
            const itemMestreObj = appState.itensCustom.find(i => i.nome === itemChave);
            const ehItemMúltiplo = itemMestreObj && itemMestreObj.tipo === 'multiple';

            // 1. Tratar Item Fixo
            if (ehItemFixo) {
                card.innerHTML = `
                    <div class="item-card-main-row">
                        <div class="item-inputs-col" style="flex-direction: column; align-items: flex-start;">
                            <span class="item-title" style="font-weight: 700; text-transform: uppercase;">${itemDef.nome}</span>
                            <div class="item-details-selector" style="margin-top: 6px;">
                                ${itemDef.opcoes.map(opt => {
                                    const isChecked = itemEstado.detalhes && itemEstado.detalhes.includes(opt) ? 'checked' : '';
                                    const idCheck = `chk-${contexto}-${vIndex !== null ? vIndex : 'main'}-${itemDef.id}-${opt.replace(/\s+/g, '')}`;
                                    return `
                                        <label for="${idCheck}" style="display: inline-flex; align-items: center; gap: 5px; cursor: pointer; font-size: 0.9em; margin-right: 12px;">
                                            <input type="checkbox" id="${idCheck}" value="${opt}" ${isChecked} 
                                                   onchange="atualizarCheckboxDetalhe('${contexto}', ${vIndex}, '${itemChave}', '${opt}', this.checked)">
                                            ${opt}
                                        </label>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                        <div style="width: 195px; display: flex; justify-content: flex-end; align-items: center;">
                            <span style="font-size: 0.8em; font-weight: bold; color: var(--text-muted); background: #eee; padding: 3px 10px; border-radius: 12px;">
                                Item Fixo
                            </span>
                        </div>
                    </div>
                `;
                return card;
            }

            // 2. Tratar Item Múltiplo
            if (ehItemMúltiplo) {
                const optionsHTML = (itemDef.opcoes || []).map(opt => {
                    const activeOptObj = Array.isArray(itemEstado.detalhes) 
                        ? itemEstado.detalhes.find(d => d && (d.opcao === opt || d === opt)) 
                        : null;
                    
                    let activeStatus = '-';
                    if (activeOptObj) {
                        activeStatus = typeof activeOptObj === 'object' ? (activeOptObj.status || 'S') : 'S';
                    }

                    return `
                        <div class="sub-option-row">
                            <div style="display: flex; align-items: center; gap: 8px; flex: 1; min-width: 150px;">
                                <span style="font-size: 0.85em; color: var(--text-muted);"><i class="fa-regular fa-square"></i></span>
                                <span style="font-size: 0.9em; font-weight: 600; color: var(--text-dark);">${opt}</span>
                            </div>
                            
                            <!-- Mini Tristate Alinhado Perfeitamente na Coluna de 115px -->
                            <div class="item-tristate-col">
                                <div class="tristate-options">
                                    <button class="tristate-btn ${activeStatus === 'S' ? 'active' : ''}" data-val="S" 
                                            onclick="atualizarTristateOpcaoMúltipla('${contexto}', ${vIndex}, '${itemChave}', '${opt}', 'S')">S</button>
                                    <button class="tristate-btn ${activeStatus === 'O' ? 'active' : ''}" data-val="O" 
                                            onclick="atualizarTristateOpcaoMúltipla('${contexto}', ${vIndex}, '${itemChave}', '${opt}', 'O')">O</button>
                                    <button class="tristate-btn ${activeStatus === '-' ? 'active' : ''}" data-val="-" 
                                            onclick="atualizarTristateOpcaoMúltipla('${contexto}', ${vIndex}, '${itemChave}', '${opt}', '-')">-</button>
                                </div>
                            </div>

                            <div class="item-actions-col"></div>
                        </div>
                    `;
                }).join('');

                card.innerHTML = `
                    <div class="item-card-main-row">
                        <div class="item-inputs-col">
                            <span class="item-title" style="font-weight: 700; text-transform: uppercase;">${itemDef.nome}</span>
                        </div>
                        <div class="item-tristate-col"></div>
                        <div class="item-actions-col"></div>
                    </div>

                    <div style="background-color: #ffffff; padding: 10px; border-radius: 8px; border: 1px dashed var(--gray-border);">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                            <span style="font-size: 0.82em; font-weight: bold; color: var(--text-muted); letter-spacing: 0.3px;">
                                OPÇÕES DISPONÍVEIS:
                            </span>
                        </div>
                        <div style="display: flex; flex-direction: column;">
                            ${optionsHTML || `<p style="font-size: 0.85em; color: var(--text-muted); font-style: italic; padding: 5px;">Nenhuma opção disponível.</p>`}
                        </div>
                    </div>
                `;
                return card;
            }

            // 3. Tratar Item Simples
            const currentStatus = itemEstado.status || '-';
            card.innerHTML = `
                <div class="item-card-main-row">
                    <div class="item-inputs-col">
                        <span class="item-title" style="font-weight: 700; text-transform: uppercase;">${itemDef.nome}</span>
                    </div>

                    <div class="item-tristate-col">
                        <div class="tristate-options">
                            <button class="tristate-btn ${currentStatus === 'S' ? 'active' : ''}" data-val="S" 
                                    onclick="atualizarStatusItemSimplesDirect('${contexto}', ${vIndex}, '${itemChave}', 'S')">S</button>
                            <button class="tristate-btn ${currentStatus === 'O' ? 'active' : ''}" data-val="O" 
                                    onclick="atualizarStatusItemSimplesDirect('${contexto}', ${vIndex}, '${itemChave}', 'O')">O</button>
                            <button class="tristate-btn ${currentStatus === '-' ? 'active' : ''}" data-val="-" 
                            onclick="atualizarStatusItemSimplesDirect('${contexto}', ${vIndex}, '${itemChave}', '-')">-</button>
                        </div>
                    </div>

                    <div class="item-actions-col"></div>
                </div>
            `;
            return card;
        }

        /* ==========================================================================
           8. MANIPULADORES DE ESTADO (INPUTS, CHECKBOXES E TRISTATES MÚLTIPLOS)
           ========================================================================== */
        function atualizarTristateOpcaoMúltipla(contexto, vIndex, itemChave, opcao, novoStatus) {
            let target;
            if (contexto === 'principal') {
                target = appState.principal.valores;
            } else {
                target = appState.aplicaveis[vIndex].valores;
            }

            if (!target[itemChave]) {
                target[itemChave] = { status: "-", detalhes: [] };
            }
            
            // Garantir que detalhes seja um array
            if (!Array.isArray(target[itemChave].detalhes)) {
                target[itemChave].detalhes = [];
            }

            // Encontrar índice existente (pode ser formato string herdado ou objeto novo)
            const idx = target[itemChave].detalhes.findIndex(d => d && (d.opcao === opcao || d === opcao));
            
            if (novoStatus === '-') {
                if (idx !== -1) {
                    target[itemChave].detalhes.splice(idx, 1);
                }
            } else {
                if (idx !== -1) {
                    target[itemChave].detalhes[idx] = { opcao: opcao, status: novoStatus };
                } else {
                    target[itemChave].detalhes.push({ opcao: opcao, status: novoStatus });
                }
            }

            // Forçar sincronismo e re-renderizar todas as abas
            renderizarPainelPrincipal();
            renderizarVeiculosAplicaveis();
            atualizarResumoTab();
        }

        function atualizarStatusItem(contexto, vIndex, itemChave, novoStatus, itemId = null) {
            let target;
            if (contexto === 'principal') {
                target = appState.principal.valores;
            } else {
                target = appState.aplicaveis[vIndex].valores;
            }

            if (!target[itemChave]) {
                target[itemChave] = { status: "-", detalhes: [] };
            }

            target[itemChave].status = novoStatus;

            // Habilitar/Desabilitar visualmente os checkboxes correspondentes aos detalhes se possuir
            if (itemId) {
                const selectorClass = `.det-sec-${contexto}-${vIndex !== null ? vIndex : 'main'}-${itemId}`;
                const containerEl = document.querySelector(selectorClass);
                if (containerEl) {
                    const checkboxes = containerEl.querySelectorAll('input[type="checkbox"], input[type="radio"]');
                    if (novoStatus === '-') {
                        containerEl.style.opacity = '0.5';
                        containerEl.style.pointerEvents = 'none';
                        checkboxes.forEach(cb => {
                            cb.disabled = true;
                            cb.checked = false;
                        });
                        // Limpa detalhes salvos
                        target[itemChave].detalhes = [];
                    } else {
                        containerEl.style.opacity = '1';
                        containerEl.style.pointerEvents = 'auto';
                        checkboxes.forEach(cb => {
                            cb.disabled = false;
                        });
                    }
                }
            }
        }

        function atualizarCheckboxDetalhe(contexto, vIndex, itemChave, opcao, checked) {
            let target;
            if (contexto === 'principal') {
                target = appState.principal.valores;
            } else {
                target = appState.aplicaveis[vIndex].valores;
            }

            if (!target[itemChave]) {
                target[itemChave] = { status: "-", detalhes: [] };
            }

            if (checked) {
                if (!target[itemChave].detalhes.includes(opcao)) {
                    target[itemChave].detalhes.push(opcao);
                }
            } else {
                target[itemChave].detalhes = target[itemChave].detalhes.filter(item => item !== opcao);
            }
            atualizarResumoTab();
        }

        function atualizarRadioDetalhe(contexto, vIndex, itemChave, opcao) {
            let target;
            if (contexto === 'principal') {
                target = appState.principal.valores;
            } else {
                target = appState.aplicaveis[vIndex].valores;
            }

            if (!target[itemChave]) {
                target[itemChave] = { status: "-", detalhes: [] };
            }

            // Como é um rádio, substitui a lista inteira de detalhes por essa única opção
            target[itemChave].detalhes = [opcao];
            target[itemChave].status = "-"; 
        }

        /* ==========================================================================
           9. RENDERIZAÇÃO DA TABELA DE RESUMO COMPARATIVO FILTRADO (Aba 1)
           ========================================================================== */
        function atualizarResumoTab() {
            const tableHeaders = document.getElementById('tabela-headers');
            const tableBody = document.getElementById('tabela-body');

            // 1. Atualizar Nome do Veículo Principal
            const inputNomePrincipal = document.getElementById('nome-veiculo-principal');
            if (inputNomePrincipal && inputNomePrincipal.value.trim() !== "") {
                appState.principal.nome = inputNomePrincipal.value.trim();
            } else {
                appState.principal.nome = "Veículo Principal";
            }

            // 2. Reconstruir Header da Tabela Comparativa
            tableHeaders.innerHTML = `
                <th style="background-color: #1b5e20 !important; color: #ffffff !important; text-align: left; padding: 12px 16px; font-weight: bold;">ITENS</th>
                <th style="background-color: #1b5e20 !important; color: #ffffff !important; text-align: center; padding: 12px 16px; font-weight: bold;">${appState.principal.nome.toUpperCase()}</th>
            `;

            appState.aplicaveis.forEach(v => {
                const headerTh = document.createElement('th');
                headerTh.style.textAlign = 'center';
                headerTh.style.backgroundColor = '#f57c00';
                headerTh.style.color = '#ffffff';
                headerTh.style.padding = '12px 16px';
                headerTh.style.fontWeight = 'bold';
                headerTh.innerText = v.nome.toUpperCase();
                tableHeaders.appendChild(headerTh);
            });

            // 3. Gerar Linhas da Tabela
            tableBody.innerHTML = '';

            // 3.1. Adicionar os Itens Core Padrão (Fixos)
            ITENS_FIXOS_DEFINICAO.forEach(item => {
                const row = criarLinhaTabelaResumo(item.id, item.nome, "", false);
                tableBody.appendChild(row);
            });

            // 3.2. Adicionar outros itens customizados criados que não estão ocultos
            appState.itensCustom.forEach(item => {
                if (item.oculto) return; // Filtra itens marcados para ocultar
                const ehMúltiplo = item.tipo === 'multiple';
                const row = criarLinhaTabelaResumo(item.nome, item.nome, ehMúltiplo ? "" : item.obs, ehMúltiplo);
                tableBody.appendChild(row);
            });
        }

        function criarLinhaTabelaResumo(itemChave, itemNomeExibicao, itemObs = "", ehMúltiplo = false) {
            const row = document.createElement('tr');
            
            // Célula do nome do item com a observação formatada em uma segunda linha interna
            const tdItem = document.createElement('td');
            tdItem.style.verticalAlign = 'middle';
            
            if (itemObs && itemObs.trim() !== "") {
                tdItem.innerHTML = `
                    <div style="font-weight: 700; color: var(--primary-green); text-transform: uppercase; font-size: 0.95em;">
                        ${itemNomeExibicao}
                    </div>
                    <div style="font-size: 0.85em; font-weight: 500; color: #555; margin-top: 3px; font-style: italic; line-height: 1.2;">
                        ${itemObs}
                    </div>
                `;
            } else {
                tdItem.innerHTML = `
                    <div style="font-weight: 700; color: var(--primary-green); text-transform: uppercase; font-size: 0.95em;">
                        ${itemNomeExibicao}
                    </div>
                `;
            }
            row.appendChild(tdItem);

            const ehItemFixo = ITENS_FIXOS_DEFINICAO.some(f => f.id === itemChave);

            // Coluna do Veículo Principal
            const dadosPrincipal = appState.principal.valores[itemChave] || { status: "-", detalhes: [] };
            const tdPrincipal = document.createElement('td');
            tdPrincipal.style.textAlign = 'center';
            tdPrincipal.appendChild(obterBadgeStatusFormatado(dadosPrincipal, ehItemFixo, ehMúltiplo, itemChave)); 
            row.appendChild(tdPrincipal);

            // Colunas dos Veículos Aplicáveis
            appState.aplicaveis.forEach(v => {
                const dadosAplicavel = v.valores[itemChave] || { status: "-", detalhes: [] };
                const tdAplicavel = document.createElement('td');
                tdAplicavel.style.textAlign = 'center';
                // Passa itemChave para que a ordenação seja aplicada também nos aplicáveis
                tdAplicavel.appendChild(obterBadgeStatusFormatado(dadosAplicavel, ehItemFixo, ehMúltiplo, itemChave)); 
                row.appendChild(tdAplicavel);
            });

            return row;
        }

        function obterBadgeStatusFormatado(estado, ehItemFixo = false, ehMúltiplo = false, itemChave = null) {
            const wrapper = document.createElement('div');
            wrapper.style.display = 'inline-flex';
            wrapper.style.flexDirection = 'column';
            wrapper.style.alignItems = 'center';
            wrapper.style.gap = '4px'; // Distância ideal entre as linhas Série e Opcional empilhadas

            // Obter a lista de referência ordenada original definida na aba de mestre
            let ordemReferencia = [];
            if (ehItemFixo && itemChave) {
                const fixoDef = ITENS_FIXOS_DEFINICAO.find(f => f.id === itemChave);
                if (fixoDef && fixoDef.opcoes) {
                    ordemReferencia = fixoDef.opcoes;
                }
            } else if (ehMúltiplo && itemChave) {
                const mestreObj = appState.itensCustom.find(i => i.nome === itemChave);
                if (mestreObj && mestreObj.opcoes) {
                    ordemReferencia = mestreObj.opcoes;
                }
            }

            // Tratamento visual diferenciado para Itens Fixos sem status S / O / -
            if (ehItemFixo) {
                if (estado.detalhes && estado.detalhes.length > 0) {
                    // Copiar e ordenar as opções de acordo com a ordem da aba master
                    let detalhesOrdenados = [...estado.detalhes];
                    if (ordemReferencia.length > 0) {
                        detalhesOrdenados.sort((a, b) => {
                            return ordemReferencia.indexOf(a) - ordemReferencia.indexOf(b);
                        });
                    }

                    const badge = document.createElement('span');
                    badge.className = 'status-badge s'; // Badge verde indicando especificação ativa
                    badge.innerText = detalhesOrdenados.join(' / '); // Mudado de ' + ' para ' / ' de forma limpa!
                    wrapper.appendChild(badge);
                } else {
                    const badge = document.createElement('span');
                    badge.className = 'status-badge n';
                    badge.innerText = "Não Possui";
                    wrapper.appendChild(badge);
                }
                return wrapper;
            }

            // Tratamento visual diferenciado para Itens Múltiplos com Série (Verde) ou Opcional (Laranja) granulares
            if (ehMúltiplo) {
                const detalhes = Array.isArray(estado.detalhes) ? estado.detalhes : [];
                
                const serieOpts = [];
                const opcionalOpts = [];

                detalhes.forEach(d => {
                    if (!d) return;
                    let optNome = "";
                    let optStatus = "S";
                    
                    if (typeof d === 'string') {
                        optNome = d;
                    } else if (typeof d === 'object') {
                        optNome = d.opcao;
                        optStatus = d.status || 'S';
                    }

                    // FILTRO DE INTEGRIDADE: Se a opção não existe mais na lista mestre, ignora para evitar fantasmas
                    if (ordemReferencia.length > 0 && !ordemReferencia.includes(optNome)) {
                        return;
                    }

                    if (optStatus === 'S') {
                        serieOpts.push(optNome);
                    } else if (optStatus === 'O') {
                        opcionalOpts.push(optNome);
                    }
                });

                // Ordenar as opções individualmente com base no cadastro do item mestre
                if (ordemReferencia.length > 0) {
                    serieOpts.sort((a, b) => ordemReferencia.indexOf(a) - ordemReferencia.indexOf(b));
                    opcionalOpts.sort((a, b) => ordemReferencia.indexOf(a) - ordemReferencia.indexOf(b));
                }

                if (serieOpts.length === 0 && opcionalOpts.length === 0) {
                    const badge = document.createElement('span');
                    badge.className = 'status-badge n';
                    badge.innerText = "Não Possui";
                    wrapper.appendChild(badge);
                    return wrapper;
                }

                if (serieOpts.length > 0) {
                    const badgeS = document.createElement('span');
                    badgeS.className = 'status-badge s';
                    badgeS.innerText = serieOpts.join(' / '); // Mudado de ' + ' para ' / ' de forma limpa!
                    wrapper.appendChild(badgeS);
                }

                if (opcionalOpts.length > 0) {
                    const badgeO = document.createElement('span');
                    badgeO.className = 'status-badge o';
                    badgeO.innerText = opcionalOpts.join(' / '); // Mudado de ' + ' para ' / ' de forma limpa!
                    wrapper.appendChild(badgeO);
                }

                return wrapper;
            }

            // Renderização padrão para os outros itens simples (S / O / -)
            const badge = document.createElement('span');
            let label = "Não Possui";
            let classeCss = "n";

            if (estado.status === 'S') {
                label = "SÉRIE";
                classeCss = "s";
            } else if (estado.status === 'O') {
                label = "OPCIONAL";
                classeCss = "o";
            }

            badge.className = `status-badge ${classeCss}`;
            badge.innerText = label;

            wrapper.appendChild(badge);

            // Detalhes extras se houverem
            if (estado.status !== '-' && estado.detalhes && estado.detalhes.length > 0) {
                const subDetails = document.createElement('span');
                subDetails.className = 'badge-details';
                subDetails.style.color = '#555';
                subDetails.innerText = `(${estado.detalhes.join(', ')})`;
                wrapper.appendChild(subDetails);
            }

            return wrapper;
        }

        /* ==========================================================================
           10. SALVAR / CARREGAR PROJETO COM VISIBILIDADE (JSON)
           ========================================================================== */
        function salvarComoJSONOriginal() {
            // Atualizar os nomes para garantir gravação correta
            const inputNomePrincipal = document.getElementById('nome-veiculo-principal');
            let nomeVeiculo = "";
            if (inputNomePrincipal) {
                nomeVeiculo = inputNomePrincipal.value.trim();
                appState.principal.nome = nomeVeiculo || "Veículo Principal";
            }

            // Nome dinâmico condicional
            const sufixo = nomeVeiculo ? ` - ${nomeVeiculo}` : "";
            const nomeArquivo = `ITENS DE SÉRIE E OPCIONAIS${sufixo}`.replace(/[/\\?%*:|"<>]/g, '-');

            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(appState, null, 2));
            const downloadAnchor = document.createElement('a');
            downloadAnchor.setAttribute("href", dataStr);
            downloadAnchor.setAttribute("download", `${nomeArquivo}.json`);
            document.body.appendChild(downloadAnchor);
            downloadAnchor.click();
            downloadAnchor.remove();
            showToast('Projeto salvo em arquivo JSON com sucesso!');
        }

        function carregarDeJSONItens(event) {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const loadedJSON = JSON.parse(e.target.result);
                    let targetState = null;
                    if (loadedJSON && loadedJSON.itens_serie) {
                        targetState = loadedJSON.itens_serie;
                    } else if (loadedJSON && loadedJSON.principal && Array.isArray(loadedJSON.itensCustom)) {
                        targetState = loadedJSON;
                    }

                    // Se o JSON contiver dados do Planejamento, sincroniza o input de veículo do Planejamento
                    if (loadedJSON && loadedJSON.principal && loadedJSON.principal.veiculo) {
                        const inputVeicPlan = document.getElementById('veiculo');
                        if (inputVeicPlan) {
                            inputVeicPlan.value = loadedJSON.principal.veiculo;
                        }
                    }

                    if (targetState) {
                        // Se no estado de itens o veículo principal for o padrão ou estiver vazio, puxa do planejamento
                        if (loadedJSON && loadedJSON.principal && loadedJSON.principal.veiculo) {
                            if (!targetState.principal || !targetState.principal.nome || targetState.principal.nome === 'Veículo Principal') {
                                if (!targetState.principal) targetState.principal = { valores: {} };
                                targetState.principal.nome = loadedJSON.principal.veiculo;
                            }
                        }

                        const anoFallback = (loadedJSON && loadedJSON.principal && loadedJSON.principal.veiculo)
                            ? loadedJSON.principal.veiculo
                            : null;

                        carregarAppStateItens(targetState, anoFallback);
                        showToast('Projeto de Itens carregado com sucesso!');
                    } else {
                        showToast('Erro: Arquivo JSON não contém dados compatíveis com Itens.');
                    }
                } catch (err) {
                    showToast('Erro ao ler ou processar o arquivo JSON.');
                    console.error(err);
                }
            };
            reader.readAsText(file);
            event.target.value = '';
        }

        /* ==========================================================================
           11. EXPORTAÇÃO: GERAÇÃO DE PDF COMPARATIVO ADAPTATIVO E SALVAMENTO DUPLO DINÂMICO
           ========================================================================== */
        async function gerarPDF_Formatado() {
            const formatoSelecionado = document.getElementById('pdf-format-select').value;
            showToast('Processando a exportação do PDF selecionado...');
            
            const element = document.getElementById('pdf-capture-area');
            const pdfHeader = document.getElementById('pdf-header-info');
            const dataGeracao = document.getElementById('pdf-generation-date');

            // 1. Mostrar o cabeçalho configurado para o PDF
            if (pdfHeader) pdfHeader.style.display = 'block';
            if (dataGeracao) {
                const d = new Date();
                dataGeracao.innerText = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth()+1).padStart(2, '0')}/${d.getFullYear()} às ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
            }

            // Aguardar renderização das fontes e tabelas antes da captura
            await new Promise(resolve => setTimeout(resolve, 350));

            // --- MELHORIA CRÍTICA CONTRA CORTES DE SCROLL HORIZONTAL ---
            const tableResponsive = element.querySelector('.table-responsive');
            let originalTableStyle = null;
            let originalElementStyle = null;
            let originalScrollLeft = 0;

            if (tableResponsive) {
                originalScrollLeft = tableResponsive.scrollLeft;
                tableResponsive.scrollLeft = 0; // Alinha obrigatoriamente no início antes de fotografar (evita cortes à esquerda)
                originalTableStyle = tableResponsive.getAttribute('style');
                
                // Força o wrapper da tabela a expandir sua largura total para o html2canvas ler todas as colunas
                tableResponsive.style.setProperty('overflow', 'visible', 'important');
                tableResponsive.style.setProperty('overflow-x', 'visible', 'important');
                tableResponsive.style.setProperty('width', 'max-content', 'important');
                tableResponsive.style.setProperty('max-width', 'none', 'important');
            }

            // Força o container pai de captura a expandir horizontalmente para comportar toda a tabela larga temporariamente
            originalElementStyle = element.getAttribute('style');
            element.style.setProperty('width', 'max-content', 'important');
            element.style.setProperty('max-width', 'none', 'important');
            element.style.setProperty('overflow', 'visible', 'important');

            // Opções do html2canvas reforçadas contra rolagem window ativa e cortes horizontais
            const options = {
                scale: 2, // Excelente qualidade para impressão e zoom
                useCORS: true,
                backgroundColor: '#ffffff',
                scrollX: 0,
                scrollY: 0,
                windowWidth: element.scrollWidth, // Força a janela virtual a ter a largura total esticada da tabela
                windowHeight: element.scrollHeight
            };

            html2canvas(element, options).then(canvas => {
                const imgData = canvas.toDataURL('image/png');
                const { jsPDF } = window.jspdf;
                
                let pdf;
                let imgWidth;
                let pageHeight;
                let isContinuous = false;

                // Definir dimensões baseadas no formato escolhido
                if (formatoSelecionado === 'a3_portrait') {
                    // A3 Retrato (297 x 420 mm)
                    pdf = new jsPDF('p', 'mm', 'a3');
                    imgWidth = 297;
                    pageHeight = 420;
                } else if (formatoSelecionado === 'continuous') {
                    // Página Única Contínua Adaptativa
                    isContinuous = true;
                    imgWidth = 420; // Base de largura A3 para manter proporções excelentes
                    pageHeight = (canvas.height * imgWidth) / canvas.width; // Altura calculada sob medida
                    
                    pdf = new jsPDF({
                        orientation: imgWidth > pageHeight ? 'l' : 'p',
                        unit: 'mm',
                        format: [imgWidth, pageHeight]
                    });
                }

                const imgHeight = (canvas.height * imgWidth) / canvas.width;

                if (isContinuous) {
                    // Aplica a imagem inteira sem quebras numa folha sob medida
                    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, pageHeight);
                } else {
                    // Renderização multi-página clássica para formatos padrão
                    let heightLeft = imgHeight;
                    let position = 0;

                    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                    heightLeft -= pageHeight;

                    while (heightLeft >= 0) {
                        position = heightLeft - imgHeight;
                        pdf.addPage();
                        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                        heightLeft -= pageHeight;
                    }
                }

                // --- RESTAURAÇÃO DE SEGURANÇA IMEDIATA DA TELA ---
                if (tableResponsive) {
                    if (originalTableStyle !== null) {
                        tableResponsive.setAttribute('style', originalTableStyle);
                    } else {
                        tableResponsive.removeAttribute('style');
                    }
                    tableResponsive.scrollLeft = originalScrollLeft; // Devolve o scroll do usuário no ponto exato
                }
                if (originalElementStyle !== null) {
                    element.setAttribute('style', originalElementStyle);
                } else {
                    element.removeAttribute('style');
                }

                // Ocultar cabeçalho do PDF novamente na tela do HTML
                if (pdfHeader) pdfHeader.style.display = 'none';

                // Nome do arquivo de saída dinâmico condicional
                const inputNomePrincipal = document.getElementById('nome-veiculo-principal');
                const nomeVeiculo = inputNomePrincipal ? inputNomePrincipal.value.trim() : "";
                const sufixo = nomeVeiculo ? ` - ${nomeVeiculo}` : "";
                const nomeArquivo = `ITENS DE SÉRIE E OPCIONAIS${sufixo}`.replace(/[/\\?%*:|"<>]/g, '-');

                pdf.save(`${nomeArquivo}.pdf`);
                
                // Exibe aviso de conclusão integrada de arquivos
                showToast('PDF e JSON gerados e baixados com sucesso!');

                // Chamada simultânea e automatizada para exportar também o JSON do projeto!
                salvarComoJSON();

            }).catch(err => {
                console.error("Erro na geração do PDF: ", err);
                showToast('Erro interno ao tentar gerar o PDF.');
                
                // --- RESTAURAÇÃO DE SEGURANÇA EM CASO DE ERRO ---
                if (tableResponsive) {
                    if (originalTableStyle !== null) {
                        tableResponsive.setAttribute('style', originalTableStyle);
                    } else {
                        tableResponsive.removeAttribute('style');
                    }
                    tableResponsive.scrollLeft = originalScrollLeft;
                }
                if (originalElementStyle !== null) {
                    element.setAttribute('style', originalElementStyle);
                } else {
                    element.removeAttribute('style');
                }

                if (pdfHeader) pdfHeader.style.display = 'none';
            });
        }

        /* ==========================================================================
           12. UTILITÁRIO: ALERTA TIPO TOAST
           ========================================================================== */
        function showToast(message) {
            const toast = document.getElementById('toast');
            toast.innerText = message;
            toast.style.display = 'block';
            
            setTimeout(() => {
                toast.style.display = 'none';
            }, 3500);
        }

/* ==========================================================================
   13. FILTRAGEM DE NOMES DE VEÍCULOS E SINCRONIZAÇÃO COM PLANEJAMENTO
   ========================================================================== */
const LISTA_MARCAS_VEICULOS = [
    'ALFA ROMEO', 'ASTON MARTIN', 'AUDI', 'BMW', 'BYD', 'CAOA CHERY', 'CHERY',
    'CHEVROLET', 'CHRYSLER', 'CITROEN', 'CITROËN', 'DODGE', 'FERRARI', 'FIAT',
    'FORD', 'GEELY', 'GM', 'GWM', 'HONDA', 'HYUNDAI', 'IVECO', 'JAC', 'JAGUAR',
    'JEEP', 'KIA', 'LAND ROVER', 'LEXUS', 'LIFAN', 'MASERATI', 'MERCEDES-BENZ',
    'MERCEDES', 'BENZ', 'MINI', 'MITSUBISHI', 'NISSAN', 'PEUGEOT', 'PORSCHE',
    'RAM', 'RENAULT', 'SCANIA', 'SUBARU', 'SUZUKI', 'TOYOTA', 'TROLLER',
    'VOLKSWAGEN', 'VOLVO', 'VW'
];
const REGEX_MARCAS_VEICULOS = new RegExp('^(' + LISTA_MARCAS_VEICULOS.map(m => m.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')).join('|') + ')\\b', 'i');

function formatarPalavraModelo(str) {
    if (!str) return '';
    return str.split(/(\s+|-)/).map(part => {
        if (/^(\s+|-)$/.test(part)) return part;
        if (part.length <= 4 && !/[aeiouyáéíóúãõâêîôû]/i.test(part)) {
            return part.toUpperCase();
        }
        return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    }).join('');
}

function extrairMotorResumido(motorStr) {
    if (!motorStr || typeof motorStr !== 'string') return '';
    const texto = motorStr.trim();
    
    // 1. Procura padrão de cilindrada: ex 1.8, 2.0, 0.8, 12.8, 4.5 (aceita ponto ou vírgula)
    const matchDisp = texto.match(/\b(\d{1,2}[.,]\d)\b/);
    // 2. Procura válvulas: ex 8V, 12V, 16V, 20V, 24V, 32V, 40V, 48V (com ou sem espaço, maiúsculo/minúsculo)
    const matchValv = texto.match(/\b(\d{1,2})\s*[Vv]\b/);
    // 3. Procura cilindros em V ou W: ex V6, V8, V10, V12, W12, W16
    const matchCilV = texto.match(/\b(V[468]|V10|V12|W12|W16)\b/i);

    if (matchDisp) {
        const disp = matchDisp[1].replace(',', '.');
        if (matchValv) {
            return disp + ' ' + matchValv[1] + 'V';
        }
        if (matchCilV) {
            return disp + ' ' + matchCilV[1].toUpperCase();
        }
        return disp;
    }
    if (matchValv) {
        return matchValv[1] + 'V';
    }
    const matchEv = texto.match(/\b(EV|ELÉTRICO|ELETRICO|HÍBRIDO|HIBRIDO)\b/i);
    if (matchEv) {
        return matchEv[0].toUpperCase();
    }
    return '';
}

function filtrarNomeVeiculo(veiculoStr, anoFallback = '') {
    if (!veiculoStr || typeof veiculoStr !== 'string') return '';
    const str = veiculoStr.trim();
    if (!str) return '';

    // Extrai ano do próprio texto se existir
    let ano = '';
    const anoMatch = str.match(/\b(19\d\d|20\d\d)\b/);
    if (anoMatch) {
        ano = anoMatch[0];
    } else if (anoFallback) {
        const anoFbMatch = String(anoFallback).match(/\b(19\d\d|20\d\d)\b/);
        if (anoFbMatch) ano = anoFbMatch[0];
    } else {
        // Tenta obter ano do input de veículo do Planejamento no DOM se disponível
        const inputVeic = document.getElementById('veiculo');
        if (inputVeic && inputVeic.value) {
            const m = inputVeic.value.match(/\b(19\d\d|20\d\d)\b/);
            if (m) ano = m[0];
        } else if (typeof window !== 'undefined' && window.dadosPlanejamento && window.dadosPlanejamento.veiculo) {
            const m = window.dadosPlanejamento.veiculo.match(/\b(19\d\d|20\d\d)\b/);
            if (m) ano = m[0];
        }
    }

    // Caso o texto esteja no formato de catálogo com '>'
    // ex: CAR>2010>FIAT>DOBLÒ>1.8 16V E.TORQ...
    if (str.includes('>')) {
        const partes = str.split('>').map(p => p.trim()).filter(Boolean);
        if (partes.length >= 4) {
            let modeloBruto = '';
            let motorBruto = '';
            if (/^\d{4}$/.test(partes[1])) {
                ano = partes[1];
                modeloBruto = partes[3] || partes[2] || '';
                motorBruto = partes[4] || partes[3] || '';
            } else if (/^\d{4}$/.test(partes[0])) {
                ano = partes[0];
                modeloBruto = partes[2] || partes[1] || '';
                motorBruto = partes[3] || partes[2] || '';
            } else if (/^\d{4}$/.test(partes[partes.length - 1])) {
                ano = partes[partes.length - 1];
                modeloBruto = partes[2] || partes[1] || '';
                motorBruto = partes[3] || '';
            } else {
                modeloBruto = partes[2] || partes[1] || '';
                motorBruto = partes[3] || partes[partes.length - 1] || '';
            }
            const modelo = formatarPalavraModelo(modeloBruto);
            const motor = extrairMotorResumido(motorBruto);
            return [ano, modelo, motor].filter(Boolean).join(' ').trim();
        }
    }

    // Para textos livres (ex: "Fiat Doblò 1.8 16V E.torQ Flex 130/132cv...")
    const motor = extrairMotorResumido(str);
    let antesMotor = str;
    if (motor) {
        const idxDisp = str.search(/\b\d{1,2}[.,]\d\b/);
        if (idxDisp !== -1) {
            antesMotor = str.substring(0, idxDisp).trim();
        } else {
            const idxMotor = str.indexOf(motor);
            if (idxMotor !== -1) {
                antesMotor = str.substring(0, idxMotor).trim();
            }
        }
    }

    // Remove ano, prefixos de categorias (CAR, MOTO, etc) e pontuações
    let limpo = antesMotor
        .replace(/\b(19\d\d|20\d\d)\b/g, '')
        .replace(/^\s*(CAR|MOTO|CAMINHÃO|CAMINHAO)\s*>/i, '')
        .replace(/^\s*(CAR|MOTO|CAMINHÃO|CAMINHAO)\b/i, '')
        .trim();

    // Remove nome da montadora/marca no início
    limpo = limpo.replace(REGEX_MARCAS_VEICULOS, '').trim();
    limpo = limpo.replace(/^[\s>\-_/:]+/, '').replace(/[\s>\-_/:]+$/, '').trim();

    const modelo = formatarPalavraModelo(limpo);
    if (modelo || motor) {
        return [ano, modelo, motor].filter(Boolean).join(' ').trim();
    }

    return str;
}

function obterAppStateItens() {
    const inputNomePrincipal = document.getElementById('nome-veiculo-principal');
    if (inputNomePrincipal && inputNomePrincipal.value.trim() !== '') {
        appState.principal.nome = inputNomePrincipal.value.trim();
    }
    return appState;
}

function carregarAppStateItens(loadedState, anoFallback = null) {
    if (!loadedState || !loadedState.principal) return;
    
    if (Array.isArray(loadedState.itensCustom)) {
        loadedState.itensCustom = loadedState.itensCustom.map(item => {
            if (typeof item === 'string') {
                return { tipo: "simple", nome: item, obs: "", oculto: false, expandido: false };
            }
            if (!item.tipo) item.tipo = "simple";
            if (item.oculto === undefined) item.oculto = false;
            if (item.expandido === undefined) item.expandido = false;
            return item;
        });
    }

    if (loadedState.principal && loadedState.principal.valores) {
        for (let key in loadedState.principal.valores) {
            const val = loadedState.principal.valores[key];
            const isMultiplo = loadedState.itensCustom && loadedState.itensCustom.some(item => item.nome === key && item.tipo === 'multiple');
            if (isMultiplo && val && Array.isArray(val.detalhes)) {
                val.detalhes = val.detalhes.map(det => {
                    if (typeof det === 'string') return { opcao: det, status: 'S' };
                    return det;
                });
            }
        }
    }

    appState = loadedState;
    window.appState = appState;
    window.appStateItens = appState;

    // Busca ano de fallback caso o JSON não possua o ano embutido nos nomes
    let anoPrincipalFallback = anoFallback || '';
    if (!anoPrincipalFallback) {
        const inputVeicPlan = document.getElementById('veiculo');
        if (inputVeicPlan && inputVeicPlan.value) {
            const m = inputVeicPlan.value.match(/\b(19\d\d|20\d\d)\b/);
            if (m) anoPrincipalFallback = m[0];
        }
    }
    if (!anoPrincipalFallback && window.dadosPlanejamento && window.dadosPlanejamento.veiculo) {
        const m = window.dadosPlanejamento.veiculo.match(/\b(19\d\d|20\d\d)\b/);
        if (m) anoPrincipalFallback = m[0];
    }

    // Filtra o nome do Veículo Principal para o formato resumido (Ano + Modelo + Motor)
    if (appState.principal && appState.principal.nome) {
        appState.principal.nome = filtrarNomeVeiculo(appState.principal.nome, anoPrincipalFallback);
    }

    // Filtra o nome de cada Veículo Aplicável para o formato resumido (Ano + Modelo + Motor)
    if (Array.isArray(appState.aplicaveis)) {
        appState.aplicaveis.forEach((v, idx) => {
            if (v && v.nome) {
                let anoAplicavelFallback = anoPrincipalFallback;
                if (Array.isArray(window.veiculosAplicaveisData) && window.veiculosAplicaveisData[idx]) {
                    const dadosG = window.veiculosAplicaveisData[idx].dadosGerais;
                    if (dadosG && dadosG.veiculo) {
                        const m = dadosG.veiculo.match(/\b(19\d\d|20\d\d)\b/);
                        if (m) anoAplicavelFallback = m[0];
                    }
                }
                v.nome = filtrarNomeVeiculo(v.nome, anoAplicavelFallback);
            }
        });
    }

    if (Array.isArray(appState.aplicaveis) && appState.aplicaveis.length > 0) {
        nextVeiculoId = Math.max(...appState.aplicaveis.map(v => v.id || 0)) + 1;
    } else {
        nextVeiculoId = 1;
    }
    activeVeiculoIndex = 0;

    const inputNomePrincipal = document.getElementById('nome-veiculo-principal');
    if (inputNomePrincipal) {
        inputNomePrincipal.value = appState.principal.nome || '';
    }

    renderizarPainelPrincipal();
    renderizarVeiculosAplicaveis();
    atualizarResumoTab();
}

function sincronizarVeiculosDoPlanejamento(silencioso = false) {
    let alterou = false;

    // Salva o aplicável em edição no Planejamento se estiver aberto
    const vAtual = (typeof veiculoAplicavelAtual === 'number') ? veiculoAplicavelAtual : (typeof window !== 'undefined' ? window.veiculoAplicavelAtual : null);
    const fnSalvar = (typeof salvarDadosVeiculoAplicavel === 'function') ? salvarDadosVeiculoAplicavel : (typeof window !== 'undefined' ? window.salvarDadosVeiculoAplicavel : null);
    if (typeof fnSalvar === 'function' && typeof vAtual === 'number') {
        try { fnSalvar(vAtual); } catch(e) {}
    }

    // 1. Sincroniza Veículo Principal aplicando o filtro Ano + Modelo + Motor (ex: 2010 Doblò 1.8 16V)
    const inputVeiculoPlan = document.getElementById('veiculo');
    const inputNomePrincipal = document.getElementById('nome-veiculo-principal');
    let anoPrincipal = '';
    if (inputVeiculoPlan && inputVeiculoPlan.value.trim()) {
        const nomePlan = inputVeiculoPlan.value.trim();
        const nomeFiltrado = filtrarNomeVeiculo(nomePlan);
        const matchAno = nomePlan.match(/\b(19\d\d|20\d\d)\b/);
        if (matchAno) anoPrincipal = matchAno[0];

        if (inputNomePrincipal && appState.principal.nome !== nomeFiltrado) {
            inputNomePrincipal.value = nomeFiltrado;
            appState.principal.nome = nomeFiltrado;
            alterou = true;
        }
    }

    // 2. Sincroniza Veículos Aplicáveis do Planejamento
    const listaPlanejamento = (typeof veiculosAplicaveisData !== 'undefined' && Array.isArray(veiculosAplicaveisData))
        ? veiculosAplicaveisData
        : ((typeof window !== 'undefined' && Array.isArray(window.veiculosAplicaveisData)) ? window.veiculosAplicaveisData : []);

    if (listaPlanejamento.length > 0) {
        // Se o Planejamento tem menos veículos do que Itens, remove excedentes
        if (appState.aplicaveis.length > listaPlanejamento.length) {
            appState.aplicaveis.splice(listaPlanejamento.length);
            alterou = true;
        }

        listaPlanejamento.forEach((itemPlan, idx) => {
            let veicBruto = (itemPlan && itemPlan.dadosGerais && itemPlan.dadosGerais.veiculo)
                ? itemPlan.dadosGerais.veiculo.trim()
                : '';
            
            // Se o campo do objeto ainda estiver vazio, tenta ler o input se estiver no DOM
            if (!veicBruto) {
                const inpDom = document.getElementById(`veiculo_aplicaveis_${idx}`);
                if (inpDom && inpDom.value && inpDom.value.trim()) {
                    veicBruto = inpDom.value.trim();
                }
            }

            let nomeFinal = '';
            if (veicBruto) {
                nomeFinal = filtrarNomeVeiculo(veicBruto, anoPrincipal);
            } else {
                nomeFinal = (appState.aplicaveis[idx] && appState.aplicaveis[idx].nome && !appState.aplicaveis[idx].nome.startsWith('Veículo Aplicável'))
                    ? appState.aplicaveis[idx].nome
                    : `Veículo Aplicável #${idx + 1}`;
            }

            let aplicavelExistente = appState.aplicaveis[idx];
            if (!aplicavelExistente) {
                const novoId = nextVeiculoId++;
                const valoresIniciais = {};
                ITENS_FIXOS_DEFINICAO.forEach(item => {
                    valoresIniciais[item.id] = { status: "-", detalhes: [] };
                });
                appState.itensCustom.forEach(item => {
                    valoresIniciais[item.nome] = { status: "-", detalhes: [] };
                });
                appState.aplicaveis.push({
                    id: novoId,
                    nome: nomeFinal,
                    valores: valoresIniciais
                });
                alterou = true;
            } else if (aplicavelExistente.nome !== nomeFinal) {
                aplicavelExistente.nome = nomeFinal;
                alterou = true;
            }
        });
    }

    if (alterou) {
        renderizarVeiculosAplicaveis();
        atualizarResumoTab();
        if (!silencioso && typeof showToast === 'function') {
            showToast('Veículos sincronizados com o Planejamento!');
        }
    } else if (!silencioso && typeof showToast === 'function') {
        showToast('Veículos já sincronizados.');
    }
}

window.obterAppStateItens = obterAppStateItens;
window.carregarAppStateItens = carregarAppStateItens;
window.sincronizarVeiculosDoPlanejamento = sincronizarVeiculosDoPlanejamento;
window.inicializarModuloItens = inicializarModuloItens;
window.adicionarVeiculoAplicavelItens = adicionarVeiculoAplicavelItens;
window.carregarDeJSONItens = carregarDeJSONItens;
window.atualizarResumoTab = atualizarResumoTab;
window.switchTab = switchTab;
window.filtrarNomeVeiculo = filtrarNomeVeiculo;
