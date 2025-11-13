import express, { type Request, type Response } from 'express';
import { db } from './config/firebase.js'; // Importa nossa instância do DB
import { Query, FieldValue } from 'firebase-admin/firestore';
import cors from 'cors';


// --- TIPOS ---
type Cliente = {
  id: string;
  nome: string;
  telefone?: string;
  endereco: string;
  bairro: string;
  criado_em: any;
};

// --- CONFIGURAÇÃO DO SERVIDOR ---
const app = express();
app.use(express.json());
app.use(cors());
const PORT = 3001;

// --- ROTA RAÍZ ---
app.get('/', (req: Request, res: Response) => {
  res.send('<h1>Backend do Sistema de Logística - Conectado ao Firestore!</h1>');
});


/**
 * Tenta encontrar e atribuir o melhor motorista para um novo pedido.
 * Esta é a implementação do teu algoritmo de 5 passos.
 */
async function tentarAtribuirRotaAutomatica(pedidoId: string, clienteId: string, cargaPedido: number) {
  console.log(`ALGORITMO: Iniciando busca de motorista para Pedido ${pedidoId} (Carga: ${cargaPedido})`);

  try {
    // 1. LER O BAIRRO DO CLIENTE
    const clienteDoc = await db.collection('clientes').doc(clienteId).get();
    if (!clienteDoc.exists) {
      console.log(`ALGORITMO: Cliente ${clienteId} não encontrado. Atribuição cancelada.`);
      return;
    }
    const bairro = clienteDoc.data()?.bairro;
    if (!bairro) {
      console.log(`ALGORITMO: Cliente ${clienteId} não tem bairro. Atribuição cancelada.`);
      return;
    }
    console.log(`ALGORITMO: Bairro do pedido é "${bairro}".`);


    // 2. ENCONTRAR CANDIDATOS (Status e Bairro)
    const motoristasRef = db.collection('motoristas');
    const q = motoristasRef
      .where('status', '==', 'disponivel')
      .where('bairros_atendidos', 'array-contains', bairro);

    const snapshot = await q.get();
    if (snapshot.empty) {
      console.log(`ALGORITMO: Nenhum motorista 'disponivel' atende este bairro.`);
      return;
    }

    // 3. FILTRAR POR CAPACIDADE (Regra: 20 caixas)
    const candidatos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
    
    const candidatosComCapacidade = candidatos.filter(m => 
      (m.carga_atual_caixas + cargaPedido) <= m.capacidade_maxima_caixas
    );

    if (candidatosComCapacidade.length === 0) {
      console.log(`ALGORITMO: Motoristas encontrados, mas sem capacidade para ${cargaPedido} caixas.`);
      return;
    }

    // 4. LÓGICA DE DESEMPATE
    let motoristaVencedor;
    let motivo: string;

    if (candidatosComCapacidade.length === 1) {
      // 4a. Apenas 1 candidato
      motoristaVencedor = candidatosComCapacidade[0];
      motivo = "candidato_unico";
      console.log(`ALGORITMO: Apenas 1 candidato encontrado: ${motoristaVencedor.nome}.`);

    } else {
      // 4b. Vários candidatos? Desempate
      console.log(`ALGORITMO: ${candidatosComCapacidade.length} candidatos encontrados. Aplicando regras de desempate...`);

      candidatosComCapacidade.sort((a, b) => {
        // Regra 1: Menor Carga (quem tem menos caixas)
        if (a.carga_atual_caixas !== b.carga_atual_caixas) {
          return a.carga_atual_caixas - b.carga_atual_caixas;
        }

        // Regra 2: Rodízio (quem foi atribuído há mais tempo)
        // (Tratamos 'null' como a data mais antiga)
        const timeA = a.ultima_atribuicao_em ? a.ultima_atribuicao_em.toMillis() : 0;
        const timeB = b.ultima_atribuicao_em ? b.ultima_atribuicao_em.toMillis() : 0;
        return timeA - timeB;
      });

      motoristaVencedor = candidatosComCapacidade[0];
      motivo = "desempate_carga_rodizio";
      console.log(`ALGORITMO: Vencedor do desempate: ${motoristaVencedor.nome} (Carga: ${motoristaVencedor.carga_atual_caixas})`);
    }

    // 5. REGISTRAR ATRIBUIÇÃO (usando um Batch para garantir)
    const batch = db.batch();
    const agora = new Date(); // Horário da atribuição

    // 5a. Atualiza o PEDIDO
    const pedidoRef = db.collection('pedidos').doc(pedidoId);
    batch.update(pedidoRef, {
      motorista_id: motoristaVencedor.id,
      atribuicao_motivo: motivo,
      atribuicao_horario: agora
    });

    // 5b. Atualiza o MOTORISTA
    const motoristaRef = db.collection('motoristas').doc(motoristaVencedor.id);
    batch.update(motoristaRef, {
      carga_atual_caixas: FieldValue.increment(cargaPedido),
      carga_atual_pedidos: FieldValue.increment(1),
      ultima_atribuicao_em: agora
      // NOTA: O status SÓ MUDA para 'em_rota' quando ele der a SAÍDA.
    });

    await batch.commit();
    console.log(`ALGORITMO: SUCESSO! Pedido ${pedidoId} atribuído ao motorista ${motoristaVencedor.nome}.`);

  } catch (error) {
    console.error(`ALGORITMO: ERRO CRÍTICO ao processar pedido ${pedidoId}:`, error);
    // Não paramos a criação do pedido, apenas logamos o erro.
  }
}

