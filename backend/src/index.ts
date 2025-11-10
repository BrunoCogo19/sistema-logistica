import express, { type Request, type Response } from 'express';
import { db } from './config/firebase.js'; // Importa nossa instância do DB
import { Query } from 'firebase-admin/firestore';
import cors from 'cors';

// --- TIPOS ---
type Cliente = {
  id: string;
  nome: string;
  telefone?: string;
  endereco: string;
  bairro_cep: string;
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

// --- ENDPOINTS DE PEDIDOS ---

/**
 * Endpoint para BUSCAR pedidos (com paginação e filtros).
 */
app.get('/api/pedidos', async (req: Request, res: Response) => {
  try {
    const pagina = parseInt(req.query.pagina as string);
    const limite = parseInt(req.query.limite as string);
    const status = req.query.status_entrega as string;
    const ordenarPor = req.query.ordenarPor as string || 'criado_em';
    const direcao = req.query.direcao as 'asc' | 'desc' || 'desc';

    const colecaoPedidos = db.collection('pedidos');
    
    let queryBase: Query = colecaoPedidos;
    if (status && status !== 'todos') {
      queryBase = queryBase.where('status_entrega', '==', status);
    }

    const totalSnapshot = await queryBase.get();
    const totalPedidos = totalSnapshot.size;

    let dadosQuery: Query = queryBase.orderBy(ordenarPor, direcao);
    if (pagina && limite) {
      dadosQuery = dadosQuery.limit(limite).offset((pagina - 1) * limite);
    }

    const snapshot = await dadosQuery.get();
    const pedidos = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        criado_em: data.criado_em.toDate().toISOString(),
      };
    });

    res.status(200).json({
      dados: pedidos,
      total: totalPedidos
    });

  } catch (error) {
    console.error("Erro ao buscar pedidos:", error);
    res.status(500).json({ message: 'Erro interno no servidor ao buscar pedidos.' });
  }
});

/**
 * Endpoint para CRIAR um novo pedido.
 */
app.post('/api/pedidos', async (req: Request, res: Response) => {
  try {
    const pedidoData = req.body;
    const { clienteId, valor, status_pagamento, quantidade_caixas, tem_fardo } = pedidoData;
    if (!clienteId || !valor || !status_pagamento || quantidade_caixas === undefined || tem_fardo === undefined) {
      return res.status(400).json({ message: 'Erro de validação. Campos obrigatórios ausentes.' });
    }

    const novoPedido = {
      clienteId, 
      valor,
      status_pagamento,
      quantidade_caixas, 
      tem_fardo,
      status_entrega: 'preparado',
      criado_em: new Date(),
      motorista_id: null
    };

    const docRef = await db.collection('pedidos').add(novoPedido);
    console.log(`Pedido ${docRef.id} criado para o cliente ${clienteId}.`);

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

app.post('/api/entrega/retirada', async (req: Request, res: Response) => {
  try {
    const { pedidoId, motoristaId } = req.body;
    if (!pedidoId || !motoristaId) {
      return res.status(400).json({ message: 'pedidoId e motoristaId são obrigatórios.' });
    }
    const pedidoRef = db.collection('pedidos').doc(pedidoId);
    const doc = await pedidoRef.get();
    if (!doc.exists) {
      return res.status(404).json({ message: 'Pedido não encontrado.' });
    }
    if (doc.data()?.status_entrega !== 'preparado') {
      return res.status(409).json({ message: 'Este pedido não está com o status "preparado".' });
    }
    await pedidoRef.update({
      status_entrega: 'saiu',
      motorista_id: motoristaId,
      horario_saida: new Date()
    });
    console.log(`Pedido ${pedidoId} atualizado para 'saiu'.`);
    res.status(200).json({ message: `Pedido ${pedidoId} saiu para entrega.` });
  } catch (error) {
    console.error("Erro ao atualizar o pedido:", error);
    res.status(500).json({ message: 'Erro interno no servidor ao atualizar o pedido.' });
  }
});

app.post('/api/entrega/concluir', async (req: Request, res: Response) => {
  try {
    const { pedidoId, valor_pago, forma_pagamento } = req.body;
    if (!pedidoId) {
      return res.status(400).json({ message: 'O pedidoId é obrigatório.' });
    }
    const pedidoRef = db.collection('pedidos').doc(pedidoId);
    const doc = await pedidoRef.get();
    if (!doc.exists) {
      return res.status(404).json({ message: 'Pedido não encontrado.' });
    }
    if (doc.data()?.status_entrega !== 'saiu') {
      return res.status(409).json({ message: 'Este pedido não está com o status "saiu".' });
    }
    const dadosAtualizacao: { [key: string]: any } = {
      status_entrega: 'entregue',
      horario_entrega: new Date()
    };
    if (valor_pago && forma_pagamento) {
      dadosAtualizacao.valor_pago = valor_pago;
      dadosAtualizacao.forma_pagamento = forma_pagamento;
    }
    await pedidoRef.update(dadosAtualizacao);
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
      bairro_cep: clienteData.bairro,
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
    const snapshot = await db.collection('bairros').orderBy('nome').get();
    if (snapshot.empty) {
      return res.status(200).json([]);
    }
    const nomesBairros = snapshot.docs.map(doc => doc.data().nome as string);
    res.status(200).json(nomesBairros);
  } catch (error) {
    console.error("Erro ao buscar bairros:", error);
    res.status(500).json({ message: 'Erro interno ao buscar bairros.' });
  }
});


// --- INICIALIZADOR DO SERVIDOR ---
// !! ESTE DEVE SER O COMANDO FINAL DO FICHEIRO !!
app.listen(PORT, () => {
  console.log(`--- Backend iniciado na porta ${PORT} ---`);
});