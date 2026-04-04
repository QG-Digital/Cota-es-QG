document.addEventListener('DOMContentLoaded', () => {
    // ========== ELEMENTOS DO DOM ==========
    const urlParams = new URLSearchParams(window.location.search);
    const container = document.getElementById('volumes-container');
    const form = document.getElementById('quotation-form');
    const toast = document.getElementById('toast');

    // ========== CONFIGURAÇÕES ==========
    const botNumber = "5543996117320";

    // ========== INICIALIZAÇÃO ==========
    initVolumeContainer();
    setupEventListeners();
    prefillFromUrl();
    calculateTotals();

    // ========== FUNÇÕES UTILITÁRIAS DE LIMPEZA ==========
    
    function limparNumero(texto) {
        if (!texto) return '';
        return texto.replace(/\D/g, '');
    }

    function limparCPFCNPJ(texto) {
        const numeros = limparNumero(texto);
        // CPF tem 11 dígitos, CNPJ tem 14
        if (numeros.length === 11) {
            return numeros; // CPF
        } else if (numeros.length === 14) {
            return numeros; // CNPJ
        } else {
            return numeros; // Retorna o que tiver, mas vai dar erro depois
        }
    }

    function formatarDocumento(texto) {
        const numeros = limparNumero(texto);
        if (numeros.length === 11) {
            return numeros.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
        } else if (numeros.length === 14) {
            return numeros.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
        }
        return texto;
    }

    // ========== SETUP INICIAL ==========
    
    function initVolumeContainer() {
        if (container.children.length === 0) {
            addVolumeItem();
        }
    }

    function setupEventListeners() {
        // Botão de adicionar volume
        document.getElementById('add-volume').addEventListener('click', addVolumeItem);

        // Remover volume
        container.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-remove')) {
                if (document.querySelectorAll('.volume-item').length > 1) {
                    e.target.closest('.volume-item').remove();
                    calculateTotals();
                    showToast('Volume removido', 'warning');
                } else {
                    showToast('É necessário pelo menos 1 volume', 'error');
                }
            }
        });

        // Máscara de moeda
        document.getElementById('invoice_value').addEventListener('input', currencyMask);

        // Buscas de CNPJ e CEP
        document.getElementById('btn-cnpj-d').addEventListener('click', buscarCNPJ);
        document.getElementById('btn-cep-d').addEventListener('click', () => buscarCEP('d'));
        document.getElementById('btn-cep-r').addEventListener('click', () => buscarCEP('r'));

        // Botão gerar cotação
        document.getElementById('btn-generate').addEventListener('click', generateQuotation);

        // Botão reset
        document.getElementById('btn-reset').addEventListener('click', resetForm);

        // Auto-cálculo quando digita nos volumes
        document.addEventListener('input', (e) => {
            if (e.target.classList.contains('v-qty') || 
                e.target.classList.contains('v-alt') || 
                e.target.classList.contains('v-larg') || 
                e.target.classList.contains('v-comp') || 
                e.target.classList.contains('v-weight')) {
                calculateTotals();
            }
        });

        // Máscara automática para campos de documento
        document.getElementById('r_document').addEventListener('blur', (e) => {
            e.target.value = formatarDocumento(e.target.value);
        });
        
        document.getElementById('d_document').addEventListener('blur', (e) => {
            e.target.value = formatarDocumento(e.target.value);
        });
    }

    // ========== GESTÃO DE VOLUMES ==========
    
    function addVolumeItem() {
        const div = document.createElement('div');
        div.className = 'volume-item';
        div.innerHTML = `
            <div class="form-row">
                <div class="form-group mini-group">
                    <label>Qtd</label>
                    <input type="number" class="v-qty" value="1" min="1" required>
                </div>
                <div class="form-group mini-group">
                    <label>Alt(cm)</label>
                    <input type="number" class="v-alt" required>
                </div>
                <div class="form-group mini-group">
                    <label>Larg(cm)</label>
                    <input type="number" class="v-larg" required>
                </div>
                <div class="form-group mini-group">
                    <label>Comp(cm)</label>
                    <input type="number" class="v-comp" required>
                </div>
                <div class="form-group mini-group">
                    <label>Peso(kg)</label>
                    <input type="number" class="v-weight" step="0.01" required>
                </div>
                <button type="button" class="btn-remove">×</button>
            </div>`;
        container.appendChild(div);
        calculateTotals();
        showToast('Volume adicionado', 'success');
    }

    // ========== CÁLCULOS ==========
    
    function calculateTotals() {
        let totalQty = 0, totalWeight = 0, totalCubic = 0;
        
        document.querySelectorAll('.volume-item').forEach(item => {
            const q = parseFloat(item.querySelector('.v-qty').value) || 0;
            const a = parseFloat(item.querySelector('.v-alt').value) || 0;
            const l = parseFloat(item.querySelector('.v-larg').value) || 0;
            const c = parseFloat(item.querySelector('.v-comp').value) || 0;
            const w = parseFloat(item.querySelector('.v-weight').value) || 0;

            totalQty += q;
            totalWeight += (w * q);
            totalCubic += ((a * l * c) / 1000000) * q;
        });

        document.getElementById('res-qty').innerText = totalQty;
        document.getElementById('res-weight').innerText = totalWeight.toFixed(2);
        document.getElementById('res-cubic').innerText = totalCubic.toFixed(3);
    }

    // ========== MÁSCARAS ==========
    
    function currencyMask(e) {
        let v = e.target.value.replace(/\D/g, '');
        if (v === '') {
            e.target.value = '';
            return;
        }
        v = (parseInt(v) / 100).toFixed(2);
        v = v.replace('.', ',');
        v = v.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
        e.target.value = v;
    }

    // ========== BUSCAS DE API ==========
    
    async function buscarCNPJ() {
        const input = document.getElementById('d_document');
        const documento = limparNumero(input.value);
        
        // Verifica se é CNPJ (14 dígitos)
        if (documento.length !== 14) {
            showToast('Digite um CNPJ válido com 14 números', 'error');
            return;
        }

        showLoading('btn-cnpj-d');
        
        try {
            const response = await fetch(`https://open.cnpja.com/office/${documento}`);
            const data = await response.json();
            
            if (data.company) {
                document.getElementById('d_name').value = data.company.name;
                document.getElementById('d_cep').value = data.address.zip;
                document.getElementById('d_street').value = data.address.street;
                document.getElementById('d_district').value = data.address.district;
                document.getElementById('d_city').value = data.address.city;
                document.getElementById('d_uf').value = data.address.state;
                document.getElementById('d_number').value = data.address.number;
                
                showToast('Dados carregados com sucesso!', 'success');
            } else {
                showToast('CNPJ não encontrado', 'error');
            }
        } catch (e) {
            showToast('Erro ao buscar CNPJ', 'error');
        } finally {
            hideLoading('btn-cnpj-d');
        }
    }

    async function buscarCEP(prefix) {
        const cepInput = document.getElementById(`${prefix}_cep`);
        const cep = limparNumero(cepInput.value);
        
        if (cep.length !== 8) {
            showToast('CEP deve ter 8 números', 'error');
            return;
        }

        showLoading(`btn-cep-${prefix}`);
        
        try {
            const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
            const data = await response.json();
            
            if (!data.erro) {
                document.getElementById(`${prefix}_street`).value = data.logradouro || '';
                document.getElementById(`${prefix}_district`).value = data.bairro || '';
                document.getElementById(`${prefix}_city`).value = data.localidade || '';
                document.getElementById(`${prefix}_uf`).value = data.uf || '';
                
                showToast('Endereço encontrado!', 'success');
            } else {
                showToast('CEP não encontrado', 'error');
            }
        } catch (e) {
            showToast('Erro ao buscar CEP', 'error');
        } finally {
            hideLoading(`btn-cep-${prefix}`);
        }
    }

    // ========== PREENCHIMENTO VIA URL ==========
    
    function prefillFromUrl() {
        const mapParams = {
            'r_document': 'r_document',
            'r_name': 'r_name', 
            'r_cep': 'r_cep',
            'r_street': 'r_street', 
            'r_number': 'r_number',
            'r_district': 'r_district', 
            'r_city': 'r_city', 
            'r_uf': 'r_uf'
        };
        
        for (const [param, id] of Object.entries(mapParams)) {
            if (urlParams.has(param)) {
                document.getElementById(id).value = urlParams.get(param);
            }
        }
    }

    // ========== GERAÇÃO DA MENSAGEM ==========
    
	function generateQuotation() {
		if (!form.checkValidity()) {
			form.reportValidity();
			showToast('Preencha todos os campos obrigatórios', 'error');
			return;
		}

		try {
			// Coleta as medidas em um array para ficar organizado
			let listaMedidas = [];
			document.querySelectorAll('.volume-item').forEach(item => {
				const q = item.querySelector('.v-qty').value;
				const a = item.querySelector('.v-alt').value;
				const l = item.querySelector('.v-larg').value;
				const c = item.querySelector('.v-comp').value;
				const w = item.querySelector('.v-weight').value;
				listaMedidas.push(`${q} Vol - ${a}x${l}x${c} - ${w}kg`);
			});

			// Monta o objeto de dados puro
			const dadosFrete = {
				orcamento: document.getElementById('budget_number').value || 'S/N',
				cnpj_rem: limparNumero(document.getElementById('r_document').value),
				cep_col: limparNumero(document.getElementById('r_cep').value),
				rua_col: document.getElementById('r_street').value,
				num_col: document.getElementById('r_number').value,
				bairro_col: document.getElementById('r_district').value,
				cidade_col: document.getElementById('r_city').value,
				uf_col: document.getElementById('r_uf').value.toUpperCase(),
				
				cnpj_dest: limparNumero(document.getElementById('d_document').value),
				nome_dest: document.getElementById('d_name').value,
				cep_ent: limparNumero(document.getElementById('d_cep').value),
				rua_ent: document.getElementById('d_street').value,
				num_ent: document.getElementById('d_number').value,
				bairro_ent: document.getElementById('d_district').value,
				cidade_ent: document.getElementById('d_city').value,
				uf_ent: document.getElementById('d_uf').value.toUpperCase(),
				comp_ent: document.getElementById('d_complement').value || 'Nenhum',
				
				pagador: document.getElementById('freight_payer').value,
				mercadoria: document.getElementById('merchandise_type').value,
				qtd: document.getElementById('res-qty').innerText,
				peso: document.getElementById('res-weight').innerText,
				cubagem: document.getElementById('res-cubic').innerText,
				valor_nf: document.getElementById('invoice_value').value,
				medidas: listaMedidas.join('\n'),
				possui_nf: document.getElementById('has_invoice').value
			};

			// Cria a mensagem com o prefixo identificador
			const msg = `CÓDIGO DE FRETE QG - ${JSON.stringify(dadosFrete)}`;

			const wpUrl = `https://wa.me/${botNumber}?text=${encodeURIComponent(msg)}`;
			window.open(wpUrl, '_blank');
			
		} catch (error) {
			console.error(error);
			showToast('Erro ao gerar dados', 'error');
		}
	}

    // ========== RESET ==========
    
    function resetForm() {
        if (confirm('Deseja limpar todos os campos?')) {
            form.reset();
            container.innerHTML = '';
            addVolumeItem();
            calculateTotals();
            showToast('Formulário limpo', 'success');
        }
    }

    // ========== UTILITÁRIOS DE UI ==========
    
    function showToast(message, type = 'info') {
        toast.textContent = message;
        toast.className = `toast toast-${type}`;
        toast.style.display = 'block';
        
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => {
                toast.style.display = 'none';
                toast.style.opacity = '1';
            }, 300);
        }, 3000);
    }

    function showLoading(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.classList.add('loading');
        }
    }

    function hideLoading(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.classList.remove('loading');
        }
    }
});