// --- ENDPOINTS DE PEDIDOS ---

/**
 * Endpoint para BUSCAR pedidos (com paginação e filtros).
 */
app.get('/api/pedidos', async (req: Request, res: Response) => {
  try {
    // Parâmetros da URL
    const pagina = parseInt(req.query.pagina as string);
    const limite = parseInt(req.query.limite as string);
    const status = req.query.status_entrega as string;
    const ordenarPor = req.query.ordenarPor as string || 'criado_em';
    const direcao = req.query.direcao as 'asc' | 'desc' || 'desc';

    const colecaoPedidos = db.collection('pedidos');
    
    // Lógica de filtro
    let queryBase: Query = colecaoPedidos;
    if (status && status !== 'todos') {
      queryBase = queryBase.where('status_entrega', '==', status);
    }

    // Lógica de contagem
    const totalSnapshot = await queryBase.get();
    const totalPedidos = totalSnapshot.size;

    // Lógica de paginação e ordenação
    let dadosQuery: Query = queryBase.orderBy(ordenarPor, direcao);
    if (pagina && limite) {
      dadosQuery = dadosQuery.limit(limite).offset((pagina - 1) * limite);
    }

    // Busca os dados
    const snapshot = await dadosQuery.get();
    const pedidos = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        criado_em: data.criado_em.toDate().toISOString(),
      };
    });

    // Envia a resposta de LISTAGEM
    res.status(200).json({
      dados: pedidos,
      total: totalPedidos
    });
    
  } catch (error) {
    console.error("Erro ao buscar pedidos:", error);
    res.status(500).json({ message: 'Erro interno no servidor ao buscar pedidos.' });
  }
});
app.post('/api/pedidos', async (req: Request, res: Response) => {
  try {
    const pedidoData = req.body;

    // 1. Validação (exemplo)
    const { clienteId, valor, status_pagamento, quantidade_caixas, tem_fardo } = pedidoData;
    if (!clienteId || !valor || !status_pagamento || quantidade_caixas === undefined || tem_fardo === undefined) {
      return res.status(400).json({ message: 'Erro de validação. Campos obrigatórios ausentes.' });
    }

    // 2. Estrutura o novo pedido
    const novoPedido = {
      clienteId,
      valor,
      status_pagamento,
      quantidade_caixas,
      tem_fardo,
      status_entrega: 'preparado',
      criado_em: new Date(),
      motorista_id: null
      // ... (outros campos)
    };

    // 3. Adiciona o pedido ao banco
    const docRef = await db.collection('pedidos').add(novoPedido);

    // 4. CHAMA O ALGORITMO
    // Tenta atribuir um motorista automaticamente
    await tentarAtribuirRotaAutomatica(docRef.id, novoPedido.clienteId, novoPedido.quantidade_caixas);

    console.log(`Pedido ${docRef.id} criado para o cliente ${novoPedido.clienteId}.`);

    // 5. Envia a resposta de CRIAÇÃO
    res.status(201).json({
      message: 'Pedido criado com sucesso!',
      pedidoId: docRef.id
    });

  } catch (error) {
    console.error("Erro ao salvar pedido no Firestore:", error);
    res.status(500).json({ message: 'Erro interno no servidor ao salvar o pedido.' });
  }
});

