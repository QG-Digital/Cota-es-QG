document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const container = document.getElementById('volumes-container');
    
    // --- 1. PREENCHIMENTO AUTOMÁTICO VIA URL ---
    // Mapeia os parâmetros da URL para os IDs dos campos do remetente
    const mapParams = {
        'r_cnpj': 'r_cnpj',
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

    // --- 2. LÓGICA DE ADICIONAR/REMOVER VOLUMES ---
    document.getElementById('add-volume').addEventListener('click', () => {
        const div = document.createElement('div');
        div.className = 'volume-item';
        div.innerHTML = `
            <div class="form-row">
                <div class="form-group mini"><label>Qtd</label><input type="number" class="v-qty" value="1"></div>
                <div class="form-group mini"><label>Alt(cm)</label><input type="number" class="v-alt"></div>
                <div class="form-group mini"><label>Larg(cm)</label><input type="number" class="v-larg"></div>
                <div class="form-group mini"><label>Comp(cm)</label><input type="number" class="v-comp"></div>
                <div class="form-group mini"><label>Peso(kg)</label><input type="number" class="v-weight" step="0.01"></div>
                <button type="button" class="btn-remove">×</button>
            </div>`;
        container.appendChild(div);
        attachCalcEvents();
    });

    container.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-remove')) {
            if (document.querySelectorAll('.volume-item').length > 1) {
                e.target.closest('.volume-item').remove();
                calculateTotals();
            }
        }
    });

    // --- 3. CÁLCULOS TOTAIS ---
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

    function attachCalcEvents() {
        document.querySelectorAll('input').forEach(input => {
            input.addEventListener('input', calculateTotals);
        });
    }
    attachCalcEvents();

    // --- 4. BUSCA DE CNPJ (DESTINATÁRIO) ---
    document.getElementById('btn-cnpj-d').addEventListener('click', async () => {
        const cnpj = document.getElementById('d_cnpj').value.replace(/\D/g, '');
        if (cnpj.length !== 14) return alert("CNPJ Inválido para consulta automática.");
        
        try {
            const response = await fetch(`https://open.cnpja.com/office/${cnpj}`);
            const data = await response.json();
            if (data.company) {
                document.getElementById('d_name').value = data.company.name;
                document.getElementById('d_cep').value = data.address.zip;
                document.getElementById('d_street').value = data.address.street;
                document.getElementById('d_district').value = data.address.district;
                document.getElementById('d_city').value = data.address.city;
                document.getElementById('d_uf').value = data.address.state;
                document.getElementById('d_number').value = data.address.number;
            }
        } catch (e) { alert("Erro ao buscar CNPJ. Verifique a conexão."); }
    });

    // --- 5. BUSCA DE CEP (DESTINATÁRIO) ---
    document.getElementById('btn-cep-d').addEventListener('click', async () => {
        const cep = document.getElementById('d_cep').value.replace(/\D/g, '');
        if (cep.length !== 8) return alert("CEP Inválido");
        try {
            const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
            const data = await response.json();
            if (!data.erro) {
                document.getElementById('d_street').value = data.logradouro;
                document.getElementById('d_district').value = data.bairro;
                document.getElementById('d_city').value = data.localidade;
                document.getElementById('d_uf').value = data.uf;
            }
        } catch (e) { alert("Erro ao buscar CEP."); }
    });

    // --- 6. GERAÇÃO DA MENSAGEM DO WHATSAPP ---
    document.getElementById('btn-generate').addEventListener('click', () => {
        const botNumber = "5543999999999"; // <--- COLOQUE O NÚMERO DO SEU BOT AQUI
        
        let volumesTexto = "";
        document.querySelectorAll('.volume-item').forEach(item => {
            const q = item.querySelector('.v-qty').value;
            const a = item.querySelector('.v-alt').value;
            const l = item.querySelector('.v-larg').value;
            const c = item.querySelector('.v-comp').value;
            volumesTexto += `${q} Vol - ${a} x ${l} x ${c} cm\n`;
        });

        const msg = `CNPJ remetente: ${document.getElementById('r_cnpj').value}
Cep de Coleta: ${document.getElementById('r_cep').value}
Endereço: ${document.getElementById('r_street').value}, Nº ${document.getElementById('r_number').value}, ${document.getElementById('r_district').value}

CNPJ Destinatário: ${document.getElementById('d_cnpj').value}
Nome Destinatário: ${document.getElementById('d_name').value}
Cep entrega: ${document.getElementById('d_cep').value}
Endereço de Entrega: ${document.getElementById('d_street').value}, Nº ${document.getElementById('d_number').value}, ${document.getElementById('d_district').value}
Cidade/UF: ${document.getElementById('d_city').value} / ${document.getElementById('d_uf').value}
Complemento: ${document.getElementById('d_complement').value || 'Nenhum'}

Pagador do frete: ${document.getElementById('freight_payer').value}
Tipo de Mercadoria: ${document.getElementById('merchandise_type').value}
Número do Orçamento: ${document.getElementById('budget_number').value}
Quantidade de volumes: ${document.getElementById('res-qty').innerText}
Peso Total: ${document.getElementById('res-weight').innerText} Kg
Cubagem Total: ${document.getElementById('res-cubic').innerText} m³
Valor total da NF: ${document.getElementById('invoice_value').value}
Medidas:
${volumesTexto}
(Possui NF: ${document.getElementById('has_invoice').value})`;

        const wpUrl = `https://wa.me/${botNumber}?text=${encodeURIComponent(msg)}`;
        window.open(wpUrl, '_blank');
    });

    document.getElementById('btn-reset').addEventListener('click', () => {
        if(confirm("Deseja limpar todos os campos da cotação?")) location.reload();
    });
});