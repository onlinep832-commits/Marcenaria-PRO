// Função global para troca de abas do catálogo
function switchCatTab(tabId) {
    document.querySelectorAll(".cat-tab-btn").forEach(btn => btn.classList.toggle("active", btn.dataset.tab === tabId));
    document.querySelectorAll(".cat-tab-pane").forEach(pane => pane.classList.toggle("active", pane.id === tabId));
    // Sincroniza o tipo de material para MDF ao abrir a aba MDF
    const tipoSelect = document.getElementById("novoMaterialTipo");
    if (tipoSelect) {
        if (tabId === "cat-mdf") {
            tipoSelect.value = "mdf";
            tipoSelect.dispatchEvent(new Event("change"));
        }
    }
}

async function inicializarApp() {
    // --- ESTADO DA APLICAÇÃO ---
    let AppData = {};
    let projetoAtual = { modulos: [], ferragensExtras: [] };
    let listaPecasGerada = [];
    let listaFerragensGerada = [];
    let orcamentoFinalData = {};
    let imagemModuloUrl = null;
    let editingHardwareKey = null;
    let editingMaterialKey = null;
    let editingMaterialType = null;
    let editingProfileKey = null;
    let editingPecaKey = null;
    let editingModuleId = null;
    let currentImageUrl = { material: null, hardware: null, profile: null };
    let ultimoNomeCliente = "";
    let ultimoNomeAmbiente = "";

    // --- CHAVE DA API DE IMAGEM ---
    const IMG_API_KEY = "ce8ec3f885a1061c0b6078e34cb34cca";

    // --- FUNÇÕES UTILITÁRIAS ---
    const getEl = (id) => document.getElementById(id);

    const showToast = (message, type = "success") => {
        const toast = document.createElement("div");
        toast.className = `toast ${type}`;
        toast.textContent = message;
        getEl("toast-container").appendChild(toast);
        setTimeout(() => toast.classList.add("show"), 10);
        setTimeout(() => {
            toast.classList.remove("show");
            toast.addEventListener("transitionend", () => toast.remove());
        }, 4000);
    };

    const evaluateFormula = (expression) => {
        try {
            const formula = String(expression).trim();
            if (formula === "") return 0;
            const finalValue = new Function(`return ${formula}`)();
            if (!isFinite(finalValue) || isNaN(finalValue)) {
                console.warn(`Resultado inválido: '${finalValue}'. Fórmula original: "${expression}"`);
                return 0;
            }
            return finalValue;
        } catch (e) {
            console.error(`Erro ao avaliar a fórmula: "${expression}"`, e);
            return 0;
        }
    };

    const createKeyFromName = (name) =>
        name
            .toLowerCase()
            .replace(/\s+/g, "-")
            .replace(/[^\w-]/g, "");

    // --- FUNÇÃO DE UPLOAD DE IMAGEM ---
    const uploadImage = async (file) => {
        const formData = new FormData();
        formData.append("image", file);
        showToast("Enviando imagem...", "warning");

        try {
            const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMG_API_KEY}`, {
                method: "POST",
                body: formData,
            });
            const data = await response.json();
            if (data.success) {
                showToast("Imagem enviada com sucesso!", "success");
                return data.data.url;
            } else {
                throw new Error(data.error.message || "Erro desconhecido ao enviar.");
            }
        } catch (error) {
            console.error("Erro no Upload da Imagem:", error);
            showToast(`Erro no upload: ${error.message}`, "error");
            return null;
        }
    };

    // --- SELETORES DE ELEMENTOS COMUNS ---
    const pecasContainer = getEl("pecas-container");
    const displayModuloSelecionado = getEl("displayModuloSelecionado");
    const outputSection = getEl("output-section");
    const listaPecasTbody = getEl("lista-pecas").querySelector("tbody");
    const listaFerragensTbody = getEl("lista-ferragens").querySelector("tbody");
    const resumoContainer = getEl("resumo-projeto-container");
    const listaResumo = getEl("lista-resumo-projeto");

    // --- LÓGICA DE NAVEGAÇÃO ENTRE TELAS ---
    const navigateTo = (viewId) => {
        document.querySelectorAll(".app-view").forEach((view) => {
            view.style.display = "none";
        });
        const targetView = getEl(viewId);
        if (targetView) {
            targetView.style.display = "flex";
            window.scrollTo({ top: 0, behavior: "smooth" });
        }
    };

    // --- GERENCIAMENTO DE DADOS ---

    const saveAppState = () => {
        try {
            // Garante que o objeto AppData é limpo de referências complexas antes de salvar
            const cleanData = JSON.parse(JSON.stringify(AppData));
            localStorage.setItem("marcenaria_pro_AppData", JSON.stringify(cleanData));
            console.log("Estado da aplicação salvo no backup do navegador.");
        } catch (e) {
            console.error("Falha ao salvar o estado da aplicação:", e);
            showToast("Erro: Falha ao salvar o progresso no navegador.", "error");
        }
    };

    const salvarDados = () => {
        // Prepara os dados atuais para download
        const dadosParaDownload = AppData;
        
        // Formata como a variável global window.DADOS_DO_SISTEMA para o arquivo JS
        const dadosFormatados = "window.DADOS_DO_SISTEMA = " + JSON.stringify(dadosParaDownload, null, 4);
        
        const blob = new Blob([dadosFormatados], { type: "application/javascript" }); // Mudado para JS
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.style.display = "none";
        a.href = url;
        // Salva como .js para manter o padrão do arquivo externo
        a.download = `dados.json`; // Mantém nome json embora conteúdo seja JS válido, ou mude para dados.js
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast("Arquivo baixado! Substitua o arquivo 'dados.json' na pasta.", "success");
    };

    // --- FUNÇÃO DE CARREGAMENTO CORRIGIDA ---
    const carregarDados = async () => {
        const defaults = {
            catalogoModulos: [],
            coresMDF: {},
            coresBorda: {},
            catalogoFerragens: {},
            catalogoPerfis: {},
            pecasPredefinidas: {},
            configCalculo: {},
        };

        let dadosCarregados = null;

        // 1. TENTA CARREGAR DA VARIÁVEL GLOBAL (DO ARQUIVO EXTERNO dados.json)
        if (typeof window.DADOS_DO_SISTEMA !== 'undefined') {
            dadosCarregados = window.DADOS_DO_SISTEMA;
            console.log("Dados carregados via arquivo externo (window.DADOS_DO_SISTEMA).");
        }

        // 2. SE NÃO ACHOU, TENTA NO HTML EMBUTIDO (FALLBACK)
        if (!dadosCarregados) {
            const dadosEmbutidosEl = document.getElementById("dados-json");
            if (dadosEmbutidosEl) {
                try {
                    const dadosTexto = dadosEmbutidosEl.textContent.trim();
                    if (dadosTexto) {
                        dadosCarregados = JSON.parse(dadosTexto);
                        console.log("Dados carregados com sucesso do JSON embutido no HTML.");
                    }
                } catch (e) {
                    console.error("Erro ao parsear o JSON embutido.", e);
                }
            }
        }

        // 3. SE AINDA NÃO ACHOU, TENTA NO LOCALSTORAGE (FALLBACK)
        if (!dadosCarregados) {
            const dadosLocalStorage = localStorage.getItem("marcenaria_pro_AppData");
            if (dadosLocalStorage) {
                try {
                    dadosCarregados = JSON.parse(dadosLocalStorage);
                    console.log("Dados carregados do backup do navegador (LocalStorage).");
                    showToast("Carregando backup do navegador.", "warning");
                } catch (e) {
                    console.error("Backup do LocalStorage corrompido.", e);
                }
            }
        }

        AppData = { ...defaults, ...(dadosCarregados || {}) };
        
        // Garante a estrutura mínima
        if (AppData.catalogoModulos && Array.isArray(AppData.catalogoModulos)) {
            AppData.catalogoModulos.forEach((mod) => {
                if (!mod.pecas) mod.pecas = [];
            });
        }

        saveAppState(); // Atualiza o localStorage com o que foi carregado
        recalculateAllMdfPrices();
    };

    const recalculateAllMdfPrices = () => {
        if (!AppData.configCalculo || !AppData.coresMDF) return;
        const { chapaAltura, chapaLargura } = AppData.configCalculo;
        const areaChapa = (chapaAltura / 1000) * (chapaLargura / 1000);
        if (areaChapa > 0) {
            Object.keys(AppData.coresMDF).forEach((key) => {
                const material = AppData.coresMDF[key];
                if (material && material.precoChapa !== undefined) {
                    material.preco = material.precoChapa / areaChapa;
                }
            });
        }
    };

    const gerenciarCatalogoObjetos = (tipo, obj, containerId) => {
        const container = getEl(containerId);
        if (!container) return;
        container.innerHTML = "";

        if (!obj) {
            console.error(`Objeto de dados para '${tipo}' é nulo ou indefinido.`);
            return;
        }

        Object.keys(obj)
            .sort((a, b) => obj[a].nome.localeCompare(obj[b].nome))
            .forEach((key) => {
                const item = obj[key];
                const div = document.createElement("div");
                div.className = "catalogo-item catalogo-item-com-imagem";
                div.dataset.filterName = `${item.nome}`.toLowerCase();
                const placeholderImg = "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";

                let displayInfo = item.nome;
                if (item.preco !== undefined) {
                    let unit = "UN";
                    if (tipo === "coresMDF") unit = "m²";
                    else if (tipo === "coresBorda") unit = "m";
                    else if (tipo === "catalogoPerfis") unit = "m";
                    else if (item.unidade) unit = item.unidade;

                    displayInfo += ` (R$ ${item.preco.toFixed(2)} / ${unit})`;
                } else if (tipo === "pecasPredefinidas") {
                    displayInfo += ` (Qtd: ${item.qtd || "1"}, A: ${item.altura || "0"}, L: ${item.largura || "0"})`;
                }

                let buttonsHtml = `<div class="botoes-acao" style="margin-top:0; margin-left: auto; flex-wrap:nowrap;">`;
                if (tipo === "catalogoFerragens") {
                    buttonsHtml += `<button class="btn-warning btn-sm btn-edit-ferragem" data-key="${key}" data-type="${tipo}">Editar</button>`;
                } else if (tipo === "coresMDF" || tipo === "coresBorda") {
                    buttonsHtml += `<button class="btn-warning btn-sm btn-edit-material" data-key="${key}" data-type="${tipo}">Editar</button>`;
                } else if (tipo === "catalogoPerfis") {
                    buttonsHtml += `<button class="btn-warning btn-sm btn-edit-perfil" data-key="${key}" data-type="${tipo}">Editar</button>`;
                } else if (tipo === "pecasPredefinidas") {
                    buttonsHtml += `<button class="btn-warning btn-sm btn-edit-peca" data-key="${key}" data-type="${tipo}">Editar</button>`;
                }
                buttonsHtml += `<button class="btn-danger btn-sm btn-delete" data-key="${key}" data-type="${tipo}">X</button></div>`;

                div.innerHTML = `<img src="${item.imagem || placeholderImg}"><span>${displayInfo}</span>${buttonsHtml}`;
                container.appendChild(div);
            });
    };

    const popularSeletorObjetos = (seletorId, obj, placeholder, useKeyAsValue = true) => {
        const select = typeof seletorId === "string" ? getEl(seletorId) : seletorId;
        if (!select) return;
        select.innerHTML = `<option value="">-- ${placeholder} --</option>`;
        if (!obj) {
            console.error(`Objeto de dados para o seletor '${seletorId}' é nulo ou indefinido.`);
            return;
        }
        Object.keys(obj)
            .sort((a, b) => obj[a].nome.localeCompare(obj[b].nome))
            .forEach((key) => {
                const value = useKeyAsValue ? key : obj[key].nome;
                select.innerHTML += `<option value="${value}">${obj[key].nome}</option>`;
            });
    };

    const atualizarListaCategorias = () => {
        const select = getEl("categoriaModuloSelect");
        if (!select || !AppData.catalogoModulos) return;
        const categorias = [...new Set(AppData.catalogoModulos.map((m) => m.categoria).filter((c) => c))].sort();
        select.innerHTML = `<option value="">Sem Categoria</option>`;
        categorias.forEach((cat) => {
            select.innerHTML += `<option value="${cat}">${cat}</option>`;
        });
        select.innerHTML += `<option value="_add_new_">-- Adicionar Nova Categoria --</option>`;
    };

    const popularModalCatalogoCompleto = () => {
        const popularLista = (containerId, catalogo, unidade) => {
            const container = getEl(containerId);
            if (!container) return;
            container.innerHTML = "";
            const ul = document.createElement("ul");
            ul.className = "lista-catalogo-completo";

            if (!catalogo || Object.keys(catalogo).length === 0) {
                ul.innerHTML = "<li>Nenhum item cadastrado.</li>";
            } else {
                Object.keys(catalogo)
                    .sort((a, b) => catalogo[a].nome.localeCompare(catalogo[b].nome))
                    .forEach((key) => {
                        const item = catalogo[key];
                        const li = document.createElement("li");
                        let displayInfo = item.nome;
                        let preco = "";

                        if (item.preco !== undefined) {
                            preco = `<span class="preco">R$ ${item.preco.toFixed(2)} / ${item.unidade || unidade}</span>`;
                        } else if (item.qtd) {
                            preco = `<span class="preco">Qtd: ${item.qtd}, A:${item.altura}, L:${item.largura}</span>`;
                        }
                        li.innerHTML = `<span>${displayInfo}</span>${preco}`;
                        ul.appendChild(li);
                    });
            }
            container.appendChild(ul);
        };

        popularLista("lista-completa-mdf", AppData.coresMDF, "m²");
        popularLista("lista-completa-borda", AppData.coresBorda, "m");
        popularLista("lista-completa-perfis", AppData.catalogoPerfis, "m");
        popularLista("lista-completa-ferragens", AppData.catalogoFerragens, "");
        popularLista("lista-completa-pecas", AppData.pecasPredefinidas, "");
    };

    const popularTodosSeletores = () => {
        gerenciarCatalogoObjetos("coresMDF", AppData.coresMDF, "listaCoresMDF");
        gerenciarCatalogoObjetos("coresBorda", AppData.coresBorda, "listaCoresBorda");
        gerenciarCatalogoObjetos("catalogoFerragens", AppData.catalogoFerragens, "listaFerragensCatalogo");
        gerenciarCatalogoObjetos("pecasPredefinidas", AppData.pecasPredefinidas, "listaPecasPredefinidas");
        gerenciarCatalogoObjetos("catalogoPerfis", AppData.catalogoPerfis, "listaPerfisPuxador");

        popularSeletorObjetos("projCorInterna", AppData.coresMDF, "Selecione uma Cor");
        popularSeletorObjetos("projCorExterna", AppData.coresMDF, "Selecione uma Cor");
        popularSeletorObjetos("moduloCorBordaInterna", AppData.coresBorda, "Selecione uma Cor de Borda");
        popularSeletorObjetos("moduloCorBordaExterna", AppData.coresBorda, "Selecione uma Cor de Borda");
        popularSeletorObjetos("projCorBordaInterna", AppData.coresBorda, "-- Usar Padrão do Módulo --");
        popularSeletorObjetos("projCorBordaExterna", AppData.coresBorda, "-- Usar Padrão do Módulo --");
        popularSeletorObjetos("projPerfilAluminio", AppData.catalogoPerfis, "Selecione um Perfil");

        const ferragensUnidade = AppData.catalogoFerragens
            ? Object.keys(AppData.catalogoFerragens).reduce((acc, key) => {
                  if (AppData.catalogoFerragens[key].unidade === "UN" || AppData.catalogoFerragens[key].unidade === "PAR") {
                      acc[key] = AppData.catalogoFerragens[key];
                  }
                  return acc;
              }, {})
            : {};
        popularSeletorObjetos("puxadorExternoPadrao", ferragensUnidade, "Nenhum (Desativado)");

        const corredicasCatalogo = AppData.catalogoFerragens
            ? Object.keys(AppData.catalogoFerragens).reduce((acc, key) => {
                  if (AppData.catalogoFerragens[key].tipo === "corredica") {
                      acc[key] = AppData.catalogoFerragens[key];
                  }
                  return acc;
              }, {})
            : {};
        popularSeletorObjetos("moduloCorredicaSelect", corredicasCatalogo, "Escolha uma corrediça");
        popularSeletorObjetos("moduloFerragemSelect", AppData.catalogoFerragens, "Escolha uma ferragem");
        popularSeletorObjetos("ferragensExtrasSelect", AppData.catalogoFerragens, "Escolha do catálogo");
        popularSeletorObjetos("pecas-predefinidas", AppData.pecasPredefinidas, "Ou adicione uma peça pré-definida");

        atualizarListaCategorias();
    };

    const adicionarNovaPeca = (peca = {}) => {
        const clone = getEl("template-peca").content.cloneNode(true);
        const wrapper = clone.querySelector(".peca-item-wrapper");
        const item = wrapper.querySelector(".peca-item");
        const ferragemSelect = wrapper.querySelector(".peca-ferragem-select");
        const qtdInput = wrapper.querySelector(".peca-ferragem-qtd");
        const medidaInput = wrapper.querySelector(".peca-ferragem-medida");
        const addFerragemBtn = wrapper.querySelector(".btn-add-ferragem-assoc");
        const ferragensContainer = wrapper.querySelector(".ferragens-associadas-container");

        item.querySelector(".peca-nome").value = peca.nome || "";
        item.querySelector(".peca-qtd").value = peca.qtd || "1";
        item.querySelector(".peca-altura").value = peca.altura || "";
        item.querySelector(".peca-largura").value = peca.largura || "";
        item.querySelector(".peca-espessura").value = peca.espessura || "";
        item.querySelector(".peca-material-tipo").value = peca.tipoMaterial || "interna";
        item.querySelector(".peca-borda-tipo").value = peca.tipoBorda || "interna";
        item.querySelector(".peca-borda-a1").checked = peca.bordaA1 || false;
        item.querySelector(".peca-borda-a2").checked = peca.bordaA2 || false;
        item.querySelector(".peca-borda-l1").checked = peca.bordaL1 || false;
        item.querySelector(".peca-borda-l2").checked = peca.bordaL2 || false;
        item.querySelector(".btn-remover-peca").addEventListener("click", () => wrapper.remove());

        popularSeletorObjetos(ferragemSelect, AppData.catalogoFerragens, "Catálogo de Ferragens");

        ferragemSelect.addEventListener("change", () => {
            const selectedKey = ferragemSelect.value;
            const ferragem = AppData.catalogoFerragens[selectedKey];
            if (ferragem && ferragem.tipo === "corredica") {
                medidaInput.style.display = "block";
            } else {
                medidaInput.style.display = "none";
            }
        });

        const adicionarFerragemAssocUI = (ferragemAssoc) => {
            const ferragemData = AppData.catalogoFerragens[ferragemAssoc.key];
            if (!ferragemData) return;
            const div = getEl("template-ferragem-assoc").content.cloneNode(true).querySelector(".catalogo-item");
            div.dataset.key = ferragemAssoc.key;
            div.dataset.qtdFormula = ferragemAssoc.qtdFormula;
            div.dataset.medidaFormula = ferragemAssoc.medidaFormula || "";

            let displayText = `${ferragemData.nome} (Qtd: ${ferragemAssoc.qtdFormula}`;
            if (ferragemAssoc.medidaFormula) {
                displayText += `, Medida: ${ferragemAssoc.medidaFormula}`;
            }
            displayText += ")";

            div.querySelector("span").textContent = displayText;
            div.querySelector("button").onclick = () => div.remove();
            ferragensContainer.appendChild(div);
        };

        addFerragemBtn.addEventListener("click", () => {
            const key = ferragemSelect.value;
            const qtdFormula = qtdInput.value.trim();
            const medidaFormula = medidaInput.value.trim();
            const ferragem = AppData.catalogoFerragens[key];

            if (!key || !qtdFormula) return showToast("Selecione uma ferragem e digite a quantidade/fórmula.", "error");
            if (ferragem && ferragem.tipo === "corredica" && !medidaFormula) return showToast("Para corrediças, a fórmula de medida é obrigatória.", "error");

            adicionarFerragemAssocUI({ key, qtdFormula, medidaFormula });
            ferragemSelect.value = "";
            qtdInput.value = "";
            medidaInput.value = "";
            medidaInput.style.display = "none";
        });

        if (peca.ferragensAssociadas) {
            peca.ferragensAssociadas.forEach(adicionarFerragemAssocUI);
        }

        pecasContainer.appendChild(clone);
        atualizarTodosOsHelpersNoModal(getEl("moduloTipo").value);
    };

    const atualizarResumoProjeto = () => {
        if (projetoAtual.modulos.length === 0 && projetoAtual.ferragensExtras.length === 0) {
            resumoContainer.style.display = "none";
            return;
        }
        const placeholderImg = "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";
        resumoContainer.style.display = "block";
        listaResumo.innerHTML = "";

        // --- NOVA LÓGICA: AGRUPAMENTO DE MÓDULOS ---
        const gruposModulos = {};

        projetoAtual.modulos.forEach((modulo) => {
            // Cria uma chave única baseada nas características visuais e dimensionais
            const propsParaChave = [
                modulo.id,
                modulo.nome,
                modulo.tipoModulo,
                modulo.altura,
                modulo.largura,
                modulo.profundidade,
                modulo.ladoA,
                modulo.ladoB,
                modulo.profA,
                modulo.profB,
                modulo.corMaterialInterna,
                modulo.corMaterialExterna,
                modulo.corBordaInterna,
                modulo.corBordaExterna,
                modulo.tipoPuxador,
                modulo.isPecaAvulsa,
                modulo.espessura,
            ];
            const chave = JSON.stringify(propsParaChave);

            if (!gruposModulos[chave]) {
                gruposModulos[chave] = { ...modulo, qtdAgrupada: 0, ids: [] };
            }
            gruposModulos[chave].qtdAgrupada++;
            gruposModulos[chave].ids.push(modulo.instanceId);
        });

        // Renderiza a lista baseada nos GRUPOS
        Object.values(gruposModulos).forEach((grupo) => {
            const li = document.createElement("li");
            const corInternaNome = AppData.coresMDF[grupo.corMaterialInterna]?.nome || "N/A";
            const corExternaNome = AppData.coresMDF[grupo.corMaterialExterna]?.nome || "N/A";
            const bordaInternaDisplay = AppData.coresBorda[grupo.corBordaInterna]?.nome || "Padrão";
            const bordaExternaDisplay = AppData.coresBorda[grupo.corBordaExterna]?.nome || "Padrão";

            let tipoPuxadorTexto = "Puxador: Externo";
            if (grupo.tipoPuxador === "cava_horizontal") tipoPuxadorTexto = "Puxador: Cava Horizontal";
            if (grupo.tipoPuxador === "cava_vertical") tipoPuxadorTexto = "Puxador: Cava Vertical";
            if (grupo.tipoPuxador === "perfil_horizontal") tipoPuxadorTexto = "Puxador: Perfil Horizontal";
            if (grupo.tipoPuxador === "perfil_vertical") tipoPuxadorTexto = "Puxador: Perfil Vertical";

            const detalhesCores = `
                                    <div class="resumo-detalhes-cores">
                                        Material: <b>${corInternaNome}</b> (Int) / <b>${corExternaNome}</b> (Ext)<br>
                                        Bordas: <b>${bordaInternaDisplay}</b> (Int) / <b>${bordaExternaDisplay}</b> (Ext)<br>
                                        <b>${tipoPuxadorTexto}</b>
                                    </div>`;

            let dimensoesTexto = "";
            if (grupo.isPecaAvulsa) {
                dimensoesTexto = `(A:${grupo.altura} L:${grupo.largura} E:${grupo.espessura})`;
            } else if (grupo.tipoModulo === "reto") {
                dimensoesTexto = `(A:${grupo.altura} L:${grupo.largura} P:${grupo.profundidade})`;
            } else {
                dimensoesTexto = `(A:${grupo.altura} LadoA:${grupo.ladoA}...)`;
            }

            const img = grupo.imagem || placeholderImg;

            // HTML Atualizado com a "Bolinha" da quantidade
            li.innerHTML = `
                                    <div class="item-info">
                                         <div style="position: relative; margin-right: 12px;">
                                            <img src="${img}" alt="${grupo.nome}" style="margin-right: 0;">
                                            <span style="
                                                position: absolute; 
                                                top: -8px; left: -8px; 
                                                background: var(--cor-principal); 
                                                color: white; 
                                                font-weight: 800; 
                                                min-width: 24px; height: 24px;
                                                border-radius: 50%; 
                                                display: flex; align-items: center; justify-content: center;
                                                font-size: 0.75rem; 
                                                border: 2px solid white;
                                                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                                            ">${grupo.qtdAgrupada}</span>
                                         </div>
                                        <div>
                                            <span style="font-weight: 600;">
                                                <span style="color: var(--cor-principal); font-weight: 800;">${grupo.qtdAgrupada}x</span> 
                                                ${grupo.nome} <span class="dimensoes">${dimensoesTexto}</span>
                                            </span>
                                            ${detalhesCores}
                                        </div>
                                    </div>
                                    <!-- Botão remove todos os IDs desse grupo -->
                                    <button class="btn-danger btn-sm btn-remover-grupo" data-ids="${grupo.ids.join(",")}">Remover Todos</button>`;
            listaResumo.appendChild(li);
        });

        projetoAtual.ferragensExtras.forEach((ferragem) => {
            const li = document.createElement("li");
            const img = ferragem.imagem || placeholderImg;
            li.innerHTML = `
                                    <div class="item-info">
                                        <img src="${img}" alt="${ferragem.nome}">
                                        <span>${ferragem.valor}${ferragem.unidade} de ${ferragem.nome} (Extra)</span>
                                    </div>
                                    <button class="btn-danger btn-sm" data-instance-id="${ferragem.instanceId}">Remover</button>`;
            listaResumo.appendChild(li);
        });
    };

    const adicionarFerragemAoModuloUI = (ferragemItem) => {
        const key = ferragemItem.key,
            valor = ferragemItem.valor;
        const ferragem = AppData.catalogoFerragens[key];
        if (!ferragem) return;
        const container = getEl("ferragens-modulo-container");
        const div = getEl("template-ferragem-modulo").content.cloneNode(true).querySelector(".catalogo-item");
        div.dataset.key = key;
        div.dataset.valor = valor;
        div.querySelector("span").textContent = `${valor} ${ferragem.unidade} de ${ferragem.nome}`;
        div.querySelector("button").onclick = () => div.remove();
        container.appendChild(div);
    };

    const adicionarCorredicaAoModuloUI = (corredicaItem) => {
        const key = corredicaItem.key;
        const corredicaData = AppData.catalogoFerragens[key];
        if (!corredicaData) return;
        const container = getEl("corredicas-modulo-container");
        const div = getEl("template-corredica-modulo").content.cloneNode(true).querySelector(".catalogo-item");
        div.dataset.key = key;
        div.dataset.qtdFormula = corredicaItem.qtdFormula;
        div.dataset.medidaFormula = corredicaItem.medidaFormula;

        let displayText = `${corredicaData.nome} (Qtd: ${corredicaItem.qtdFormula}, Medida: ${corredicaItem.medidaFormula})`;

        div.querySelector("span").textContent = displayText;
        div.querySelector("button").onclick = () => div.remove();
        container.appendChild(div);
    };

    const resetModuleCreatorForm = () => {
        getEl("categoriaModuloSelect").value = "";
        getEl("novaCategoriaInput").value = "";
        getEl("novaCategoriaInput").style.display = "none";
        getEl("nomeModulo").value = "";
        getEl("moduloTipo").value = "reto";
        pecasContainer.innerHTML = "";
        getEl("ferragens-modulo-container").innerHTML = "";
        getEl("corredicas-modulo-container").innerHTML = "";
        getEl("moduloCorredicaSelect").value = "";
        getEl("moduloCorredicaQtd").value = "";
        getEl("moduloCorredicaMedida").value = "";

        getEl("imagemModuloPreview").src = "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";
        getEl("imagemModuloPreview").nextElementSibling.value = "";
        imagemModuloUrl = null;
        editingModuleId = null;
        getEl("modal-modulo-titulo").textContent = "Criar Novo Módulo";
        getEl("modal-modulo-descricao").textContent = "Crie ou edite modelos completos, definindo suas peças, fórmulas e as ferragens necessárias.";
        getEl("btnSalvarModulo").textContent = "Salvar Módulo";
        atualizarTodosOsHelpersNoModal("reto");
    };

    const carregarModuloParaEdicao = (moduloId) => {
        const modulo = AppData.catalogoModulos.find((m) => m.id === moduloId);
        if (!modulo) return;
        resetModuleCreatorForm();
        editingModuleId = moduloId;
        getEl("modal-modulo-titulo").textContent = "Editar Módulo";
        getEl("btnSalvarModulo").textContent = "Salvar Alterações";
        getEl("categoriaModuloSelect").value = modulo.categoria || "";
        getEl("nomeModulo").value = modulo.nome;
        getEl("moduloTipo").value = modulo.tipo || "reto";
        getEl("moduloCorBordaInterna").value = modulo.corBordaInterna;
        getEl("moduloCorBordaExterna").value = modulo.corBordaExterna;
        if (modulo.imagem) {
            getEl("imagemModuloPreview").src = modulo.imagem;
            imagemModuloUrl = modulo.imagem;
        }
        (modulo.pecas || []).forEach(adicionarNovaPeca);
        (modulo.ferragens || []).forEach(adicionarFerragemAoModuloUI);
        (modulo.corredicas || []).forEach((addCorredica) => adicionarCorredicaAoModuloUI(addCorredica));

        navigateTo("view-editor-modulo");
        atualizarTodosOsHelpersNoModal(getEl("moduloTipo").value);
    };

    const getModuleDataFromForm = () => {
        const view = getEl("view-editor-modulo");
        const nome = view.querySelector("#nomeModulo").value.trim();
        if (!nome) {
            showToast("Dê um nome ao módulo.", "error");
            return null;
        }

        let categoria = getEl("categoriaModuloSelect").value;
        const novaCategoria = getEl("novaCategoriaInput").value.trim();
        if (categoria === "_add_new_") {
            categoria = novaCategoria || "";
        }

        const pecas = Array.from(view.querySelectorAll("#pecas-container .peca-item-wrapper")).map((wrapper) => {
            const item = wrapper.querySelector(".peca-item");
            const ferragensAssociadas = Array.from(wrapper.querySelectorAll(".ferragens-associadas-container .catalogo-item")).map((ferragemEl) => ({
                key: ferragemEl.dataset.key,
                qtdFormula: ferragemEl.dataset.qtdFormula,
                medidaFormula: ferragemEl.dataset.medidaFormula,
            }));
            return {
                nome: item.querySelector(".peca-nome").value,
                qtd: item.querySelector(".peca-qtd").value,
                altura: item.querySelector(".peca-altura").value,
                largura: item.querySelector(".peca-largura").value,
                espessura: item.querySelector(".peca-espessura").value,
                tipoMaterial: item.querySelector(".peca-material-tipo").value,
                tipoBorda: item.querySelector(".peca-borda-tipo").value,
                bordaA1: item.querySelector(".peca-borda-a1").checked,
                bordaA2: item.querySelector(".peca-borda-a2").checked,
                bordaL1: item.querySelector(".peca-borda-l1").checked,
                bordaL2: item.querySelector(".peca-borda-l2").checked,
                ferragensAssociadas,
            };
        });

        const ferragensGerais = Array.from(view.querySelectorAll("#ferragens-modulo-container .catalogo-item")).map((item) => ({
            key: item.dataset.key,
            valor: parseFloat(item.dataset.valor),
        }));

        const corredicasModulo = Array.from(view.querySelectorAll("#corredicas-modulo-container .catalogo-item")).map((item) => ({
            key: item.dataset.key,
            qtdFormula: item.dataset.qtdFormula,
            medidaFormula: item.dataset.medidaFormula,
        }));

        if (pecas.length === 0) {
            showToast("Adicione pelo menos uma peça ao módulo.", "error");
            return null;
        }
        return {
            categoria,
            nome,
            imagem: imagemModuloUrl,
            pecas,
            ferragens: ferragensGerais,
            corredicas: corredicasModulo,
            corBordaInterna: view.querySelector("#moduloCorBordaInterna").value,
            corBordaExterna: view.querySelector("#moduloCorBordaExterna").value,
            tipo: getEl("moduloTipo").value,
        };
    };

    const salvarModulo = () => {
        const moduloData = getModuleDataFromForm();
        if (!moduloData) return;

        if (editingModuleId) {
            const index = AppData.catalogoModulos.findIndex((m) => m.id === editingModuleId);
            AppData.catalogoModulos[index] = { id: editingModuleId, ...moduloData };
            showToast(`Módulo "${moduloData.nome}" atualizado!`);
        } else {
            AppData.catalogoModulos.push({ id: Date.now(), ...moduloData });
            showToast(`Módulo "${moduloData.nome}" salvo!`);
        }

        saveAppState();
        atualizarListaCategorias();
        navigateTo("view-gerenciar-modulos");
        atualizarListaGerenciarModulos();
    };

    const popularGridSelecaoModulo = () => {
        const gridContainer = getEl("grid-selecao-modulos");
        gridContainer.innerHTML = "";
        const placeholderImg = "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";

        const createCard = (value, text, imgSrc, filterName) => {
            const card = document.createElement("div");
            card.className = "modulo-selecao-card";
            card.dataset.value = value;
            card.dataset.imgSrc = imgSrc || placeholderImg;
            card.dataset.filterName = filterName.toLowerCase();
            card.innerHTML = `<img src="${imgSrc || placeholderImg}" alt="${text}"><p>${text}</p>`;
            return card;
        };

        const createHeader = (text) => {
            const header = document.createElement("h3");
            header.className = "grid-category-header";
            header.textContent = text;
            return header;
        };

        gridContainer.appendChild(createHeader("Ações"));
        gridContainer.appendChild(createCard("_peca_avulsa_", "[Adicionar Peça Avulsa]", "", "peça avulsa"));

        const modulosAgrupados = (AppData.catalogoModulos || []).reduce((acc, mod) => {
            const categoria = mod.categoria || "Sem Categoria";
            if (!acc[categoria]) {
                acc[categoria] = [];
            }
            acc[categoria].push(mod);
            return acc;
        }, {});

        gridContainer.appendChild(createHeader("Módulos Completos"));
        Object.keys(modulosAgrupados)
            .sort()
            .forEach((categoria) => {
                if (categoria !== "Sem Categoria") {
                    gridContainer.appendChild(createHeader(categoria));
                }
                modulosAgrupados[categoria].forEach((m) => {
                    gridContainer.appendChild(createCard(m.id, m.nome, m.imagem, `${m.nome} ${m.categoria}`));
                });
            });
    };

    getEl("grid-selecao-modulos").addEventListener("click", (e) => {
        const card = e.target.closest(".modulo-selecao-card");
        if (!card) return;

        const value = card.dataset.value;
        const text = card.querySelector("p").textContent;
        const imgSrc = card.dataset.imgSrc;

        displayModuloSelecionado.dataset.value = value;
        displayModuloSelecionado.textContent = text;
        displayModuloSelecionado.style.color = "var(--cor-texto)";
        getEl("imagemModuloPreviewProjeto").src = imgSrc;

        const isPecaAvulsa = value === "_peca_avulsa_";
        getEl("labelProjAltura").textContent = isPecaAvulsa ? "Altura da Peça (mm)" : "Altura Final (A) em mm";
        getEl("labelProjLargura").textContent = isPecaAvulsa ? "Largura da Peça (mm)" : "Largura Final (L) em mm";
        getEl("labelProjProfundidade").textContent = isPecaAvulsa ? "Espessura da Peça (mm)" : "Profundidade Final (P) em mm";
        getEl("tipoModuloProjeto").style.display = isPecaAvulsa ? "none" : "block";
        getEl("labelTipoModuloProjeto").style.display = isPecaAvulsa ? "none" : "block";

        fecharModal("modal-selecionar-modulo");
    });

    const adicionarModuloAoProjeto = () => {
        const selectedValue = displayModuloSelecionado.dataset.value;
        const corMaterialInternaKey = getEl("projCorInterna").value;
        const corMaterialExternaKey = getEl("projCorExterna").value;
        const tipoPuxador = getEl("moduloTipoPuxador").value;
        const tipoModulo = getEl("tipoModuloProjeto").value;
        const quantidade = parseInt(getEl("quantidadeModuloProjeto").value, 10) || 1;

        if (!selectedValue) return showToast("Selecione um módulo ou peça.", "error");
        if (!corMaterialInternaKey || !corMaterialExternaKey) return showToast("Selecione as cores de material interna e externa.", "error");

        if (tipoPuxador.startsWith("perfil") && !getEl("projPerfilAluminio").value) {
            return showToast("Selecione um Perfil de Alumínio Padrão para o projeto.", "error");
        }

        let moduloBase;
        let dimensions = {};

        if (selectedValue === "_peca_avulsa_") {
            const A = parseFloat(getEl("projAltura").value) || 0;
            const L = parseFloat(getEl("projLargura").value) || 0;
            const E = parseFloat(getEl("projProfundidade").value) || 0;
            if (!A || !L || !E) return showToast("Preencha Altura, Largura e Espessura da peça avulsa.", "error");

            moduloBase = {
                nome: `Peça Avulsa`,
                isPecaAvulsa: true,
                pecas: [{ nome: "Peça", qtd: "1", altura: String(A), largura: String(L), tipoMaterial: "externa", tipoBorda: "externa" }],
                ferragens: [],
                corredicas: [],
            };
            dimensions = { altura: A, largura: L, profundidade: 0, espessura: E };
        } else {
            moduloBase = AppData.catalogoModulos.find((m) => m.id == parseInt(selectedValue));
            if (tipoModulo === "reto") {
                const A = parseFloat(getEl("projAltura").value) || 0;
                const L = parseFloat(getEl("projLargura").value) || 0;
                const P = parseFloat(getEl("projProfundidade").value) || 0;
                if (!A || !L || !P) return showToast("Preencha as dimensões do módulo reto (A, L, P).", "error");
                dimensions = { altura: A, largura: L, profundidade: P };
            } else {
                const A = parseFloat(getEl("projAlturaCanto").value) || 0,
                    LadoA = parseFloat(getEl("projLadoA").value) || 0,
                    LadoB = parseFloat(getEl("projLadoB").value) || 0,
                    ProfA = parseFloat(getEl("projProfA").value) || 0,
                    ProfB = parseFloat(getEl("projProfB").value) || 0;
                if (!A || !LadoA || !LadoB || !ProfA || !ProfB) return showToast("Preencha todas as dimensões do módulo de canto.", "error");
                dimensions = { altura: A, ladoA: LadoA, ladoB: LadoB, profA: ProfA, profB: ProfB };
            }
        }

        if (moduloBase) {
            const config = AppData.configCalculo;
            for (let i = 0; i < quantidade; i++) {
                const moduloNoProjeto = {
                    ...moduloBase,
                    ...dimensions,
                    instanceId: "inst_mod_" + Date.now() + "_" + i,
                    corMaterialInterna: corMaterialInternaKey,
                    corMaterialExterna: corMaterialExternaKey,
                    corBordaInterna: getEl("projCorBordaInterna").value,
                    corBordaExterna: getEl("projCorBordaExterna").value,
                    tipoPuxador: tipoPuxador,
                    tipoModulo: tipoModulo,
                    descAlturaBaseGav: config.descAlturaBaseGav,
                    descAlturaLateralGav: config.descAlturaLateralGav,
                    folgaCorredicaFrente: config.folgaCorredicaFrente,
                    folgaCorredicaFundo: config.folgaCorredicaFundo,
                    folgaGaveta: config.folgaGaveta,
                };
                projetoAtual.modulos.push(moduloNoProjeto);
            }

            showToast(`${quantidade} x "${moduloBase.nome}" adicionado(s) ao projeto.`);
            atualizarResumoProjeto();

            displayModuloSelecionado.dataset.value = "";
            displayModuloSelecionado.textContent = "-- Selecione um item --";
            displayModuloSelecionado.style.color = "var(--cor-texto-claro)";
            getEl("imagemModuloPreviewProjeto").src = "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";
            getEl("moduloTipoPuxador").value = "externo";
            getEl("quantidadeModuloProjeto").value = "1";
        }
    };

    const adicionarFerragemExtra = () => {
        const select = getEl("ferragensExtrasSelect"),
            valorInput = getEl("ferragemExtraValor");
        const key = select.value,
            valor = parseFloat(valorInput.value);
        if (!key || !valor || valor <= 0) return showToast("Selecione uma ferragem e um valor válido.", "error");
        const ferragemData = AppData.catalogoFerragens[key];
        projetoAtual.ferragensExtras.push({ ...ferragemData, valor, instanceId: "inst_fer_" + Date.now() });
        showToast(`Ferragem "${ferragemData.nome}" adicionada.`);
        select.value = "";
        valorInput.value = "";
        atualizarResumoProjeto();
    };

    const removerItemDoProjeto = (instanceId) => {
        projetoAtual.modulos = projetoAtual.modulos.filter((m) => m.instanceId !== instanceId);
        projetoAtual.ferragensExtras = projetoAtual.ferragensExtras.filter((f) => f.instanceId !== instanceId);
        showToast("Item removido do projeto.");
        atualizarResumoProjeto();
    };

    const carregarConfiguracoesParaInputs = () => {
        if (!AppData.configCalculo) return;
        Object.keys(AppData.configCalculo).forEach((key) => {
            const el = getEl(key);
            if (el) el.value = AppData.configCalculo[key];
        });
    };

    const salvarConfiguracoesDosInputs = () => {
        if (!AppData.configCalculo) return;
        Object.keys(AppData.configCalculo).forEach((key) => {
            const el = getEl(key);
            if (el) {
                if (el.type === "number") {
                    AppData.configCalculo[key] = parseFloat(el.value) || 0;
                } else {
                    AppData.configCalculo[key] = el.value;
                }
            }
        });
        recalculateAllMdfPrices();
        saveAppState();
        showToast("Configurações salvas! Lembre-se de salvar os dados para tornar permanente.", "success");
    };

    const formatarNumero = (num) => (num % 1 === 0 ? num : num.toFixed(1));

    const gerarListagem = () => {
        if (projetoAtual.modulos.length === 0 && projetoAtual.ferragensExtras.length === 0) return showToast("Adicione ao menos um item ao projeto.", "error");
        ultimoNomeCliente = getEl("nomeCliente").value;
        ultimoNomeAmbiente = getEl("nomeAmbiente").value;
        const config = AppData.configCalculo;
        listaPecasGerada = [];
        listaFerragensGerada = [];
        const perfilPadraoKey = getEl("projPerfilAluminio").value;
        let totalPuxadoresExternos = 0;

        const medidasCorredicasPadrao = (config.medidasCorredicas || "")
            .split(",")
            .map((m) => parseInt(m.trim()))
            .filter((m) => !isNaN(m))
            .sort((a, b) => a - b);

        const findCorredicaIdeal = (tamanho) => {
            if (medidasCorredicasPadrao.length === 0) return null;
            const idealSize = medidasCorredicasPadrao
                .slice()
                .reverse()
                .find((s) => s <= tamanho);
            return idealSize || medidasCorredicasPadrao[0];
        };

        projetoAtual.modulos.forEach((modulo) => {
            let ajustePuxadorAltura = 0,
                ajustePuxadorLargura = 0,
                descontoPerfilAltura = 0,
                descontoPerfilLargura = 0;

            if (modulo.tipoPuxador === "cava_horizontal") ajustePuxadorAltura = config.acrescimoPuxadorCava;
            else if (modulo.tipoPuxador === "cava_vertical") ajustePuxadorLargura = config.acrescimoPuxadorCava;
            else if (modulo.tipoPuxador === "perfil_horizontal") descontoPerfilAltura = config.descontoPerfilAltura;
            else if (modulo.tipoPuxador === "perfil_vertical") descontoPerfilLargura = config.descontoPerfilLargura;

            const { altura: modA = 0, largura: modL = 0, profundidade: modP = 0, ladoA: modLadoA = 0, ladoB: modLadoB = 0, profA: modProfA = 0, profB: modProfB = 0 } = modulo;
            const pecasDoModulo = [];
            let numFrentesGaveta = 0;
            let medidaCorredicaParaModulo = 0;

            if (modulo.corredicas && modulo.corredicas.length > 0) {
                const corredicaBase = modulo.corredicas[0];

                (modulo.pecas || []).forEach((peca) => {
                    const formulaQtd = String(peca.qtd || "1");
                    if (peca.nome.toLowerCase().includes("frente de gaveta")) {
                        numFrentesGaveta += Math.ceil(evaluateFormula(formulaQtd.replace(/\bA\b/g, modA).replace(/\bL\b/g, modL).replace(/\bP\b/g, modP)));
                    }
                });

                const corredicaFormulaReplacerParaMedida = (f) =>
                    f
                        ? String(f)
                              .replace(/\bA\b/g, modA)
                              .replace(/\bL\b/g, modL)
                              .replace(/\bP\b/g, modP)
                              .replace(/\bNumGavetas\b/g, numFrentesGaveta)
                              .replace(/\bEspInterna\b/g, config.espInterna)
                              .replace(/\bEspExterna\b/g, config.espExterna)
                              .replace(/\bDescFundoArmario\b/g, config.descFundoArmario)
                              .replace(/\bFolgaCorredicaFrente\b/g, modulo.folgaCorredicaFrente)
                              .replace(/\bFolgaCorredicaFundo\b/g, modulo.folgaCorredicaFundo)
                        : "0";

                const medidaAlvo = evaluateFormula(corredicaFormulaReplacerParaMedida(corredicaBase.medidaFormula));
                medidaCorredicaParaModulo = findCorredicaIdeal(medidaAlvo);
            }

            (modulo.pecas || []).forEach((peca) => {
                const formulaReplacer = (f) =>
                    f
                        ? String(f)
                              .replace(/\bA\b/g, modA)
                              .replace(/\bL\b/g, modL)
                              .replace(/\bP\b/g, modP)
                              .replace(/\bLadoA\b/g, modLadoA)
                              .replace(/\bLadoB\b/g, modLadoB)
                              .replace(/\bProfA\b/g, modProfA)
                              .replace(/\bProfB\b/g, modProfB)
                              .replace(/\bMedidaCorredica\b/g, medidaCorredicaParaModulo)
                              .replace(/\bEspInterna\b/g, config.espInterna)
                              .replace(/\bEspExterna\b/g, config.espExterna)
                              .replace(/\bDescFundoArmario\b/g, config.descFundoArmario)
                              .replace(/\bFolgaPortaAltura\b/g, config.folgaPortaAltura)
                              .replace(/\bFolgaPortaLargura\b/g, config.folgaPortaLargura)
                              .replace(/\bFolgaGaveta\b/g, config.folgaGaveta)
                              .replace(/\bFolgaCorredicaFrente\b/g, modulo.folgaCorredicaFrente)
                              .replace(/\bFolgaCorredicaFundo\b/g, modulo.folgaCorredicaFundo)
                              .replace(/\bAjustePuxadorAltura\b/g, ajustePuxadorAltura)
                              .replace(/\bAjustePuxadorLargura\b/g, ajustePuxadorLargura)
                              .replace(/\bDescontoPerfilAltura\b/g, descontoPerfilAltura)
                              .replace(/\bDescontoPerfilLargura\b/g, descontoPerfilLargura)
                              .replace(/\bDescAlturaBaseGav\b/g, modulo.descAlturaBaseGav)
                              .replace(/\bDescAlturaLateralGav\b/g, modulo.descAlturaLateralGav)
                        : "0";

                try {
                    const alturaFinal = evaluateFormula(formulaReplacer(peca.altura));
                    const larguraFinal = evaluateFormula(formulaReplacer(peca.largura));
                    const qtdFinal = Math.ceil(evaluateFormula(formulaReplacer(peca.qtd)));

                    let espessuraFinal, corMaterialKey;
                    const espessuraCustomFormula = peca.espessura || "";
                    if (espessuraCustomFormula) {
                        espessuraFinal = evaluateFormula(formulaReplacer(espessuraCustomFormula));
                    }
                    if (!espessuraFinal || espessuraFinal <= 0) {
                        if (modulo.isPecaAvulsa) {
                            espessuraFinal = modulo.espessura;
                        } else if (peca.tipoMaterial === "externa") {
                            espessuraFinal = config.espExterna;
                        } else if (peca.tipoMaterial === "fundo") {
                            espessuraFinal = config.espFundo;
                        } else {
                            espessuraFinal = config.espInterna;
                        }
                    }

                    if (modulo.isPecaAvulsa) {
                        corMaterialKey = modulo.corMaterialExterna;
                    } else if (peca.tipoMaterial === "externa") {
                        corMaterialKey = modulo.corMaterialExterna;
                    } else if (peca.tipoMaterial === "fundo") {
                        corMaterialKey = modulo.corMaterialInterna;
                    } else {
                        corMaterialKey = modulo.corMaterialInterna;
                    }

                    const corBordaPrioridade = peca.tipoBorda === "externa" ? modulo.corBordaExterna : modulo.corBordaInterna;
                    const corBordaModulo = peca.tipoBorda === "externa" ? modulo.corBordaExternaModulo : modulo.corBordaInternaModulo;
                    const corMaterialComoBorda = peca.tipoBorda === "externa" ? modulo.corMaterialExterna : modulo.corMaterialInterna;
                    const corBordaKey = corBordaPrioridade || corBordaModulo || corMaterialComoBorda;

                    pecasDoModulo.push({
                        ...peca,
                        qtd: qtdFinal,
                        alturaFinal,
                        larguraFinal,
                        espessura: espessuraFinal,
                        id: `peca_${Date.now()}_${Math.random()}`,
                        corMaterial: corMaterialKey,
                        corBorda: corBordaKey,
                        moduloInstanceId: modulo.instanceId,
                    });
                    const isDoorOrFront = peca.nome.toLowerCase().includes("porta") || peca.nome.toLowerCase().includes("frente");

                    if (modulo.tipoPuxador.startsWith("perfil") && perfilPadraoKey && isDoorOrFront) {
                        const perfilData = AppData.catalogoPerfis[perfilPadraoKey];
                        if (perfilData) {
                            const valor = modulo.tipoPuxador === "perfil_horizontal" ? larguraFinal / 1000 : alturaFinal / 1000;
                            listaFerragensGerada.push({
                                ...perfilData,
                                nome: perfilData.nome,
                                valor: valor * qtdFinal,
                                unidade: "M",
                                id: `perfil_auto_${Date.now()}_${Math.random()}`,
                                moduloInstanceId: modulo.instanceId,
                                source: "automatica",
                            });
                        }
                    } else if (modulo.tipoPuxador === "externo" && isDoorOrFront) {
                        totalPuxadoresExternos += qtdFinal;
                    }

                    (peca.ferragensAssociadas || []).forEach((ferragemAssoc) => {
                        const ferragemData = AppData.catalogoFerragens[ferragemAssoc.key];
                        if (!ferragemData) return;
                        const pecaFormulaReplacer = (f) =>
                            f
                                ? String(f)
                                      .replace(/\bA\b/g, alturaFinal)
                                      .replace(/\bL\b/g, larguraFinal)
                                      .replace(/\bQTD\b/g, qtdFinal)
                                      .replace(/\bP\b/g, modP)
                                      .replace(/\bMedidaCorredica\b/g, medidaCorredicaParaModulo)
                                      .replace(/\bFolgaCorredicaFrente\b/g, modulo.folgaCorredicaFrente)
                                      .replace(/\bFolgaCorredicaFundo\b/g, modulo.folgaCorredicaFundo)
                                      .replace(/\bDescAlturaBaseGav\b/g, modulo.descAlturaBaseGav)
                                      .replace(/\bDescAlturaLateralGav\b/g, modulo.descAlturaLateralGav)
                                : "0";
                        const qtdFerragemFinal = evaluateFormula(pecaFormulaReplacer(ferragemAssoc.qtdFormula));

                        if (qtdFerragemFinal > 0) {
                            if (ferragemData.tipo === "corredica" && ferragemAssoc.medidaFormula) {
                                const medidaAlvo = evaluateFormula(pecaFormulaReplacer(ferragemAssoc.medidaFormula));
                                const medidaIdeal = findCorredicaIdeal(medidaAlvo);
                                if (medidaIdeal) {
                                    const keyCorredicaIdeal = Object.keys(AppData.catalogoFerragens).find(
                                        (k) => AppData.catalogoFerragens[k].tipo === "corredica" && AppData.catalogoFerragens[k].nome.includes(String(medidaIdeal))
                                    );
                                    listaFerragensGerada.push({
                                        ...(keyCorredicaIdeal ? AppData.catalogoFerragens[keyCorredicaIdeal] : { ...ferragemData, nome: `${ferragemData.nome} (${medidaIdeal}mm)` }),
                                        valor: qtdFerragemFinal,
                                        id: `fer_assoc_${Date.now()}_${Math.random()}`,
                                        moduloInstanceId: modulo.instanceId,
                                        source: "associada_peca",
                                    });
                                }
                            } else {
                                listaFerragensGerada.push({ ...ferragemData, valor: qtdFerragemFinal, id: `fer_assoc_${Date.now()}_${Math.random()}`, moduloInstanceId: modulo.instanceId, source: "associada_peca" });
                            }
                        }
                    });
                } catch (e) {
                    console.error(`Erro na peça '${peca.nome}':`, e);
                }
            });
            listaPecasGerada.push({
                tipo: "header",
                nome: modulo.nome,
                A: modulo.altura,
                L: modulo.largura,
                P: modulo.profundidade,
                LadoA: modulo.ladoA,
                LadoB: modulo.ladoB,
                ProfA: modulo.profA,
                ProfB: modulo.profB,
                tipoModulo: modulo.tipoModulo,
                imagem: modulo.imagem,
                instanceId: modulo.instanceId,
                isPecaAvulsa: modulo.isPecaAvulsa,
                espessura: modulo.espessura,
            });
            listaPecasGerada.push(...pecasDoModulo);

            (modulo.ferragens || []).forEach((f) => {
                if (AppData.catalogoFerragens[f.key])
                    listaFerragensGerada.push({ ...AppData.catalogoFerragens[f.key], valor: f.valor, id: `fer_mod_${Date.now()}_${Math.random()}`, moduloInstanceId: modulo.instanceId, source: "geral_modulo" });
            });

            if (modulo.corredicas && modulo.corredicas.length > 0 && medidaCorredicaParaModulo > 0) {
                const corredicaBase = modulo.corredicas[0];
                const keyCorredicaIdeal = Object.keys(AppData.catalogoFerragens).find((k) => AppData.catalogoFerragens[k].tipo === "corredica" && AppData.catalogoFerragens[k].nome.includes(String(medidaCorredicaParaModulo)));

                if (keyCorredicaIdeal) {
                    listaFerragensGerada.push({
                        ...AppData.catalogoFerragens[keyCorredicaIdeal],
                        valor:
                            numFrentesGaveta *
                            (corredicaBase.qtdFormula.toLowerCase().includes("numgavetas")
                                ? 1
                                : evaluateFormula(
                                      String(corredicaBase.qtdFormula)
                                          .replace(/\bA\b/g, modA)
                                          .replace(/\bL\b/g, modL)
                                          .replace(/\bP\b/g, modP)
                                          .replace(/\bNumGavetas\b/g, 1)
                                  )),
                        id: `corredica_mod_${Date.now()}_${Math.random()}`,
                        moduloInstanceId: modulo.instanceId,
                        source: "modulo_corredica",
                    });
                } else {
                    listaFerragensGerada.push({
                        ...AppData.catalogoFerragens[corredicaBase.key],
                        nome: `${AppData.catalogoFerragens[corredicaBase.key].nome} (${medidaCorredicaParaModulo}mm)`,
                        valor:
                            numFrentesGaveta *
                            (corredicaBase.qtdFormula.toLowerCase().includes("numgavetas")
                                ? 1
                                : evaluateFormula(
                                      String(corredicaBase.qtdFormula)
                                          .replace(/\bA\b/g, modA)
                                          .replace(/\bL\b/g, modL)
                                          .replace(/\bP\b/g, modP)
                                          .replace(/\bNumGavetas\b/g, 1)
                                  )),
                        id: `corredica_mod_${Date.now()}_${Math.random()}`,
                        moduloInstanceId: modulo.instanceId,
                        source: "modulo_corredica_fallback",
                    });
                }
            }
        });

        if (config.puxadorExternoPadrao && AppData.catalogoFerragens[config.puxadorExternoPadrao] && totalPuxadoresExternos > 0) {
            listaFerragensGerada.push({ ...AppData.catalogoFerragens[config.puxadorExternoPadrao], valor: totalPuxadoresExternos, id: `puxador_auto_${Date.now()}`, source: "automatica" });
        }

        projetoAtual.ferragensExtras.forEach((f) => listaFerragensGerada.push({ ...f, id: f.instanceId, source: "extra" }));
        renderizarTabelasEOrcamento();
        outputSection.style.display = "block";
        outputSection.scrollIntoView({ behavior: "smooth" });
        getEl("nomeCliente").value = ultimoNomeCliente;
        getEl("nomeAmbiente").value = ultimoNomeAmbiente;
    };

    const recalcularOrcamentoTotal = () => {
        const config = AppData.configCalculo;

        const custoMaterial = orcamentoFinalData.custoTotalMaterial || 0;
        const lucroMaterialValor = custoMaterial * (config.margemLucroMaterial / 100);
        const totalFinal = custoMaterial + lucroMaterialValor;

        getEl("orcamento-custo-total-material").textContent = `R$ ${custoMaterial.toFixed(2)}`;
        getEl("orcamento-lucro-material").textContent = `R$ ${lucroMaterialValor.toFixed(2)}`;
        getEl("orcamento-total").textContent = `TOTAL GERAL: R$ ${totalFinal.toFixed(2)}`;
    };

    const getShoppingListData = () => {
        const config = AppData.configCalculo;
        const areaChapa = (config.chapaAltura / 1000) * (config.chapaLargura / 1000);
        const metragemPorMaterial = {};
        const metragemPorBorda = {};

        listaPecasGerada.forEach((item) => {
            if (item.tipo !== "header") {
                const { qtd, alturaFinal, larguraFinal, espessura, corMaterial, corBorda, bordaA1, bordaA2, bordaL1, bordaL2 } = item;
                const quantity = parseInt(qtd || 1);
                const corMaterialData = AppData.coresMDF[corMaterial];
                const corBordaData = AppData.coresBorda[corBorda];

                const corMaterialNome = corMaterialData ? corMaterialData.nome : "Material Desconhecido";
                const corBordaNome = corBordaData ? corBordaData.nome : "Borda Desconhecida";

                const areaPecaM2 = (alturaFinal / 1000) * (larguraFinal / 1000) * quantity;
                if (areaPecaM2 > 0) {
                    const materialKey = `${corMaterialNome} ${espessura}mm`;
                    metragemPorMaterial[materialKey] = (metragemPorMaterial[materialKey] || 0) + areaPecaM2;
                }

                let comprimentoBordaMM = [bordaA1, bordaA2].filter(Boolean).length * alturaFinal + [bordaL1, bordaL2].filter(Boolean).length * larguraFinal;
                const metragemPecaBordaM = (comprimentoBordaMM / 1000) * quantity;
                if (metragemPecaBordaM > 0) {
                    metragemPorBorda[corBordaNome] = (metragemPorBorda[corBordaNome] || 0) + metragemPecaBordaM;
                }
            }
        });

        const ferragensAgrupadas = {};
        listaFerragensGerada.forEach((f) => {
            if (f && f.nome && f.unidade) {
                const key = `${f.nome}_${f.unidade}_${f.tipo}`;
                if (!ferragensAgrupadas[key]) {
                    ferragensAgrupadas[key] = { nome: f.nome, unidade: f.unidade, preco: f.preco || 0, tipo: f.tipo || "geral", valor: 0 };
                }
                ferragensAgrupadas[key].valor += f.valor;
            }
        });

        const groups = [];

        const mdfItems = Object.keys(metragemPorMaterial).map((key) => {
            const m2 = metragemPorMaterial[key];
            let textoChapas = "";
            if (areaChapa > 0) {
                const numChapas = Math.ceil(m2 / areaChapa);
                textoChapas = ` (${numChapas} chapa${numChapas > 1 ? "s" : ""})`;
            }
            return { name: `Chapa ${key}`, quantity: `${m2.toFixed(2)} m²${textoChapas}` };
        });
        if (mdfItems.length > 0) groups.push({ title: "== CHAPAS DE MDF ==", items: mdfItems });

        const bordaItems = Object.keys(metragemPorBorda).map((cor) => ({ name: `Fita de Borda ${cor}`, quantity: `${Math.ceil(metragemPorBorda[cor])} metros` }));
        if (bordaItems.length > 0) groups.push({ title: "== FITAS DE BORDA ==", items: bordaItems });

        const ferragemItems = [];
        const perfilItems = [];
        Object.values(ferragensAgrupadas).forEach((fAggregated) => {
            if (fAggregated.valor > 0) {
                let itemDisplayName = fAggregated.nome;
                let itemDisplayQuantity = `${Math.ceil(fAggregated.valor)} ${fAggregated.unidade}`;

                if (fAggregated.tipo === "corredica") {
                    const match = fAggregated.nome.match(/(\d+)mm/);
                    if (match && match[1]) {
                        itemDisplayName = fAggregated.nome.replace(/\s?\d+mm$/, "").trim() + ` ${parseInt(match[1]) / 10}cm`;
                    }
                }

                if (fAggregated.unidade === "M" && (itemDisplayName.toLowerCase().includes("puxador") || itemDisplayName.toLowerCase().includes("perfil"))) {
                    const totalM = fAggregated.valor;
                    const numBarras = Math.ceil(totalM / config.barraPerfilComprimento);
                    const textoBarras = `(${numBarras} barra${numBarras > 1 ? "s" : ""} de ${config.barraPerfilComprimento.toFixed(2)}m)`;
                    perfilItems.push({ name: itemDisplayName, quantity: `${totalM.toFixed(2)} metros ${textoBarras}` });
                } else {
                    ferragemItems.push({ name: itemDisplayName, quantity: itemDisplayQuantity });
                }
            }
        });

        if (perfilItems.length > 0) groups.push({ title: "== PERFIS ==", items: perfilItems });
        if (ferragemItems.length > 0) groups.push({ title: "== FERRAGENS ==", items: ferragemItems });

        return groups;
    };

    const renderizarTabelasEOrcamento = () => {
        const config = AppData.configCalculo;
        const itensOrcamento = {};

        // 1. Cálculos de Custos (Mantém a lógica original para garantir precisão no orçamento)
        projetoAtual.modulos.forEach((mod) => {
            itensOrcamento[mod.instanceId] = {
                nome: mod.nome,
                dimensoes: mod.isPecaAvulsa
                    ? `(A:${mod.altura} L:${mod.largura} E:${mod.espessura})`
                    : mod.tipoModulo === "reto"
                    ? `(A:${mod.altura} L:${mod.largura} P:${mod.profundidade})`
                    : `(A:${mod.altura} LadoA:${mod.ladoA} LadoB:${mod.ladoB}...)`,
                custoMDF: 0,
                custoBorda: 0,
                custoFerragens: 0,
            };
        });
        projetoAtual.ferragensExtras.forEach((f) => {
            itensOrcamento[f.instanceId] = { nome: `${f.valor}${f.unidade} de ${f.nome} (Extra)`, dimensoes: "", custoMDF: 0, custoBorda: 0, custoFerragens: f.valor * (f.preco || 0) };
        });

        listaFerragensGerada.forEach((f) => {
            if (f.moduloInstanceId && itensOrcamento[f.moduloInstanceId]) itensOrcamento[f.moduloInstanceId].custoFerragens += f.valor * (f.preco || 0);
        });

        listaPecasGerada.forEach((item) => {
            if (item.tipo === "header" || !item.moduloInstanceId || !itensOrcamento[item.moduloInstanceId]) return;
            const { qtd, alturaFinal, larguraFinal, corMaterial, corBorda, bordaA1, bordaA2, bordaL1, bordaL2 } = item;
            const corMaterialData = AppData.coresMDF[corMaterial] || { preco: 0 };
            const corBordaData = AppData.coresBorda[corBorda] || { preco: config.custoBorda };
            const quantity = parseInt(qtd || 1);
            itensOrcamento[item.moduloInstanceId].custoMDF += (alturaFinal / 1000) * (larguraFinal / 1000) * quantity * (corMaterialData.preco || 0);
            let comprimentoBordaMM = [bordaA1, bordaA2].filter(Boolean).length * alturaFinal + [bordaL1, bordaL2].filter(Boolean).length * larguraFinal;
            itensOrcamento[item.moduloInstanceId].custoBorda += (comprimentoBordaMM / 1000) * quantity * (corBordaData.preco || 0);
        });

        Object.values(itensOrcamento).forEach((item) => {
            item.custoTotalMaterial = item.custoMDF + item.custoBorda + item.custoFerragens;
            item.valorVendaMaterial = item.custoTotalMaterial * (1 + config.margemLucroMaterial / 100);
        });

        orcamentoFinalData.itensOrcamento = itensOrcamento;
        orcamentoFinalData.custoTotalMaterial = Object.values(itensOrcamento).reduce((total, item) => total + item.custoTotalMaterial, 0);

        // 2. Renderização da Tabela de Peças (AGORA COM AGRUPAMENTO)
        listaPecasTbody.innerHTML = "";

        // Estrutura para agrupar visualmente
        const gruposTabela = {};
        let currentGroupKey = null;

        listaPecasGerada.forEach((item) => {
            if (item.tipo === "header") {
                // Cria uma chave baseada nas características do módulo (sem o ID da instância)
                const dimStr = item.isPecaAvulsa ? `${item.A}-${item.L}-${item.espessura}` : `${item.A}-${item.L}-${item.P}-${item.LadoA}-${item.LadoB}`;

                const key = `GRP_${item.nome}_${dimStr}_${item.tipoModulo}`;
                currentGroupKey = key;

                if (!gruposTabela[key]) {
                    gruposTabela[key] = {
                        header: item,
                        qtdModulos: 0,
                        pecasAgrupadas: {}, // Agrupa peças idênticas dentro deste módulo
                        valorTotalVenda: 0,
                        instanceIds: [],
                    };
                }
                gruposTabela[key].qtdModulos++;
                gruposTabela[key].instanceIds.push(item.instanceId);

                // Soma o valor deste módulo ao total do grupo
                if (itensOrcamento[item.instanceId]) {
                    gruposTabela[key].valorTotalVenda += itensOrcamento[item.instanceId].valorVendaMaterial;
                }
            } else {
                // É uma peça, adiciona ao grupo atual
                if (currentGroupKey && gruposTabela[currentGroupKey]) {
                    const grupo = gruposTabela[currentGroupKey];

                    // Chave única da peça (Nome + Dimensões + Materiais + Bordas)
                    const bordasStr = [item.bordaA1, item.bordaA2, item.bordaL1, item.bordaL2].join("-");
                    const pecaKey = `${item.nome}_${item.alturaFinal}_${item.larguraFinal}_${item.espessura}_${item.corMaterial}_${item.corBorda}_${bordasStr}`;

                    if (!grupo.pecasAgrupadas[pecaKey]) {
                        grupo.pecasAgrupadas[pecaKey] = { ...item, qtdTotal: 0 };
                    }
                    grupo.pecasAgrupadas[pecaKey].qtdTotal += parseFloat(item.qtd);
                }
            }
        });

        // Desenha a tabela baseada nos grupos
        Object.values(gruposTabela).forEach((grupo) => {
            const itemHeader = grupo.header;

            // Linha de Cabeçalho do Grupo
            const rowHeader = listaPecasTbody.insertRow();
            rowHeader.className = "group-header";
            const cellHeader = rowHeader.insertCell();
            cellHeader.colSpan = 9;

            let dimensoesTexto = itemHeader.isPecaAvulsa
                ? `(A:${itemHeader.A} L:${itemHeader.L} E:${itemHeader.espessura})`
                : itemHeader.tipoModulo === "reto"
                ? `(A:${itemHeader.A} x L:${itemHeader.L} x P:${itemHeader.P})`
                : `(A:${itemHeader.A} LadoA:${itemHeader.LadoA}...)`;

            const textoQtd = grupo.qtdModulos > 1 ? `<span style="background:var(--cor-principal); color:#fff; padding:2px 8px; border-radius:12px; font-size:0.9em;">${grupo.qtdModulos} unidades</span>` : "";

            cellHeader.innerHTML = `
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0;">
                                <span>
                                    <strong>${itemHeader.isPecaAvulsa ? "Peça:" : "Módulo:"} ${itemHeader.nome}</strong> 
                                    ${dimensoesTexto} ${textoQtd}
                                </span>
                                <span style="font-size: 1.1em;">
                                    <strong>Total: R$ ${grupo.valorTotalVenda.toFixed(2)}</strong>
                                </span>
                            </div>`;

            // Linhas das Peças Agrupadas
            Object.values(grupo.pecasAgrupadas).forEach((peca) => {
                const corMaterialNome = (AppData.coresMDF[peca.corMaterial] || { nome: "(Excluído)" }).nome;
                const corBordaNome = (AppData.coresBorda[peca.corBorda] || { nome: "(Excluído)" }).nome;
                let bordasStr = [peca.bordaA1 && "A1", peca.bordaA2 && "A2", peca.bordaL1 && "L1", peca.bordaL2 && "L2"].filter(Boolean).join(" ");

                const row = listaPecasTbody.insertRow();
                // Nota: Removemos o data-id e as ações de edição individual aqui pois são peças agrupadas
                row.innerHTML = `
                                    <td>${peca.nome}</td>
                                    <td style="font-weight:bold; color:var(--cor-principal); text-align:center;">${peca.qtdTotal}</td>
                                    <td>${formatarNumero(peca.alturaFinal)}</td>
                                    <td>${formatarNumero(peca.larguraFinal)}</td>
                                    <td>${peca.espessura}</td>
                                    <td>${corMaterialNome}</td>
                                    <td>${bordasStr.trim()}</td>
                                    <td>${corBordaNome}</td>
                                    <td class="acoes" style="color:#ccc; font-size:0.8em; text-align:center;">
                                        (Agrupado)
                                    </td>`;
            });
        });

        // 3. Renderização da Tabela de Ferragens (Mantém lógica agrupada)
        listaFerragensTbody.innerHTML = "";
        const ferragensAgrupadas = {};
        listaFerragensGerada.forEach((f) => {
            if (f && f.nome) {
                const key = `${f.nome}_${f.unidade}_${f.tipo}`;
                if (!ferragensAgrupadas[key]) {
                    ferragensAgrupadas[key] = { ...f, valor: 0, ids: [] };
                }
                ferragensAgrupadas[key].valor += f.valor;
                ferragensAgrupadas[key].ids.push(f.id);
            }
        });
        Object.values(ferragensAgrupadas).forEach((f) => {
            const custoItemTotal = f.valor * f.preco;
            let displayName = f.nome;
            if (f.tipo === "corredica") {
                const match = f.nome.match(/(\d+)mm/);
                if (match && match[1]) displayName = f.nome.replace(/\s?\d+mm$/, "").trim() + ` ${parseInt(match[1]) / 10}cm`;
            }
            const row = listaFerragensTbody.insertRow();
            row.innerHTML = `<td>${displayName}</td><td>${f.valor.toFixed(f.unidade === "UN" || f.unidade === "PAR" ? 0 : 2)} ${f.unidade}</td><td>R$ ${f.preco.toFixed(2)}</td><td>R$ ${custoItemTotal.toFixed(
                2
            )}</td><td><button class="btn-danger btn-sm btn-remover-ferragem-final" data-ids="${f.ids.join(",")}">X</button></td>`;
        });

        // 4. Lista de Compras (Shopping List)
        const shoppingListHTML = getShoppingListData()
            .map((group) => {
                let groupRows = `<tr class="group-header-shopping"><td colspan="2">${group.title}</td></tr>`;
                group.items.forEach((item) => {
                    groupRows += `<tr><td>${item.name}</td><td>${item.quantity}</td></tr>`;
                });
                return groupRows;
            })
            .join("");
        getEl("lista-materiais-compra").querySelector("tbody").innerHTML = shoppingListHTML;

        recalcularOrcamentoTotal();
    };

    const exportarPDFProducao = () => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const cliente = getEl("nomeCliente").value || "Não informado";
        const ambiente = getEl("nomeAmbiente").value || "Não especificado";

        doc.setFontSize(18);
        doc.text("Lista de Produção", 14, 22);
        doc.setFontSize(11);
        doc.setFont(undefined, "normal");
        doc.text(`Projeto: ${cliente} - ${ambiente}`, 14, 28);
        let lastY = 36;

        const pecasAgrupadas = listaPecasGerada.reduce((acc, item) => {
            if (item.tipo === "header") acc.push({ ...item, pecas: [] });
            else if (acc.length > 0) acc[acc.length - 1].pecas.push(item);
            return acc;
        }, []);

        pecasAgrupadas.forEach((grupo) => {
            if (lastY > 260) {
                doc.addPage();
                lastY = 30;
            }
            doc.setFontSize(12);
            doc.setFont(undefined, "bold");
            let dimensoesTexto = grupo.isPecaAvulsa
                ? `(A:${grupo.A} L:${grupo.L} E:${grupo.espessura})`
                : grupo.tipoModulo === "reto"
                ? `(A:${grupo.A} x L:${grupo.L} x P:${grupo.P})`
                : `(A:${grupo.A} LadoA:${grupo.LadoA} LadoB:${grupo.LadoB} ProfA:${grupo.ProfA} ProfB:${grupo.ProfB})`;
            doc.text(`${grupo.isPecaAvulsa ? "Peça:" : "Módulo:"} ${grupo.nome} ${dimensoesTexto}`, 14, lastY);
            let tableStartY = lastY + 7;

            if (grupo.imagem) {
                try {
                    const imgWidth = 30,
                        imgHeight = 30;
                    const imgX = doc.internal.pageSize.getWidth() - 14 - imgWidth,
                        imgY = lastY - 7;
                    doc.addImage(grupo.imagem, "JPEG", imgX, imgY, imgWidth, imgHeight);
                    tableStartY = Math.max(tableStartY, imgY + imgHeight + 2);
                } catch (e) {
                    console.error("Erro ao adicionar imagem ao PDF:", e);
                }
            }

            const body = grupo.pecas.map((peca) => {
                let bordasStr = [peca.bordaA1 && "A1", peca.bordaA2 && "A2", peca.bordaL1 && "L1", peca.bordaL2 && "L2"].filter(Boolean).join(" ");
                return [
                    peca.nome,
                    peca.qtd,
                    formatarNumero(peca.alturaFinal),
                    formatarNumero(peca.larguraFinal),
                    peca.espessura,
                    AppData.coresMDF[peca.corMaterial]?.nome || "N/A",
                    bordasStr.trim(),
                    AppData.coresBorda[peca.corBorda]?.nome || "N/A",
                ];
            });
            doc.autoTable({ head: [["Nome Peça", "Qtd", "Altura", "Largura", "Esp.", "Material", "Bordas", "Cor Borda"]], body, startY: tableStartY, headStyles: { fillColor: [31, 41, 55] } });
            lastY = doc.lastAutoTable.finalY + 10;
        });

        if (lastY > 260) {
            doc.addPage();
            lastY = 30;
        }
        doc.setFontSize(14);
        doc.text("Lista de Compras (Ferragens)", 14, lastY);
        const ferragensAgrupadasPDF = {};
        listaFerragensGerada.forEach((f) => {
            if (f && f.nome) {
                const key = `${f.nome}_${f.unidade}_${f.tipo}`;
                if (!ferragensAgrupadasPDF[key]) ferragensAgrupadasPDF[key] = { ...f, valor: 0 };
                ferragensAgrupadasPDF[key].valor += f.valor;
            }
        });
        const ferragensBody = Object.values(ferragensAgrupadasPDF).map((f) => {
            let displayName = f.nome;
            if (f.tipo === "corredica") {
                const match = f.nome.match(/(\d+)mm/);
                if (match && match[1]) displayName = f.nome.replace(/\s?\d+mm$/, "").trim() + ` ${parseInt(match[1]) / 10}cm`;
            }
            return [displayName, `${f.valor.toFixed(f.unidade === "UN" || f.unidade === "PAR" ? 0 : 2)} ${f.unidade}`];
        });
        doc.autoTable({ head: [["Nome Ferragem", "Qtd/Medida"]], body: ferragensBody, startY: lastY + 7, headStyles: { fillColor: [31, 41, 55] } });
        const nomeArquivo = `lista-producao-${(cliente + "_" + ambiente).replace(/\s/g, "_") || "geral"}.pdf`;
        doc.save(nomeArquivo);
    };

    const exportarPDFCliente = () => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const cliente = getEl("nomeCliente").value || "Não informado";
        const ambiente = getEl("nomeAmbiente").value || "Não especificado";
        const corExternaNome = AppData.coresMDF[getEl("projCorExterna").value]?.nome || "N/A";
        const corInternaNome = AppData.coresMDF[getEl("projCorInterna").value]?.nome || "N/A";
        const cores = `Cor Externa: ${corExternaNome} | Cor Interna: ${corInternaNome}`;

        doc.setFontSize(18);
        doc.setFont(undefined, "bold");
        doc.text("Proposta de Orçamento", 14, 22);
        doc.setFontSize(11);
        doc.setFont(undefined, "normal");
        doc.setTextColor(0, 0, 0);
        doc.text(`Cliente: ${cliente}`, 14, 30);
        doc.text(`Ambiente: ${ambiente}`, 14, 36);
        doc.text(cores, 14, 42);

        const bodyData = [];
        let totalFinal = 0;
        if (orcamentoFinalData.itensOrcamento) {
            Object.values(orcamentoFinalData.itensOrcamento).forEach((item) => {
                bodyData.push([`${item.nome} ${item.dimensoes}`, `R$ ${item.valorVendaMaterial.toFixed(2)}`]);
                totalFinal += item.valorVendaMaterial;
            });
        }
        doc.autoTable({ head: [["Descrição do Item", "Valor"]], body: bodyData, startY: 50, theme: "striped", headStyles: { fillColor: [45, 55, 72] }, styles: { fontSize: 10 }, columnStyles: { 1: { halign: "right" } } });
        let finalY = doc.lastAutoTable.finalY + 15;
        doc.setFontSize(16);
        doc.setFont(undefined, "bold");
        doc.setTextColor(45, 55, 72);
        doc.text("VALOR TOTAL DO PROJETO:", 14, finalY);
        doc.text(`R$ ${totalFinal.toFixed(2)}`, 200, finalY, { align: "right" });
        finalY += 20;
        const termos = `Termos e Condições:\n1. O presente orçamento tem validade de 15 dias.\n2. Condições de pagamento: 50% de sinal e 50% na entrega.\n3. Prazo de entrega: 30 dias úteis após a confirmação do sinal.`;
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(termos, 14, finalY, { maxWidth: 180 });
        const nomeArquivo = `orcamento-${(cliente + "_" + ambiente).replace(/\s/g, "_") || "geral"}.pdf`;
        doc.save(nomeArquivo);
    };

    // --- ATUALIZADO: Agrupamento da Planilha Excel ---
    const exportarExcel = () => {
        const wb = XLSX.utils.book_new();

        // 1. Lista de Compras (Já agrupada)
        const shoppingData = getShoppingListData();
        const shoppingListData = [];
        shoppingData.forEach((group) => {
            shoppingListData.push([group.title, ""]);
            group.items.forEach((item) => {
                shoppingListData.push([item.name, item.quantity]);
            });
            shoppingListData.push([]);
        });
        const wsShopping = XLSX.utils.aoa_to_sheet(shoppingListData);
        wsShopping["!cols"] = [{ wch: 40 }, { wch: 30 }];
        XLSX.utils.book_append_sheet(wb, wsShopping, "Lista de Compras");

        // 2. Plano de Corte (AGORA COM AGRUPAMENTO NA EXPORTAÇÃO)
        const pecasData = [["Nome Peça", "Qtd Total", "Altura", "Largura", "Espessura", "Material", "Bordas", "Cor Borda"]];

        // Recria o agrupamento para o Excel (pois listaPecasGerada é bruta)
        const gruposExcel = {};
        let currentGroupKey = null;

        listaPecasGerada.forEach((item) => {
            if (item.tipo === "header") {
                const dimStr = item.isPecaAvulsa ? `${item.A}-${item.L}-${item.espessura}` : `${item.A}-${item.L}-${item.P}-${item.LadoA}-${item.LadoB}`;
                const key = `GRP_EXCEL_${item.nome}_${dimStr}_${item.tipoModulo}`;
                currentGroupKey = key;

                if (!gruposExcel[key]) {
                    gruposExcel[key] = { header: item, qtdModulos: 0, pecasAgrupadas: {} };
                }
                gruposExcel[key].qtdModulos++;
            } else {
                if (currentGroupKey && gruposExcel[currentGroupKey]) {
                    const grupo = gruposExcel[currentGroupKey];
                    const bordasStr = [item.bordaA1, item.bordaA2, item.bordaL1, item.bordaL2].join("-");
                    const pecaKey = `${item.nome}_${item.alturaFinal}_${item.larguraFinal}_${item.espessura}_${item.corMaterial}_${item.corBorda}_${bordasStr}`;

                    if (!grupo.pecasAgrupadas[pecaKey]) {
                        grupo.pecasAgrupadas[pecaKey] = { ...item, qtdTotal: 0 };
                    }
                    grupo.pecasAgrupadas[pecaKey].qtdTotal += parseFloat(item.qtd);
                }
            }
        });

        // Preenche os dados da planilha
        Object.values(gruposExcel).forEach((grupo) => {
            const itemHeader = grupo.header;
            const textoQtd = grupo.qtdModulos > 1 ? ` (${grupo.qtdModulos} unidades)` : "";
            pecasData.push([`Módulo: ${itemHeader.nome}${textoQtd}`]); // Cabeçalho do módulo

            Object.values(grupo.pecasAgrupadas).forEach((peca) => {
                let bordasStr = [peca.bordaA1 && "A1", peca.bordaA2 && "A2", peca.bordaL1 && "L1", peca.bordaL2 && "L2"].filter(Boolean).join(" ");
                pecasData.push([
                    peca.nome,
                    peca.qtdTotal, // Qtd somada
                    formatarNumero(peca.alturaFinal),
                    formatarNumero(peca.larguraFinal),
                    peca.espessura,
                    AppData.coresMDF[peca.corMaterial]?.nome || "N/A",
                    bordasStr.trim(),
                    AppData.coresBorda[peca.corBorda]?.nome || "N/A",
                ]);
            });
        });

        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(pecasData), "Plano de Corte");

        // 3. Lista de Ferragens (Mantém igual)
        const ferragensData = [["Nome Ferragem", "Qtd/Medida", "Unidade", "Preço Unit/M", "Preço Total"]];
        const excelFerragensAgrupadas = {};
        listaFerragensGerada.forEach((f) => {
            if (f && f.nome) {
                const key = `${f.nome}_${f.unidade}_${f.tipo}`;
                if (!excelFerragensAgrupadas[key]) excelFerragensAgrupadas[key] = { ...f, valor: 0 };
                excelFerragensAgrupadas[key].valor += f.valor;
            }
        });
        Object.values(excelFerragensAgrupadas).forEach((f) => {
            let displayName = f.nome;
            if (f.tipo === "corredica") {
                const match = f.nome.match(/(\d+)mm/);
                if (match && match[1]) displayName = f.nome.replace(/\s?\d+mm$/, "").trim() + ` ${parseInt(match[1]) / 10}cm`;
            }
            ferragensData.push([displayName, f.valor.toFixed(f.unidade === "UN" || f.unidade === "PAR" ? 0 : 2), f.unidade, `R$ ${f.preco.toFixed(2)}`, `R$ ${(f.valor * f.preco).toFixed(2)}`]);
        });
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(ferragensData), "Lista de Ferragens");

        const cliente = getEl("nomeCliente").value.replace(/\s/g, "_") || "geral";
        const ambiente = getEl("nomeAmbiente").value.replace(/\s/g, "_");
        const nomeArquivo = `listagem-completa-${cliente}${ambiente ? "-" + ambiente : ""}.xlsx`;
        XLSX.writeFile(wb, nomeArquivo);
    };

    const exportarParaCortcloud = () => {
        if (listaPecasGerada.length === 0) return showToast("Primeiro, gere a listagem de peças.", "error");
        let fileContent = "";
        const espessuraFitaBorda = "0.4";
        const cliente = getEl("nomeCliente").value.replace(/\s/g, "_") || "Projeto_Geral";
        const ambiente = getEl("nomeAmbiente").value.replace(/\s/g, "_");
        const infoCliente = `${cliente}${ambiente ? "_" + ambiente : ""}`;

        listaPecasGerada.forEach((item) => {
            if (item.tipo === "header") return;
            const corMaterialNome = AppData.coresMDF[item.corMaterial]?.nome || item.corMaterial;
            const linha = [
                `1.0000.${item.espessura}.${corMaterialNome.replace(/\s/g, "")}.MDF`,
                item.nome,
                formatarNumero(item.alturaFinal),
                formatarNumero(item.larguraFinal),
                item.qtd,
                infoCliente,
                item.bordaA1 ? espessuraFitaBorda : "0",
                item.bordaA2 ? espessuraFitaBorda : "0",
                item.bordaL1 ? espessuraFitaBorda : "0",
                item.bordaL2 ? espessuraFitaBorda : "0",
                `MDF-${item.espessura}-${corMaterialNome.replace(/\s/g, "_")}`,
                "",
            ].join(";");
            fileContent += linha + "\n";
        });
        const blob = new Blob([fileContent], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `cortcloud_${infoCliente}_${new Date().getTime()}.txt`;
        document.body.appendChild(a);
        a.click();
        URL.revokeObjectURL(url);
        a.remove();
        showToast("Arquivo para Cortcloud gerado!", "success");
    };

    const toggleHardwarePriceFields = () => {
        const unidade = getEl("novaFerragemUnidade").value;
        const show = unidade === "M";
        getEl("campos-preco-barra-ferragem").style.display = show ? "grid" : "none";
        getEl("labelPrecoFinalFerragem").textContent = show ? "Preço Final por Metro (R$/m)" : "Preço (R$)";
    };

    const calcularPrecoMetroFerragem = () => {
        const precoBarra = parseFloat(getEl("novaFerragemPrecoBarra").value),
            metragemBarra = parseFloat(getEl("novaFerragemMetragemBarra").value),
            campoFinal = getEl("novaFerragemPreco");
        if (!isNaN(precoBarra) && !isNaN(metragemBarra) && metragemBarra > 0) campoFinal.value = (precoBarra / metragemBarra).toFixed(2);
        else campoFinal.value = "";
    };

    const resetHardwareForm = () => {
        editingHardwareKey = null;
        getEl("ferragem-form-titulo").textContent = "Adicionar Nova Ferragem";
        getEl("novaFerragemNome").value = "";
        getEl("novaFerragemNome").readOnly = false;
        getEl("novaFerragemUnidade").value = "UN";
        getEl("novaFerragemTipo").value = "geral";
        getEl("novaFerragemUnidade").disabled = false;
        getEl("novaFerragemPreco").value = "";
        getEl("novaFerragemPrecoBarra").value = "";
        getEl("novaFerragemMetragemBarra").value = "";
        getEl("btnSalvarFerragem").textContent = "Adicionar";
        getEl("btnSalvarFerragem").classList.replace("btn-success", "btn-primary");
        getEl("btnCancelarEdicaoFerragem").style.display = "none";
        getEl("novaFerragemPreview").src = "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";
        currentImageUrl.hardware = null;
        toggleHardwarePriceFields();
    };

    const resetMaterialForm = () => {
        editingMaterialKey = null;
        editingMaterialType = null;
        getEl("material-form-titulo").textContent = "Adicionar Novo MDF";
        getEl("novoMaterialTipo").disabled = false;
        getEl("novoMaterialNome").readOnly = false;
        getEl("novoMaterialNome").value = "";
        getEl("novoMaterialPrecoChapa").value = "";
        getEl("novoMaterialPrecoCalculado").value = "";
        getEl("novoMaterialPrecoRoloBorda").value = "";
        getEl("novoMaterialMetragemRoloBorda").value = "";
        getEl("novoMaterialPrecoFinalBorda").value = "";
        getEl("btnAddMaterial").textContent = "Adicionar ao Catálogo";
        getEl("btnAddMaterial").classList.replace("btn-success", "btn-primary");
        getEl("btnCancelarEdicaoMaterial").style.display = "none";
        getEl("novoMaterialPreview").src = "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";
        currentImageUrl.material = null;
        toggleMaterialPriceFields();
    };

    const resetBordaForm = () => {
        if (editingMaterialType === "coresBorda") { editingMaterialKey = null; editingMaterialType = null; }
        getEl("borda-form-titulo").textContent = "Adicionar Nova Fita de Borda";
        getEl("novaBordaNome").readOnly = false;
        getEl("novaBordaNome").value = "";
        getEl("novaBordaPrecoRolo").value = "";
        getEl("novaBordaMetragemRolo").value = "";
        getEl("novaBordaPrecoFinal").value = "";
        getEl("novaBordaPreview").src = "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";
        currentImageUrl.material = null;
        getEl("btnAddBorda").textContent = "Adicionar ao Catálogo";
        getEl("btnAddBorda").classList.replace("btn-success", "btn-primary");
        getEl("btnCancelarEdicaoBorda").style.display = "none";
    };

    const carregarMaterialParaEdicao = (key, type) => {
        const item = AppData[type][key];
        if (!item) return;
        if (type === "coresBorda") {
            resetMaterialForm();
            resetBordaForm();
            editingMaterialKey = key;
            editingMaterialType = type;
            getEl("novaBordaNome").value = item.nome;
            getEl("novaBordaNome").readOnly = true;
            getEl("novaBordaPrecoFinal").value = item.preco.toFixed(2);
            getEl("novaBordaPreview").src = item.imagem || "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";
            currentImageUrl.material = item.imagem;
            getEl("borda-form-titulo").textContent = `Editando: ${item.nome}`;
            getEl("btnAddBorda").textContent = "Salvar Alterações";
            getEl("btnAddBorda").classList.replace("btn-primary", "btn-success");
            getEl("btnCancelarEdicaoBorda").style.display = "inline-flex";
            switchCatTab("cat-borda");
        } else {
            resetBordaForm();
            resetMaterialForm();
            editingMaterialKey = key;
            editingMaterialType = type;
            getEl("novoMaterialTipo").value = "mdf";
            getEl("novoMaterialTipo").disabled = true;
            toggleMaterialPriceFields();
            getEl("novoMaterialNome").value = item.nome;
            getEl("novoMaterialNome").readOnly = true;
            getEl("novoMaterialPreview").src = item.imagem || "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";
            currentImageUrl.material = item.imagem;
            getEl("novoMaterialPrecoChapa").value = item.precoChapa ? item.precoChapa.toFixed(2) : "";
            getEl("novoMaterialPrecoCalculado").value = item.preco ? item.preco.toFixed(2) : "";
            getEl("material-form-titulo").textContent = `Editando: ${item.nome}`;
            getEl("btnAddMaterial").textContent = "Salvar Alterações";
            getEl("btnAddMaterial").classList.replace("btn-primary", "btn-success");
            getEl("btnCancelarEdicaoMaterial").style.display = "inline-flex";
            switchCatTab("cat-mdf");
        }
    };

    const carregarFerragemParaEdicao = (key) => {
        const ferragem = AppData.catalogoFerragens[key];
        if (!ferragem) return;
        resetHardwareForm();
        editingHardwareKey = key;
        getEl("ferragem-form-titulo").textContent = `Editando: ${ferragem.nome}`;
        getEl("novaFerragemNome").value = ferragem.nome;
        getEl("novaFerragemNome").readOnly = false;
        getEl("novaFerragemTipo").value = ferragem.tipo || "geral";
        getEl("novaFerragemUnidade").value = ferragem.unidade;
        getEl("novaFerragemUnidade").disabled = false;
        getEl("novaFerragemPreco").value = ferragem.preco;
        getEl("novaFerragemPreview").src = ferragem.imagem || "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";
        currentImageUrl.hardware = ferragem.imagem;
        getEl("btnSalvarFerragem").textContent = "Salvar Alterações";
        getEl("btnSalvarFerragem").classList.replace("btn-primary", "btn-success");
        getEl("btnCancelarEdicaoFerragem").style.display = "inline-flex";
        toggleHardwarePriceFields();
    };

    const calcularPrecoMetroPerfil = () => {
        const precoBarra = parseFloat(getEl("novoPerfilPrecoBarra").value),
            metragemBarra = parseFloat(getEl("novoPerfilMetragemBarra").value),
            campoFinal = getEl("novoPerfilPrecoMetro");
        if (!isNaN(precoBarra) && !isNaN(metragemBarra) && metragemBarra > 0) campoFinal.value = (precoBarra / metragemBarra).toFixed(2);
        else campoFinal.value = "";
    };

    const resetProfileForm = () => {
        editingProfileKey = null;
        getEl("perfil-form-titulo").textContent = "Adicionar Novo Perfil";
        getEl("novoPerfilNome").value = "";
        getEl("novoPerfilNome").readOnly = false;
        getEl("novoPerfilPrecoBarra").value = "";
        getEl("novoPerfilMetragemBarra").value = "";
        getEl("novoPerfilPrecoMetro").value = "";
        getEl("novoPerfilPreview").src = "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";
        currentImageUrl.profile = null;
        getEl("btnSalvarPerfil").textContent = "Adicionar";
        getEl("btnSalvarPerfil").classList.replace("btn-success", "btn-primary");
        getEl("btnCancelarEdicaoPerfil").style.display = "none";
    };

    const carregarPerfilParaEdicao = (key) => {
        const perfil = AppData.catalogoPerfis[key];
        if (!perfil) return;
        resetProfileForm();
        editingProfileKey = key;
        getEl("perfil-form-titulo").textContent = `Editando: ${perfil.nome}`;
        getEl("novoPerfilNome").value = perfil.nome;
        getEl("novoPerfilNome").readOnly = true;
        getEl("novoPerfilPrecoBarra").value = perfil.precoBarra;
        getEl("novoPerfilMetragemBarra").value = perfil.metragemBarra;
        getEl("novoPerfilPrecoMetro").value = perfil.preco.toFixed(2);
        getEl("novoPerfilPreview").src = perfil.imagem || "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";
        currentImageUrl.profile = perfil.imagem;
        getEl("btnSalvarPerfil").textContent = "Salvar Alterações";
        getEl("btnSalvarPerfil").classList.replace("btn-primary", "btn-success");
        getEl("btnCancelarEdicaoPerfil").style.display = "inline-flex";
    };

    const resetPecaPredefinidaForm = () => {
        editingPecaKey = null;
        getEl("peca-form-titulo").textContent = "Nova Peça Padrão";
        getEl("novaPecaNome").value = "";
        getEl("novaPecaQtd").value = "1";
        getEl("novaPecaAltura").value = "";
        getEl("novaPecaLargura").value = "";
        getEl("novaPecaTipoMaterial").value = "interna";
        getEl("novaPecaTipoBorda").value = "interna";
        const btnSalvarPeca = getEl("btnSalvarPecaCatalogo");
        btnSalvarPeca.textContent = "Adicionar Peça ao Catálogo";
        btnSalvarPeca.classList.replace("btn-success", "btn-primary");
        getEl("btnCancelarEdicaoPeca").style.display = "none";
    };

    const carregarPecaPredefinidaParaEdicao = (key) => {
        const peca = AppData.pecasPredefinidas[key];
        if (!peca) return;
        resetPecaPredefinidaForm();
        editingPecaKey = key;
        getEl("peca-form-titulo").textContent = `Editando: ${peca.nome}`;
        getEl("novaPecaNome").value = peca.nome;
        getEl("novaPecaQtd").value = peca.qtd;
        getEl("novaPecaAltura").value = peca.altura;
        getEl("novaPecaLargura").value = peca.largura;
        getEl("novaPecaTipoMaterial").value = peca.tipoMaterial;
        getEl("novaPecaTipoBorda").value = peca.tipoBorda;
        getEl("btnSalvarPecaCatalogo").textContent = "Salvar Alterações";
        getEl("btnSalvarPecaCatalogo").classList.replace("btn-primary", "btn-success");
        getEl("btnCancelarEdicaoPeca").style.display = "inline-flex";
    };

    const toggleMaterialPriceFields = () => {
        const tipo = getEl("novoMaterialTipo").value;
        getEl("campos-preco-mdf").style.display = tipo === "mdf" ? "grid" : "none";
        getEl("campos-preco-borda").style.display = tipo === "borda" ? "grid" : "none";
    };

    const atualizarTodosOsHelpersNoModal = (tipoModulo) => {
        const isReto = tipoModulo === "reto";
        const baseVars = isReto ? "A, L, P" : "A, LadoA, LadoB, ProfA, ProfB";
        const otherVars = `MedidaCorredica, EspInterna, EspExterna, DescFundoArmario, FolgaPortaAltura, FolgaPortaLargura, FolgaGaveta, FolgaCorredicaFrente, FolgaCorredicaFundo, AjustePuxadorAltura, AjustePuxadorLargura, DescontoPerfilAltura, DescontoPerfilLargura, DescAlturaBaseGav, DescAlturaLateralGav`;

        document.querySelectorAll(".formula-helper-altura").forEach((el) => (el.textContent = `Variáveis: ${baseVars}, ${otherVars}`));
        document.querySelectorAll(".formula-helper-largura").forEach((el) => (el.textContent = `Variáveis: ${baseVars}, ${otherVars}`));

        const corredicasHelper = document.querySelector("#view-editor-modulo small.formula-helper");
        if (corredicasHelper) {
            corredicasHelper.textContent = `Use 'A' (altura), 'L' (largura), 'P' (profundidade), 'NumGavetas' (qtd de frentes de gaveta no módulo), 'LadoA', 'LadoB', 'ProfA', 'ProfB' e variáveis de folga nas fórmulas, como MedidaCorredica, DescAlturaBaseGav, DescAlturaLateralGav.`;
        }
    };

    // --- INICIALIZAÇÃO E EVENT LISTENERS ---
    const abrirModal = (modalId) => getEl(modalId).classList.add("active");
    const fecharModal = (modalId) => getEl(modalId).classList.remove("active");

    getEl("btnAbrirSelecaoModulo").addEventListener("click", () => {
        popularGridSelecaoModulo();
        abrirModal("modal-selecionar-modulo");
    });

    getEl("btnNavProjeto").addEventListener("click", () => navigateTo("view-projeto"));
    getEl("btnNavDados").addEventListener("click", () => navigateTo("view-dados"));
    getEl("btnNavConfig").addEventListener("click", () => navigateTo("view-configuracoes"));
    getEl("btnNavVisualizarCatalogo").addEventListener("click", () => {
        popularModalCatalogoCompleto();
        navigateTo("view-visualizar-catalogo");
    });
    getEl("btnNavGerenciarCatalogos").addEventListener("click", () => {
        resetHardwareForm();
        resetMaterialForm();
        resetBordaForm();
        resetProfileForm();
        resetPecaPredefinidaForm();
        navigateTo("view-gerenciar-catalogos");
        switchCatTab("cat-mdf");
    });
    getEl("btnSalvarDadosJson").addEventListener("click", salvarDados);

    const atualizarListaGerenciarModulos = () => {
        const container = getEl("lista-modulos-salvos");
        container.innerHTML = "";
        if (AppData.catalogoModulos) {
            AppData.catalogoModulos.forEach((modulo) => {
                const div = document.createElement("div");
                div.className = "catalogo-item catalogo-item-com-imagem";
                div.dataset.filterName = `${modulo.nome} ${modulo.categoria}`.toLowerCase();
                div.innerHTML = `<img src="${modulo.imagem || "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs="}" alt="Miniatura do módulo"><span>${modulo.categoria ? `[${modulo.categoria}] ` : ""}${
                    modulo.nome
                }</span><div class="botoes-acao" style="margin-top:0; flex-wrap: nowrap;"><button class="btn-warning btn-sm btn-edit-modulo" data-id="${
                    modulo.id
                }">Editar</button><button class="btn-danger btn-sm btn-delete-modulo" data-id="${modulo.id}">Excluir</button></div>`;
                container.appendChild(div);
            });
        }
    };

    getEl("btnNavGerenciarModulos").addEventListener("click", () => {
        atualizarListaGerenciarModulos();
        navigateTo("view-gerenciar-modulos");
    });
    getEl("btnAbrirEditorModulo").addEventListener("click", () => {
        resetModuleCreatorForm();
        navigateTo("view-editor-modulo");
    });

    document.querySelectorAll(".btn-voltar").forEach((btn) => {
        btn.addEventListener("click", () => navigateTo("view-projeto"));
    });

    getEl("btnAbrirModalRipado").addEventListener("click", () => abrirModal("modal-ripado"));
    document.querySelectorAll(".modal-close").forEach((btn) => btn.addEventListener("click", () => fecharModal(btn.dataset.modalId)));

    getEl("lista-modulos-salvos").addEventListener("click", (e) => {
        const target = e.target.closest("button");
        if (!target) return;
        const moduloId = parseInt(target.dataset.id);
        if (target.matches(".btn-edit-modulo")) carregarModuloParaEdicao(moduloId);
        if (target.matches(".btn-delete-modulo") && confirm("Tem certeza que deseja excluir este módulo?")) {
            AppData.catalogoModulos = AppData.catalogoModulos.filter((m) => m.id !== moduloId);
            saveAppState();
            target.closest(".catalogo-item").remove();
            showToast("Módulo excluído. Salve os dados para tornar a exclusão permanente.", "warning");
        }
    });
    pecasContainer.addEventListener("click", (e) => {
        const removeBtn = e.target.closest(".btn-remover-peca");
        if (removeBtn) removeBtn.closest(".peca-item-wrapper").remove();
    });

    const handleCatalogClick = (e) => {
        const target = e.target.closest("button");
        if (!target) return;
        const key = target.dataset.key,
            type = target.dataset.type;
        if (target.matches(".btn-delete") && confirm("Tem certeza?")) {
            if (AppData[type] && AppData[type][key]) {
                delete AppData[type][key];
                saveAppState();
                popularTodosSeletores();
                resetMaterialForm();
                resetBordaForm();
                resetHardwareForm();
                resetProfileForm();
                resetPecaPredefinidaForm();
                showToast("Item excluído. Salve os dados para tornar a exclusão permanente.", "warning");
            }
        } else if (target.matches(".btn-edit-material")) carregarMaterialParaEdicao(key, type);
        else if (target.matches(".btn-edit-ferragem")) carregarFerragemParaEdicao(key);
        else if (target.matches(".btn-edit-perfil")) carregarPerfilParaEdicao(key);
        else if (target.matches(".btn-edit-peca")) carregarPecaPredefinidaParaEdicao(key);
    };
    ["listaCoresMDF", "listaCoresBorda", "listaFerragensCatalogo", "listaPecasPredefinidas", "listaPerfisPuxador"].forEach((id) => getEl(id).addEventListener("click", handleCatalogClick));
    getEl("novoMaterialTipo").addEventListener("change", toggleMaterialPriceFields);
    getEl("btnCancelarEdicaoBorda").addEventListener("click", resetBordaForm);
    getEl("btnAddBorda").addEventListener("click", () => {
        if (editingMaterialKey && editingMaterialType === "coresBorda") {
            const item = AppData.coresBorda[editingMaterialKey];
            const preco = parseFloat(getEl("novaBordaPrecoFinal").value);
            if (isNaN(preco)) return showToast("Preço inválido.", "error");
            item.preco = preco;
            item.imagem = currentImageUrl.material;
            saveAppState();
            popularTodosSeletores();
            showToast(`Fita "${item.nome}" atualizada! Salve os dados.`, "success");
            resetBordaForm();
        } else {
            const nome = getEl("novaBordaNome").value.trim();
            if (!nome) return showToast("Nome é obrigatório.", "error");
            const key = createKeyFromName(nome);
            if (AppData.coresBorda[key]) return showToast("Fita de borda já existe.", "error");
            const preco = parseFloat(getEl("novaBordaPrecoFinal").value);
            if (isNaN(preco)) return showToast("Preço inválido.", "error");
            AppData.coresBorda[key] = { nome, preco, imagem: currentImageUrl.material };
            saveAppState();
            popularTodosSeletores();
            showToast(`"${nome}" adicionada! Salve os dados.`, "success");
            resetBordaForm();
        }
    });
    const calcularPrecoBordaTab = () => {
        const precoRolo = parseFloat(getEl("novaBordaPrecoRolo").value),
            metragemRolo = parseFloat(getEl("novaBordaMetragemRolo").value),
            campoFinal = getEl("novaBordaPrecoFinal");
        if (!isNaN(precoRolo) && !isNaN(metragemRolo) && metragemRolo > 0)
            campoFinal.value = (precoRolo / metragemRolo).toFixed(2);
    };
    getEl("novaBordaPrecoRolo").addEventListener("input", calcularPrecoBordaTab);
    getEl("novaBordaMetragemRolo").addEventListener("input", calcularPrecoBordaTab);
    getEl("novaBordaPrecoFinal").addEventListener("input", () => {
        getEl("novaBordaPrecoRolo").value = "";
        getEl("novaBordaMetragemRolo").value = "";
    });
    const calcularPrecoMetroBorda = () => {
        const precoRolo = parseFloat(getEl("novoMaterialPrecoRoloBorda").value),
            metragemRolo = parseFloat(getEl("novoMaterialMetragemRoloBorda").value),
            campoFinal = getEl("novoMaterialPrecoFinalBorda");
        if (!isNaN(precoRolo) && !isNaN(metragemRolo) && metragemRolo > 0) campoFinal.value = (precoRolo / metragemRolo).toFixed(2);
    };
    getEl("novoMaterialPrecoRoloBorda").addEventListener("input", calcularPrecoMetroBorda);
    getEl("novoMaterialMetragemRoloBorda").addEventListener("input", calcularPrecoMetroBorda);
    getEl("novoMaterialPrecoFinalBorda").addEventListener("input", () => {
        getEl("novoMaterialPrecoRoloBorda").value = "";
        getEl("novoMaterialMetragemRoloBorda").value = "";
    });
    getEl("novoMaterialPrecoChapa").addEventListener("input", () => {
        const precoChapa = parseFloat(getEl("novoMaterialPrecoChapa").value),
            { chapaAltura, chapaLargura } = AppData.configCalculo,
            campoCalculado = getEl("novoMaterialPrecoCalculado");
        if (isNaN(precoChapa) || !chapaAltura || !chapaLargura) {
            campoCalculado.value = "";
            return;
        }
        const areaChapa = (chapaAltura / 1000) * (chapaLargura / 1000);
        if (areaChapa > 0) campoCalculado.value = (precoChapa / areaChapa).toFixed(2);
        else campoCalculado.value = "";
    });
    getEl("btnCancelarEdicaoMaterial").addEventListener("click", resetMaterialForm);
    getEl("btnAddMaterial").addEventListener("click", () => {
        if (editingMaterialKey && editingMaterialType) {
            const item = AppData[editingMaterialType][editingMaterialKey];
            if (editingMaterialType === "coresMDF") {
                const precoChapa = parseFloat(getEl("novoMaterialPrecoChapa").value);
                if (isNaN(precoChapa)) return showToast("Preço inválido.", "error");
                item.precoChapa = precoChapa;
            } else {
                const preco = parseFloat(getEl("novoMaterialPrecoFinalBorda").value);
                if (isNaN(preco)) return showToast("Preço inválido.", "error");
                item.preco = preco;
            }
            item.imagem = currentImageUrl.material;
            recalculateAllMdfPrices();
            saveAppState();
            popularTodosSeletores();
            showToast(`Material "${item.nome}" atualizado! Salve os dados.`, "success");
            resetMaterialForm();
        } else {
            const tipo = getEl("novoMaterialTipo").value,
                nome = getEl("novoMaterialNome").value.trim();
            if (!nome) return showToast("Nome é obrigatório.", "error");
            const key = createKeyFromName(nome),
                catalogo = tipo === "mdf" ? AppData.coresMDF : AppData.coresBorda;
            if (catalogo[key]) return showToast("Material já existe.", "error");
            if (tipo === "mdf") {
                const precoChapa = parseFloat(getEl("novoMaterialPrecoChapa").value);
                if (isNaN(precoChapa)) return showToast("Preço inválido.", "error");
                catalogo[key] = { nome, precoChapa, imagem: currentImageUrl.material };
            } else {
                const preco = parseFloat(getEl("novoMaterialPrecoFinalBorda").value);
                if (isNaN(preco)) return showToast("Preço inválido.", "error");
                catalogo[key] = { nome, preco, imagem: currentImageUrl.material };
            }
            recalculateAllMdfPrices();
            saveAppState();
            popularTodosSeletores();
            showToast(`"${nome}" adicionado! Salve os dados.`, "success");
            resetMaterialForm();
        }
    });
    getEl("btnSalvarFerragem").addEventListener("click", () => {
        const nome = getEl("novaFerragemNome").value.trim(),
            preco = parseFloat(getEl("novaFerragemPreco").value),
            unidade = getEl("novaFerragemUnidade").value,
            tipo = getEl("novaFerragemTipo").value;
        if (!nome || isNaN(preco) || preco < 0) return showToast("Preencha nome e preço válido.", "error");
        const ferragemData = { nome, preco, unidade, tipo, imagem: currentImageUrl.hardware };
        if (editingHardwareKey) {
            const f = AppData.catalogoFerragens[editingHardwareKey];
            f.nome = nome;
            f.preco = preco;
            f.unidade = unidade;
            f.tipo = tipo;
            f.imagem = currentImageUrl.hardware;
            showToast(`"${nome}" atualizada! Salve os dados.`);
        } else {
            const newKey = createKeyFromName(nome);
            if (AppData.catalogoFerragens[newKey]) return showToast("Ferragem já existe.", "error");
            AppData.catalogoFerragens[newKey] = ferragemData;
            showToast(`"${nome}" adicionada! Salve os dados.`);
        }
        saveAppState();
        popularTodosSeletores();
        resetHardwareForm();
    });
    getEl("novaFerragemUnidade").addEventListener("change", toggleHardwarePriceFields);
    getEl("novaFerragemPrecoBarra").addEventListener("input", calcularPrecoMetroFerragem);
    getEl("novaFerragemMetragemBarra").addEventListener("input", calcularPrecoMetroFerragem);
    getEl("btnCancelarEdicaoFerragem").addEventListener("click", resetHardwareForm);
    getEl("btnSalvarPerfil").addEventListener("click", () => {
        const nome = getEl("novoPerfilNome").value.trim(),
            precoBarra = parseFloat(getEl("novoPerfilPrecoBarra").value),
            metragemBarra = parseFloat(getEl("novoPerfilMetragemBarra").value),
            preco = parseFloat(getEl("novoPerfilPrecoMetro").value);
        if (!nome || isNaN(precoBarra) || isNaN(metragemBarra) || isNaN(preco)) return showToast("Preencha todos os campos.", "error");
        const perfilData = { nome, precoBarra, metragemBarra, preco, imagem: currentImageUrl.profile };
        if (editingProfileKey) {
            const p = AppData.catalogoPerfis[editingProfileKey];
            p.nome = nome;
            p.precoBarra = precoBarra;
            p.metragemBarra = metragemBarra;
            p.preco = preco;
            p.imagem = currentImageUrl.profile;
            showToast(`Perfil "${nome}" atualizado! Salve os dados.`);
        } else {
            const newKey = createKeyFromName(nome);
            if (AppData.catalogoPerfis[newKey]) return showToast("Perfil já existe.", "error");
            AppData.catalogoPerfis[newKey] = perfilData;
            showToast(`Perfil "${nome}" adicionada! Salve os dados.`);
        }
        saveAppState();
        popularTodosSeletores();
        resetProfileForm();
    });
    getEl("novoPerfilPrecoBarra").addEventListener("input", calcularPrecoMetroPerfil);
    getEl("novoPerfilMetragemBarra").addEventListener("input", calcularPrecoMetroPerfil);
    getEl("btnCancelarEdicaoPerfil").addEventListener("click", resetProfileForm);
    getEl("btnAdicionarPeca").addEventListener("click", () => adicionarNovaPeca());
    getEl("btnAdicionarFerragemModulo").addEventListener("click", () => {
        const select = getEl("moduloFerragemSelect"),
            valorInput = getEl("moduloFerragemValor"),
            key = select.value,
            valor = parseFloat(valorInput.value);
        if (!key || !valor || valor <= 0) return showToast("Selecione uma ferragem e um valor válido.", "error");
        adicionarFerragemAoModuloUI({ key, valor });
        select.value = "";
        valorInput.value = "";
    });
    getEl("btnAdicionarCorredicaModulo").addEventListener("click", () => {
        const select = getEl("moduloCorredicaSelect"),
            qtdInput = getEl("moduloCorredicaQtd"),
            medidaInput = getEl("moduloCorredicaMedida"),
            key = select.value,
            qtdFormula = qtdInput.value.trim(),
            medidaFormula = medidaInput.value.trim();
        if (!key || !qtdFormula || !medidaFormula) return showToast("Preencha todos os campos da corrediça.", "error");
        adicionarCorredicaAoModuloUI({ key, qtdFormula, medidaFormula });
        select.value = "";
        qtdInput.value = "";
        medidaInput.value = "";
    });
    getEl("pecas-predefinidas").addEventListener("change", (e) => {
        if (e.target.value) {
            adicionarNovaPeca(AppData.pecasPredefinidas[e.target.value]);
            e.target.value = "";
        }
    });
    getEl("btnSalvarPecaCatalogo").addEventListener("click", () => {
        const novaPeca = {
            nome: getEl("novaPecaNome").value.trim(),
            qtd: getEl("novaPecaQtd").value,
            altura: getEl("novaPecaAltura").value.trim(),
            largura: getEl("novaPecaLargura").value.trim(),
            tipoMaterial: getEl("novaPecaTipoMaterial").value,
            tipoBorda: getEl("novaPecaTipoBorda").value,
        };
        if (!novaPeca.nome) return showToast("O nome é obrigatório.", "error");
        if (editingPecaKey) {
            AppData.pecasPredefinidas[editingPecaKey] = { ...AppData.pecasPredefinidas[editingPecaKey], ...novaPeca };
            showToast(`Peça "${novaPeca.nome}" atualizada! Salve os dados.`);
        } else {
            const key = createKeyFromName(novaPeca.nome);
            if (AppData.pecasPredefinidas[key]) return showToast("Peça já existe.", "error");
            AppData.pecasPredefinidas[key] = novaPeca;
            showToast("Peça adicionada! Salve os dados.", "success");
        }
        saveAppState();
        popularTodosSeletores();
        resetPecaPredefinidaForm();
    });
    getEl("btnCancelarEdicaoPeca").addEventListener("click", resetPecaPredefinidaForm);
    getEl("btnGerarRipado").addEventListener("click", () => {
        const larguraRipa = parseFloat(getEl("ripadoLarguraRipa").value),
            espacamento = parseFloat(getEl("ripadoEspacamento").value);
        if (isNaN(larguraRipa) || isNaN(espacamento) || larguraRipa <= 0 || espacamento < 0) return showToast("Valores inválidos.", "error");
        if (getEl("ripadoIncluirFundo").checked) adicionarNovaPeca({ nome: "Fundo do Painel", qtd: "1", altura: "A", largura: "L", tipoMaterial: "externa", tipoBorda: "externa" });
        adicionarNovaPeca({ nome: "Ripa", qtd: `L / (${larguraRipa} + ${espacamento})`, altura: "A", largura: String(larguraRipa), tipoMaterial: "externa", tipoBorda: "externa", bordaA1: true, bordaA2: true });
        fecharModal("modal-ripado");
        showToast("Peças do painel ripado adicionadas!", "success");
    });
    getEl("btnSalvarModulo").addEventListener("click", salvarModulo);
    getEl("btnAdicionarModulo").addEventListener("click", adicionarModuloAoProjeto);
    getEl("btnAdicionarFerragemExtra").addEventListener("click", adicionarFerragemExtra);

    // --- ATUALIZADO: Evento de remoção de grupo (substitui a lógica anterior) ---
    listaResumo.addEventListener("click", (e) => {
        const target = e.target;

        // Remover item único (Ferragem ou legado)
        if (target.matches(".btn-danger") && target.hasAttribute("data-instance-id")) {
            removerItemDoProjeto(target.dataset.instanceId);
        }

        // Remover GRUPO de módulos
        if (target.matches(".btn-remover-grupo")) {
            const idsString = target.dataset.ids;
            if (idsString) {
                const ids = idsString.split(",");
                const confirmacao = confirm(`Deseja remover todos os ${ids.length} itens deste grupo do projeto?`);

                if (confirmacao) {
                    ids.forEach((id) => removerItemDoProjeto(id));
                }
            }
        }
    });

    getEl("btnGerarListagem").addEventListener("click", gerarListagem);

    // --- NOVA LÓGICA PARA EDITAR PEÇAS ---
    listaPecasTbody.addEventListener("click", (e) => {
        const target = e.target.closest("button");
        if (!target) return;
        const id = target.dataset.id;
        const row = target.closest("tr");

        // Ação de Remover (já existente, mas agora parte deste listener)
        if (target.matches(".btn-remover-peca-final")) {
            listaPecasGerada = listaPecasGerada.filter((p) => p.id !== id);
            renderizarTabelasEOrcamento();
            showToast("Peça removida.", "success");
            return;
        }

        // Ação de Editar
        if (target.matches(".btn-editar-peca-final")) {
            const qtdCell = row.querySelector(".editable-qtd");
            const alturaCell = row.querySelector(".editable-altura");
            const larguraCell = row.querySelector(".editable-largura");
            const acoesCell = row.querySelector(".acoes .botoes-acao");

            // Salva os valores originais em caso de cancelamento
            row.dataset.originalQtd = qtdCell.textContent;
            row.dataset.originalAltura = alturaCell.textContent;
            row.dataset.originalLargura = larguraCell.textContent;

            qtdCell.innerHTML = `<input type="number" class="editable-input" value="${qtdCell.textContent}" />`;
            alturaCell.innerHTML = `<input type="number" class="editable-input" value="${alturaCell.textContent}" />`;
            larguraCell.innerHTML = `<input type="number" class="editable-input" value="${larguraCell.textContent}" />`;

            acoesCell.innerHTML = `
                            <button class="btn-success btn-sm btn-salvar-peca-final" data-id="${id}">Salvar</button>
                            <button class="btn-secondary btn-sm btn-cancelar-edicao-peca" data-id="${id}">Cancelar</button>
                        `;
            return;
        }

        // Ação de Salvar
        if (target.matches(".btn-salvar-peca-final")) {
            const peca = listaPecasGerada.find((p) => p.id === id);
            if (!peca) return;

            const novaQtd = parseFloat(row.querySelector(".editable-qtd input").value);
            const novaAltura = parseFloat(row.querySelector(".editable-altura input").value);
            const novaLargura = parseFloat(row.querySelector(".editable-largura input").value);

            if (isNaN(novaQtd) || isNaN(novaAltura) || isNaN(novaLargura) || novaQtd <= 0 || novaAltura <= 0 || novaLargura <= 0) {
                showToast("Valores inválidos. Verifique os números digitados.", "error");
                return;
            }

            peca.qtd = novaQtd;
            peca.alturaFinal = novaAltura;
            peca.larguraFinal = novaLargura;

            renderizarTabelasEOrcamento(); // Recalcula tudo e redesenha a tabela
            showToast("Peça atualizada e orçamento recalculado!", "success");
            return;
        }

        // Ação de Cancelar
        if (target.matches(".btn-cancelar-edicao-peca")) {
            // Apenas redesenha a tabela com os dados originais do array
            renderizarTabelasEOrcamento();
            return;
        }
    });

    listaFerragensTbody.addEventListener("click", (e) => {
        if (e.target.matches(".btn-remover-ferragem-final")) {
            const ids = e.target.dataset.ids.split(",");
            listaFerragensGerada = listaFerragensGerada.filter((f) => !ids.includes(f.id));
            renderizarTabelasEOrcamento();
            showToast("Ferragem removida.", "success");
        }
    });
    document.addEventListener("click", (e) => {
        if (e.target.matches(".item-preview")) e.target.nextElementSibling.click();
    });

    document.querySelectorAll(".imagem-input").forEach((input) =>
        input.addEventListener("change", async (event) => {
            const file = event.target.files[0];
            const preview = event.target.previousElementSibling;
            const form = event.target.closest(".card") || event.target.closest(".view-body") || event.target.closest(".modal-body");
            if (!file || !form) return;

            const originalSrc = preview.src;
            preview.src =
                "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='40' stroke='%23ccc' stroke-width='10' fill='none'/%3E%3Ccircle cx='50' cy='50' r='40' stroke='%234a3f35' stroke-width='10' fill='none' stroke-dasharray='251.2' stroke-dashoffset='188.4' %3E%3CanimateTransform attributeName='transform' type='rotate' from='0 50 50' to='360 50 50' dur='1s' repeatCount='indefinite'/%3E%3C/circle%3E%3C/svg%3E";

            const imageUrl = await uploadImage(file);

            if (imageUrl) {
                preview.src = imageUrl;
                if (form.querySelector("#nomeModulo")) imagemModuloUrl = imageUrl;
                if (form.querySelector("#novoMaterialNome") || form.querySelector("#novaBordaNome")) currentImageUrl.material = imageUrl;
                if (form.querySelector("#novaFerragemNome")) currentImageUrl.hardware = imageUrl;
                if (form.querySelector("#novoPerfilNome")) currentImageUrl.profile = imageUrl;
            } else {
                preview.src = originalSrc;
            }

            event.target.value = "";
        })
    );

    getEl("btnExportarProducao").addEventListener("click", exportarPDFProducao);
    getEl("btnGerarPreContrato").addEventListener("click", exportarPDFCliente);
    getEl("btnExportarExcel").addEventListener("click", exportarExcel);
    getEl("btnExportarCortcloud").addEventListener("click", exportarParaCortcloud);

    const importarDadosHandler = (event) => {
        const fileInput = event.target;
        const file = fileInput.files[0];
        if (!file) return;
        if (
            !confirm(
                "Tem certeza que deseja importar este arquivo? Todos os dados atuais (não salvos) serão perdidos. Após a importação, você precisará colar o conteúdo do arquivo no HTML para salvar."
            )
        ) {
            fileInput.value = "";
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                // Tenta remover o "window.DADOS_DO_SISTEMA =" se existir, para parsear o JSON
                let content = e.target.result;
                if (content.trim().startsWith("window.DADOS_DO_SISTEMA")) {
                    const firstBrace = content.indexOf("{");
                    if (firstBrace > -1) {
                         content = content.substring(firstBrace);
                    }
                }

                const importedData = JSON.parse(content);
                if (importedData.catalogoModulos || importedData.coresMDF || importedData.catalogoFerragens) {
                    AppData = importedData;
                    saveAppState();
                    showToast("Dados importados! A página será recarregada.", "success");
                    setTimeout(() => window.location.reload(), 1500);
                } else showToast("Arquivo de backup inválido.", "error");
            } catch (err) {
                showToast("Erro ao ler o arquivo.", "error");
                console.error("Erro no JSON:", err);
            } finally {
                fileInput.value = "";
            }
        };
        reader.readAsText(file);
    };
    getEl("importarDadosInput").addEventListener("change", importarDadosHandler);
    getEl("labelImportarDados").addEventListener("click", () => getEl("importarDadosInput").click());

    getEl("btnSalvarConfig").addEventListener("click", () => {
        salvarConfiguracoesDosInputs();
        navigateTo("view-projeto");
    });
    getEl("categoriaModuloSelect").addEventListener("change", (e) => (getEl("novaCategoriaInput").style.display = e.target.value === "_add_new_" ? "block" : "none"));
    getEl("tipoModuloProjeto").addEventListener("change", (e) => {
        const isReto = e.target.value === "reto";
        getEl("dimensoes-container-reto").style.display = isReto ? "block" : "none";
        getEl("dimensoes-container-canto").style.display = isReto ? "none" : "block";
    });
    getEl("moduloTipo").addEventListener("change", (e) => atualizarTodosOsHelpersNoModal(e.target.value));
    ["filtroModulos", "filtroCatalogo", "filtroSelecaoModulo"].forEach((filtroId) => {
        const filtroInput = getEl(filtroId);
        if (!filtroInput) return;

        filtroInput.addEventListener("input", (e) => {
            const termo = e.target.value.toLowerCase();
            let container, items;

            if (filtroId === "filtroModulos") {
                container = getEl("lista-modulos-salvos");
                items = container.querySelectorAll(".catalogo-item");
            } else if (filtroId === "filtroCatalogo") {
                container = getEl("view-gerenciar-catalogos");
                items = container.querySelectorAll(".catalogo-item");
            } else if (filtroId === "filtroSelecaoModulo") {
                container = getEl("grid-selecao-modulos");
                items = container.querySelectorAll(".modulo-selecao-card");
            }

            items.forEach((item) => {
                const filterName = item.dataset.filterName || item.textContent.toLowerCase();
                item.style.display = filterName.includes(termo) ? "" : "none";
            });
        });
    });

    await carregarDados();
    carregarConfiguracoesParaInputs();
    popularTodosSeletores();
    navigateTo("view-projeto");
}

document.addEventListener("DOMContentLoaded", inicializarApp);