/**
 * Endpoint para BUSCAR um pedido específico pelo ID.
 */
app.get('/api/pedidos/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ message: 'O ID do pedido é obrigatório.' });
    }

    const pedidoRef = db.collection('pedidos').doc(id);
    const doc = await pedidoRef.get();

    if (!doc.exists) {
      return res.status(404).json({ message: 'Pedido não encontrado.' });
    }

    const data = doc.data();
    if (!data) {
      return res.status(500).json({ message: 'Não foi possível ler os dados do documento.' });
    }

    res.status(200).json({
      id: doc.id,
      ...data,
      criado_em: (data.criado_em && typeof data.criado_em.toDate === 'function')
                  ? data.criado_em.toDate().toISOString()
                  : data.criado_em
    });

  } catch (error) {
    console.error("Erro ao buscar pedido:", error);
    res.status(500).json({ message: 'Erro ao buscar pedido.' });
  }
});

/**
 * Endpoint para ATUALIZAR um pedido existente.
 */
app.put('/api/pedidos/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const pedidoData = req.body; 

    if (!id) {
      return res.status(400).json({ message: 'O ID do pedido é obrigatório.' });
    }

    delete pedidoData.id;
    delete pedidoData.criado_em; 
    delete pedidoData.clienteId; 
    delete pedidoData.nomeCliente; 
    delete pedidoData.enderecoCliente;

    const pedidoRef = db.collection('pedidos').doc(id);
    await pedidoRef.update(pedidoData);

    console.log(`Pedido ${id} atualizado com sucesso.`);
    res.status(200).json({ message: `Pedido ${id} atualizado com sucesso.` });

  } catch (error) {
    console.error("Erro ao atualizar pedido:", error);
    res.status(500).json({ message: 'Erro ao atualizar pedido.' });
  }
});

/**
 * Endpoint para CANCELAR um pedido.
 * Esta é a rota que estava a falhar (404), agora no sítio certo.
 */
app.post('/api/pedidos/cancelar', async (req: Request, res: Response) => {
  try {
    const { pedidoId } = req.body;

    if (!pedidoId) {
      return res.status(400).json({ message: 'O pedidoId é obrigatório.' });
    }

    const pedidoRef = db.collection('pedidos').doc(pedidoId);
    const doc = await pedidoRef.get();

    if (!doc.exists) {
      return res.status(404).json({ message: 'Pedido não encontrado.' });
    }

    const statusAtual = doc.data()?.status_entrega;
    if (statusAtual === 'entregue') {
       return res.status(409).json({ message: 'Não é possível cancelar um pedido que já foi entregue.' });
    }
    if (statusAtual === 'cancelado') {
        return res.status(409).json({ message: 'Este pedido já está cancelado.' });
     }

    await pedidoRef.update({
      status_entrega: 'cancelado',
      horario_cancelamento: new Date()
    });

    console.log(`Pedido ${pedidoId} cancelado com sucesso.`);
    res.status(200).json({ message: `Pedido ${pedidoId} cancelado com sucesso.` });

  } catch (error) {
    console.error("Erro ao cancelar o pedido:", error);
    res.status(500).json({ message: 'Erro interno no servidor ao cancelar o pedido.' });
  }
});


// --- ENDPOINTS DE ENTREGA ---

