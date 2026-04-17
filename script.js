document.addEventListener('DOMContentLoaded', () => {
    // Elementos
    const container = document.getElementById('volumes-container');
    const form = document.getElementById('quotation-form');
    const toast = document.getElementById('toast');
    const botNumber = "5543996117320";

    // Inicialização
    initVolumeContainer();
    setupEventListeners();
    calculateTotals();

    function initVolumeContainer() {
        if (container.children.length === 0) addVolumeItem();
    }

    function setupEventListeners() {
        document.getElementById('add-volume').addEventListener('click', addVolumeItem);

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

        document.getElementById('invoice_value').addEventListener('input', currencyMask);
        document.getElementById('btn-cnpj-d').addEventListener('click', buscarCNPJ);
        document.getElementById('btn-cep-d').addEventListener('click', () => buscarCEP('d'));
        document.getElementById('btn-cep-r').addEventListener('click', () => buscarCEP('r'));
        document.getElementById('btn-generate').addEventListener('click', generateQuotation);
        document.getElementById('btn-reset').addEventListener('click', resetForm);

        document.addEventListener('input', (e) => {
            if (e.target.classList.contains('v-qty') || 
                e.target.classList.contains('v-alt') || 
                e.target.classList.contains('v-larg') || 
                e.target.classList.contains('v-comp') || 
                e.target.classList.contains('v-weight')) {
                calculateTotals();
            }
        });

        document.getElementById('r_document').addEventListener('blur', (e) => {
            e.target.value = formatarDocumento(e.target.value);
        });
        
        document.getElementById('d_document').addEventListener('blur', (e) => {
            e.target.value = formatarDocumento(e.target.value);
        });
    }

    function addVolumeItem() {
        const div = document.createElement('div');
        div.className = 'volume-item';
        div.innerHTML = `
            <div class="form-row">
                <div class="form-group">
                    <label>Qtd</label>
                    <input type="number" class="v-qty" value="1" min="1" required>
                </div>
                <div class="form-group">
                    <label>Alt(cm)</label>
                    <input type="number" class="v-alt" required>
                </div>
                <div class="form-group">
                    <label>Larg(cm)</label>
                    <input type="number" class="v-larg" required>
                </div>
                <div class="form-group">
                    <label>Comp(cm)</label>
                    <input type="number" class="v-comp" required>
                </div>
                <div class="form-group">
                    <label>Peso(kg)</label>
                    <input type="number" class="v-weight" step="0.01" required>
                </div>
                <button type="button" class="btn-remove">×</button>
            </div>`;
        container.appendChild(div);
        calculateTotals();
        showToast('Volume adicionado', 'success');
    }

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

    function currencyMask(e) {
        let v = e.target.value.replace(/\D/g, '');
        if (v === '') { e.target.value = ''; return; }
        v = (parseInt(v) / 100).toFixed(2);
        v = v.replace('.', ',');
        v = v.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
        e.target.value = v;
    }

    function formatarDocumento(texto) {
        const numeros = texto.replace(/\D/g, '');
        if (numeros.length === 11) {
            return numeros.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
        } else if (numeros.length === 14) {
            return numeros.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
        }
        return texto;
    }

    function limparNumero(texto) {
        return texto ? texto.replace(/\D/g, '') : '';
    }

    async function buscarCNPJ() {
        const input = document.getElementById('d_document');
        const documento = limparNumero(input.value);
        
        if (documento.length !== 14) {
            showToast('Digite um CNPJ válido com 14 números', 'error');
            return;
        }

        showLoading('btn-cnpj-d');
        
        try {
            const response = await fetch(`https://open.cnpja.com/office/${documento}`);
            if (!response.ok) throw new Error();
            const data = await response.json();
            
            if (data.company) {
                preencherCamposCNPJ({
                    nome: data.company.name,
                    cep: data.address?.zip || '',
                    rua: data.address?.street || '',
                    bairro: data.address?.district || '',
                    cidade: data.address?.city || '',
                    uf: data.address?.state || '',
                    numero: data.address?.number || ''
                });
                showToast('Dados carregados', 'success');
                hideLoading('btn-cnpj-d');
                return;
            }
            throw new Error();
        } catch (e) {
            try {
                const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${documento}`);
                if (!response.ok) throw new Error();
                const data = await response.json();
                preencherCamposCNPJ({
                    nome: data.razao_social,
                    cep: data.cep,
                    rua: data.logradouro,
                    bairro: data.bairro,
                    cidade: data.municipio,
                    uf: data.uf,
                    numero: data.numero
                });
                showToast('Dados carregados (Base 2)', 'success');
            } catch (e2) {
                showToast('CNPJ não encontrado', 'error');
            }
        } finally {
            hideLoading('btn-cnpj-d');
        }
    }

    function preencherCamposCNPJ(dados) {
        document.getElementById('d_name').value = dados.nome || '';
        document.getElementById('d_cep').value = dados.cep || '';
        document.getElementById('d_street').value = dados.rua || '';
        document.getElementById('d_district').value = dados.bairro || '';
        document.getElementById('d_city').value = dados.cidade || '';
        document.getElementById('d_uf').value = dados.uf || '';
        document.getElementById('d_number').value = dados.numero || '';
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

    function generateQuotation() {
        if (!form.checkValidity()) {
            form.reportValidity();
            showToast('Preencha todos os campos obrigatórios', 'error');
            return;
        }

        try {
            // Monta a lista de medidas
            const medidasArray = [];
            document.querySelectorAll('.volume-item').forEach(item => {
                const q = item.querySelector('.v-qty').value;
                const a = item.querySelector('.v-alt').value;
                const l = item.querySelector('.v-larg').value;
                const c = item.querySelector('.v-comp').value;
                const w = item.querySelector('.v-weight').value;
                medidasArray.push(`${q} Vol - ${a}x${l}x${c} - ${w}kg`);
            });

            // Objeto EXATAMENTE no formato solicitado
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
                medidas: medidasArray.join('\n'),
                possui_nf: document.getElementById('has_invoice').value
            };

            // Formato exato: CÓDIGO DE FRETE QG - {"json aqui"}
            const msg = `CÓDIGO DE FRETE QG - ${JSON.stringify(dadosFrete)}`;
            const wpUrl = `https://wa.me/${botNumber}?text=${encodeURIComponent(msg)}`;
            window.open(wpUrl, '_blank');
            
        } catch (error) {
            console.error(error);
            showToast('Erro ao gerar dados', 'error');
        }
    }

    function resetForm() {
        if (confirm('Deseja limpar todos os campos?')) {
            form.reset();
            container.innerHTML = '';
            addVolumeItem();
            calculateTotals();
            showToast('Formulário limpo', 'success');
        }
    }

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
        if (element) element.classList.add('loading');
    }

    function hideLoading(elementId) {
        const element = document.getElementById(elementId);
        if (element) element.classList.remove('loading');
    }
});