// Substitui a tua rota /api/entrega/retirada por esta:
app.post('/api/entrega/retirada', async (req: Request, res: Response) => {
  try {
    const { pedidoId } = req.body; // Não precisamos mais do motoristaId aqui

    if (!pedidoId) {
      return res.status(400).json({ message: 'pedidoId é obrigatório.' });
    }

    const pedidoRef = db.collection('pedidos').doc(pedidoId);
    const doc = await pedidoRef.get();

    if (!doc.exists) {
      return res.status(404).json({ message: 'Pedido não encontrado.' });
    }

    const dadosPedido = doc.data();

    if (dadosPedido?.status_entrega !== 'preparado') {
      return res.status(409).json({ message: 'Este pedido não está com o status "preparado".' });
    }

    // REGRA DE NEGÓCIO: Só pode sair se o algoritmo já atribuiu um motorista
    const motoristaId = dadosPedido?.motorista_id;
    if (!motoristaId) {
        return res.status(409).json({ message: 'Pedido ainda não tem um motorista atribuído. Aguarde o algoritmo.' });
    }

    // --- Atualização com Batch ---
    const batch = db.batch();

    // 1. Atualiza o Pedido
    batch.update(pedidoRef, {
      status_entrega: 'saiu',
      horario_saida: new Date()
    });

    // 2. Atualiza o Status do Motorista
    const motoristaRef = db.collection('motoristas').doc(motoristaId);
    batch.update(motoristaRef, {
      status: 'em_rota'
    });
    
    await batch.commit();
    // --- Fim da Atualização ---

    console.log(`Pedido ${pedidoId} saiu para entrega (Motorista: ${motoristaId}).`);
    res.status(200).json({ message: `Pedido ${pedidoId} saiu para entrega.` });

  } catch (error) {
    console.error("Erro ao atualizar o pedido:", error);
    res.status(500).json({ message: 'Erro interno no servidor ao atualizar o pedido.' });
  }
});

// Substitui a tua rota /api/entrega/concluir por esta:
app.post('/api/entrega/concluir', async (req: Request, res: Response) => {
  try {
    const { pedidoId, valor_pago, forma_pagamento } = req.body;

    if (!pedidoId) {
      return res.status(400).json({ message: 'O pedidoId é obrigatório.' });
    }

    // 1. Busca o Pedido
    const pedidoRef = db.collection('pedidos').doc(pedidoId);
    const docPedido = await pedidoRef.get();

    if (!docPedido.exists) {
      return res.status(404).json({ message: 'Pedido não encontrado.' });
    }

    const dadosPedido = docPedido.data();
    if (dadosPedido?.status_entrega !== 'saiu') {
      return res.status(409).json({ message: 'Este pedido não está com o status "saiu".' });
    }

    // --- Lógica de Atualização (Batch) ---
    const batch = db.batch();

    // 2. Atualiza o Pedido (marca como 'entregue')
    const dadosAtualizacaoPedido: { [key: string]: any } = {
      status_entrega: 'entregue',
      horario_entrega: new Date()
    };
    if (valor_pago && forma_pagamento) {
      dadosAtualizacaoPedido.valor_pago = valor_pago;
      dadosAtualizacaoPedido.forma_pagamento = forma_pagamento;
    }
    batch.update(pedidoRef, dadosAtualizacaoPedido);


    // 3. ATUALIZA O MOTORISTA (Lógica Corrigida)
    const motoristaId = dadosPedido?.motorista_id;
    const cargaPedido = dadosPedido?.quantidade_caixas || 0;

    if (motoristaId) {
      const motoristaRef = db.collection('motoristas').doc(motoristaId);
      
      // Busca os dados ATUAIS do motorista
      const docMotorista = await motoristaRef.get();
      
      if (docMotorista.exists) {
        const dadosMotorista = docMotorista.data();
        const cargaAtualPedidos = dadosMotorista?.carga_atual_pedidos || 0;

        // Prepara a atualização do motorista
        const dadosAtualizacaoMotorista: { [key: string]: any } = {
          carga_atual_caixas: FieldValue.increment(-cargaPedido),
          carga_atual_pedidos: FieldValue.increment(-1)
        };

        // ESTA É A NOVA LÓGICA:
        // Se esta for a ÚLTIMA entrega (carga == 1), volta para 'disponivel'.
        // Caso contrário, ele continua 'em_rota'.
        if (cargaAtualPedidos <= 1) {
          dadosAtualizacaoMotorista.status = 'disponivel';
          console.log(`Motorista ${motoristaId} entregou o último pedido. Status: disponivel.`);
        } else {
          console.log(`Motorista ${motoristaId} ainda tem ${cargaAtualPedidos - 1} pedidos. Status: em_rota.`);
          // (O status dele já é 'em_rota', então não precisamos de o definir)
        }

        batch.update(motoristaRef, dadosAtualizacaoMotorista);
      }
    }

    await batch.commit();
    // --- Fim da Atualização ---

    console.log(`Entrega do pedido ${pedidoId} concluída.`);
    res.status(200).json({ message: `Pedido ${pedidoId} entregue com sucesso.` });

  } catch (error) {
    console.error("Erro ao concluir a entrega:", error);
    res.status(500).json({ message: 'Erro interno no servidor ao concluir a entrega.' });
  }
});

// --- ENDPOINTS FINANCEIRO ---

app.post('/api/financeiro/dar-baixa', async (req: Request, res: Response) => {
  try {
    const { pedidoId, id_caixa } = req.body;
    if (!pedidoId || !id_caixa) {
      return res.status(400).json({ message: 'pedidoId e id_caixa são obrigatórios.' });
    }
    const pedidoRef = db.collection('pedidos').doc(pedidoId);
    const doc = await pedidoRef.get();
    if (!doc.exists) {
      return res.status(404).json({ message: 'Pedido não encontrado.' });
    }
    await pedidoRef.update({
      conferido_por: id_caixa,
      horario_conferencia: new Date()
    });
    console.log(`Caixa ${id_caixa} deu baixa no pedido ${pedidoId}.`);
    res.status(200).json({ message: `Baixa no pedido ${pedidoId} realizada com sucesso.` });
  } catch (error) {
    console.error("Erro ao dar baixa no pedido:", error);
    res.status(500).json({ message: 'Erro interno no servidor ao dar baixa no pedido.' });
  }
});


// --- ENDPOINTS DE CLIENTES ---

app.post('/api/clientes', async (req: Request, res: Response) => {
  try {
    const clienteData = req.body;
    if (!clienteData.nome || !clienteData.endereco || !clienteData.bairro) {
      return res.status(400).json({ message: 'Nome, endereço e bairro são obrigatórios.' });
    }
    const novoCliente = {
      nome: clienteData.nome,
      telefone: clienteData.telefone || null,
      endereco: clienteData.endereco,
      bairro: clienteData.bairro,
      criado_em: new Date(),
    };
    const docRef = await db.collection('clientes').add(novoCliente);
    console.log(`Cliente ${docRef.id} cadastrado com sucesso.`);
    res.status(201).json({
      message: 'Cliente cadastrado com sucesso!',
      clienteId: docRef.id,
    });
  } catch (error) {
    console.error("Erro ao cadastrar cliente:", error);
    res.status(500).json({ message: 'Erro interno no servidor ao cadastrar cliente.' });
  }
});

app.get('/api/clientes', async (req: Request, res: Response) => {
  try {
    const pagina = parseInt(req.query.pagina as string);
    const limite = parseInt(req.query.limite as string);
    const searchTerm = req.query.search as string;
    const colecaoClientes = db.collection('clientes');
    let query: Query = colecaoClientes.orderBy('nome', 'asc');
    
    const totalSnapshot = await query.get();
    let todosClientes = totalSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        criado_em: data.criado_em.toDate().toISOString(),
      };
    }) as Cliente[];

    if (searchTerm) {
      todosClientes = todosClientes.filter(c =>
        c.nome.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    const totalResultados = todosClientes.length;
    if (pagina && limite) {
      const inicio = (pagina - 1) * limite;
      const fim = inicio + limite;
      const clientesPaginados = todosClientes.slice(inicio, fim);
      res.status(200).json({
        dados: clientesPaginados,
        total: totalResultados
      });
    } else {
      res.status(200).json({
        dados: todosClientes,
        total: totalResultados
      });
    }
  } catch (error) {
    console.error("Erro ao buscar clientes:", error);
    res.status(500).json({ message: 'Erro interno no servidor ao buscar clientes.' });
  }
});

app.put('/api/clientes/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const clienteData = req.body;
    if (!id) {
      return res.status(400).json({ message: 'O ID do cliente é obrigatório.' });
    }
    if (Object.keys(clienteData).length === 0) {
      return res.status(400).json({ message: 'O corpo da requisição não pode estar vazio.' });
    }
    const clienteRef = db.collection('clientes').doc(id);
    await clienteRef.update(clienteData);
    console.log(`Cliente ${id} atualizado com sucesso.`);
    res.status(200).json({
      message: `Cliente ${id} atualizado com sucesso.`
    });
  } catch (error) {
    console.error("Erro ao atualizar cliente:", error);
    res.status(500).json({ message: 'Erro ao atualizar cliente.' });
  }
});

app.get('/api/clientes/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ message: 'O ID do cliente é obrigatório.' });
    }
    const clienteRef = db.collection('clientes').doc(id);
    const doc = await clienteRef.get();
    if (!doc.exists) {
      return res.status(404).json({ message: 'Cliente não encontrado.' });
    }
    res.status(200).json({ id: doc.id, ...doc.data() });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar cliente.' });
  }
});

// --- ENDPOINTS DE BAIRROS ---

app.get('/api/bairros', async (req: Request, res: Response) => {
  try {
    const pagina = parseInt(req.query.pagina as string) || 1;
    const limite = parseInt(req.query.limite as string) || 10;

    const colecaoBairros = db.collection('bairros');
    
    // 1. Contagem Total (separada)
    const totalSnapshot = await colecaoBairros.get();
    const totalBairros = totalSnapshot.size;

    // 2. Query com paginação e ordenação
    let query: Query = colecaoBairros.orderBy('nome', 'asc');
    query = query.limit(limite).offset((pagina - 1) * limite);

    const snapshot = await query.get();

    // 3. Formatar os dados
    // Agora retornamos o objeto todo (ID + Nome), não só o nome.
    const bairros = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,  // O ID do documento (ex: 'centro')
        nome: data.nome // O nome (ex: 'Centro')
      };
    });
    
    // 4. Retornar a resposta paginada
    res.status(200).json({
      dados: bairros,
      total: totalBairros
    });

  } catch (error) {
    console.error("Erro ao buscar bairros:", error);
    res.status(500).json({ message: 'Erro interno ao buscar bairros.' });
  }
});
/**
 * Endpoint para ADICIONAR um novo bairro.
 */
app.post('/api/bairros', async (req: Request, res: Response) => {
  try {
    const { nome } = req.body;

    if (!nome) {
      return res.status(400).json({ message: 'O nome do bairro é obrigatório.' });
    }
    
    // Verifica se o bairro já existe (para evitar duplicados)
    const bairroRef = db.collection('bairros').doc(nome.toLowerCase());
    const doc = await bairroRef.get();
    
    if (doc.exists) {
        return res.status(409).json({ message: 'Este bairro já está cadastrado.' });
    }

    // Adiciona o novo bairro
    await bairroRef.set({
      nome: nome
    });

    console.log(`Bairro ${nome} cadastrado com sucesso.`);
    res.status(201).json({ message: `Bairro ${nome} cadastrado com sucesso.` });

  } catch (error) {
    console.error("Erro ao cadastrar bairro:", error);
    res.status(500).json({ message: 'Erro interno ao cadastrar bairro.' });
  }
});

/**
 * Endpoint para REMOVER um bairro.
 * Usamos o nome do bairro como ID na URL.
 */
app.delete('/api/bairros/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params; // Usamos :id
        if (!id) {
             return res.status(400).json({ message: 'O ID do bairro é obrigatório.' });
        }

        const bairroRef = db.collection('bairros').doc(id); // Usamos o ID
        const doc = await bairroRef.get();

        if (!doc.exists) {
            return res.status(404).json({ message: 'Bairro não encontrado.' });
        }

        await bairroRef.delete();
        
        console.log(`Bairro ${id} removido com sucesso.`);
        res.status(200).json({ message: `Bairro removido com sucesso.` });

    } catch (error) {
        console.error("Erro ao remover bairro:", error);
        res.status(500).json({ message: 'Erro interno ao remover bairro.' });
    }
});
app.get('/api/bairros/lista-nomes', async (req: Request, res: Response) => {
  try {
    const snapshot = await db.collection('bairros').orderBy('nome').get();
    if (snapshot.empty) {
      return res.status(200).json([]);
    }
    // Extrai apenas os nomes dos bairros
    const nomesBairros = snapshot.docs.map(doc => doc.data().nome as string);
    res.status(200).json(nomesBairros);
    
  } catch (error) {
    console.error("Erro ao buscar lista de nomes de bairros:", error);
    res.status(500).json({ message: 'Erro interno ao buscar lista de nomes.' });
  }
});

// --- ENDPOINTS DE MOTORISTAS ---

/**
 * Endpoint para CRIAR um novo motorista.
 */
app.post('/api/motoristas', async (req: Request, res: Response) => {
  try {
    const data = req.body;

    // Validação dos campos obrigatórios
    if (!data.nome || !data.status || !data.bairros_atendidos) {
      return res.status(400).json({ message: 'Nome, Status e Bairros Atendidos são obrigatórios.' });
    }

    // Estrutura do novo motorista, seguindo nosso algoritmo
    const novoMotorista = {
      nome: data.nome,
      telefone: data.telefone || null,
      status: data.status, // 'disponivel', 'em_rota', 'inativo'
      bairros_atendidos: data.bairros_atendidos, // Array de strings
      
      // Capacidade definida na nossa regra de negócio
      capacidade_maxima_caixas: 20, 
      
      // Dados de carga e rodízio (iniciam zerados)
      carga_atual_pedidos: 0,
      carga_atual_caixas: 0,
      ultima_atribuicao_em: null, // Nenhum rodízio ainda
      criado_em: new Date()
    };

    const docRef = await db.collection('motoristas').add(novoMotorista);
    console.log(`Motorista ${docRef.id} (${data.nome}) cadastrado.`);

    res.status(201).json({ 
      message: 'Motorista cadastrado com sucesso!',
      motoristaId: docRef.id 
    });

  } catch (error) {
    console.error("Erro ao cadastrar motorista:", error);
    res.status(500).json({ message: 'Erro interno ao cadastrar motorista.' });
  }
});

/**
 * Endpoint para LISTAR todos os motoristas.
 */
app.get('/api/motoristas', async (req: Request, res: Response) => {
  try {
    const snapshot = await db.collection('motoristas').orderBy('nome').get();
    
    const motoristas = snapshot.docs.map(doc => {
      return {
        id: doc.id,
        ...doc.data()
      };
    });

    res.status(200).json(motoristas);

  } catch (error) {
    console.error("Erro ao buscar motoristas:", error);
    res.status(500).json({ message: 'Erro interno ao buscar motoristas.' });
  }
});

/**
 * Endpoint para BUSCAR UM motorista por ID.
 * (Útil para o formulário de edição no frontend)
 */
app.get('/api/motoristas/:id', async (req: Request, res: Response) => {
  try {
    // 1. Obter o ID dos parâmetros da rota
    const { id } = req.params;

    // 2. VERIFICAÇÃO ADICIONADA
    // Verificamos se o 'id' realmente existe (não é undefined ou uma string vazia)
    if (!id) {
      // Se não houver ID, é um "Bad Request" (Pedido Inválido)
      return res.status(400).json({ message: 'O ID do motorista é obrigatório.' });
    }
    
    // 3. Consulta à base de dados
    // Se o código chegou aqui, o TypeScript agora sabe que 'id' é uma string.
    const doc = await db.collection('motoristas').doc(id).get();

    // 4. O resto do teu código (que já estava correto)
    if (!doc.exists) {
      return res.status(404).json({ message: 'Motorista não encontrado.' });
    }

    res.status(200).json({ id: doc.id, ...doc.data() });

  } catch (error) {
    console.error("Erro ao buscar motorista:", error);
    res.status(500).json({ message: 'Erro interno ao buscar motorista.' });
  }
});

/**
 * Endpoint para ATUALIZAR um motorista.
 * (Para editar nome, status, bairros, etc.)
 */
app.put('/api/motoristas/:id', async (req: Request, res: Response) => {
  try {
    // 1. Obter o ID e os dados
    const { id } = req.params;
    const data = req.body;

    // 2. VERIFICAÇÃO DE TIPO (Corrige o erro TypeScript)
    // Se o ID não for fornecido na URL, é um pedido inválido.
    if (!id) {
      return res.status(400).json({ message: 'O ID do motorista é obrigatório.' });
    }

    // 3. Limpeza dos dados (O teu código original, está ótimo)
    delete data.id;
    delete data.criado_em;
    delete data.carga_atual_pedidos;
    delete data.carga_atual_caixas;
    delete data.ultima_atribuicao_em;
    delete data.capacidade_maxima_caixas;

    // 4. VERIFICAÇÃO DE EXISTÊNCIA (Melhoria da API)
    const motoristaRef = db.collection('motoristas').doc(id);
    const doc = await motoristaRef.get(); // Tentamos buscar o documento primeiro

    if (!doc.exists) {
      // Se o documento não existe, retornamos 404
      return res.status(404).json({ message: 'Motorista não encontrado.' });
    }

    // 5. Atualização (Agora seguro)
    // Se o código chegou aqui, o ID é válido e o motorista existe.
    await motoristaRef.update(data);
    
    console.log(`Motorista ${id} atualizado.`);
    res.status(200).json({ message: `Motorista ${id} atualizado com sucesso.` });

  } catch (error) {
    console.error("Erro ao atualizar motorista:", error);
    // Este 'catch' agora só apanhará erros inesperados (ex: falha de rede, permissões)
    res.status(500).json({ message: 'Erro interno ao atualizar motorista.' });
  }
});

/**
 * Endpoint para REMOVER um motorista.
 */
app.delete('/api/motoristas/:id', async (req: Request, res: Response) => {
  try {
    // 1. Obter o ID
    const { id } = req.params;
    
    // 2. VERIFICAÇÃO DE TIPO (Corrige o erro TypeScript)
    // Se o ID não for fornecido na URL, é um pedido inválido.
    if (!id) {
      return res.status(400).json({ message: 'O ID do motorista é obrigatório.' });
    }

    // 3. VERIFICAÇÃO DE EXISTÊNCIA (Melhoria da API)
    const motoristaRef = db.collection('motoristas').doc(id);
    const doc = await motoristaRef.get(); // Tentamos buscar o documento

    if (!doc.exists) {
      // Se não existe, retornamos 404
      return res.status(404).json({ message: 'Motorista não encontrado.' });
    }

    // 4. Remoção (Agora seguro)
    // Se o código chegou aqui, o ID é válido e o motorista existe.
    await motoristaRef.delete();
    
    console.log(`Motorista ${id} removido.`);
    res.status(200).json({ message: 'Motorista removido com sucesso.' });

  } catch (error) {
    console.error("Erro ao remover motorista:", error);
    res.status(500).json({ message: 'Erro interno ao remover motorista.' });
  }
});


// --- INICIALIZADOR DO SERVIDOR ---
// !! ESTE DEVE SER O COMANDO FINAL DO FICHEIRO !!
app.listen(PORT, () => {
  console.log(`--- Backend iniciado na porta ${PORT} ---`);
});