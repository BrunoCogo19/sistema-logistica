import express, { type Request, type Response } from 'express';
import { db } from './config/firebase.js'; // Importa nossa instância do DB
import { Query } from 'firebase-admin/firestore';
import cors from 'cors'; // <-- 1. IMPORTE O PACOTE CORS


type Cliente = {
  id: string;
  nome: string;
  telefone?: string; // O '?' indica que o campo é opcional
  endereco: string;
  bairro_cep: string;
  criado_em: any; // Poderia ser um tipo mais específico, mas 'any' resolve por agora
};

const app = express();
app.use(express.json());
app.use(cors());
const PORT = 3001;

app.get('/', (req: Request, res: Response) => {
  res.send('<h1>Backend do Sistema de Logística - Conectado ao Firestore!</h1>');
});

/**
 * Endpoint para criar um novo pedido.
 * Módulo 2: Preparação e Expedição (necessário para exibir a lista).
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
    
    // --- Lógica Corrigida ---

    // 1. Cria uma query base para o filtro
    let queryBase: Query = colecaoPedidos;
    if (status && status !== 'todos') {
      queryBase = queryBase.where('status_entrega', '==', status);
    }

    // 2. Executa uma consulta separada APENAS para contar o total de resultados
    const totalSnapshot = await queryBase.get();
    const totalPedidos = totalSnapshot.size;

    // 3. Agora, constrói a consulta final para buscar os DADOS,
    //    adicionando ordenação e paginação à query base
    let dadosQuery: Query = queryBase.orderBy(ordenarPor, direcao);
    if (pagina && limite) {
      dadosQuery = dadosQuery.limit(limite).offset((pagina - 1) * limite);
    }

    // 4. Executa a consulta para buscar os dados da página
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
 * Endpoint para criar um novo pedido (VERSÃO ATUALIZADA).
 * Agora recebe um clienteId e os novos campos do pedido.
 */
app.post('/api/pedidos', async (req: Request, res: Response) => {
  try {
    const pedidoData = req.body;

    // 1. Validação do payload com os novos campos
    const { clienteId, valor, status_pagamento, quantidade_caixas, tem_fardo } = pedidoData;
    if (!clienteId || !valor || !status_pagamento || quantidade_caixas === undefined || tem_fardo === undefined) {
      return res.status(400).json({ message: 'Erro de validação. Campos obrigatórios ausentes.' });
    }

    // 2. Estrutura o novo objeto de pedido para salvar no Firestore
    const novoPedido = {
      clienteId, // <-- Agora salvamos apenas a referência ao cliente
      valor,
      status_pagamento,
      quantidade_caixas, // <-- Novo campo
      tem_fardo,         // <-- Novo campo
      status_entrega: 'preparado',
      criado_em: new Date(),
      motorista_id: null
    };

    // 3. Adiciona o novo pedido à coleção 'pedidos'
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
app.post('/api/entrega/retirada', async (req: Request, res: Response) => {
  try {
    const { pedidoId, motoristaId } = req.body;

    // 1. Validação do payload (corpo da requisição)
    if (!pedidoId || !motoristaId) {
      return res.status(400).json({ message: 'pedidoId e motoristaId são obrigatórios.' });
    }

    // 2. Referência ao documento específico no Firestore
    const pedidoRef = db.collection('pedidos').doc(pedidoId);
    const doc = await pedidoRef.get();

    // 3. Validação da regra de negócio
    if (!doc.exists) {
      return res.status(404).json({ message: 'Pedido não encontrado.' });
    }

    if (doc.data()?.status_entrega !== 'preparado') {
      return res.status(409).json({ message: 'Este pedido não está com o status "preparado", portanto não pode ser retirado.' });
    }

    // 4. Atualização dos dados no Firestore
    await pedidoRef.update({
      status_entrega: 'saiu',         // [cite: 68]
      motorista_id: motoristaId,      // [cite: 69]
      horario_saida: new Date()       // [cite: 70]
    });

    console.log(`Pedido ${pedidoId} atualizado para 'saiu', atribuído ao motorista ${motoristaId}.`);

    res.status(200).json({ message: `Pedido ${pedidoId} saiu para entrega.` });

  } catch (error) {
    console.error("Erro ao atualizar o pedido:", error);
    res.status(500).json({ message: 'Erro interno no servidor ao atualizar o pedido.' });
  }
});
app.post('/api/entrega/concluir', async (req: Request, res: Response) => {
  try {
    const { pedidoId, valor_pago, forma_pagamento } = req.body;

    // 1. Validação do payload
    if (!pedidoId) {
      return res.status(400).json({ message: 'O pedidoId é obrigatório.' });
    }

    // 2. Referência e busca do documento
    const pedidoRef = db.collection('pedidos').doc(pedidoId);
    const doc = await pedidoRef.get();

    // 3. Validação da regra de negócio
    if (!doc.exists) {
      return res.status(404).json({ message: 'Pedido não encontrado.' });
    }
    // A entrega só pode ser concluída se o pedido "saiu" para entrega 
    if (doc.data()?.status_entrega !== 'saiu') {
      return res.status(409).json({ message: 'Este pedido não pode ser marcado como entregue, pois não está com o status "saiu".' });
    }

    // 4. Preparação dos dados para atualização
    const dadosAtualizacao: { [key: string]: any } = {
      status_entrega: 'entregue', // O status sempre muda para 'entregue' 
      horario_entrega: new Date()
    };

    // Adiciona os dados de pagamento apenas se eles foram enviados 
    if (valor_pago && forma_pagamento) {
      dadosAtualizacao.valor_pago = valor_pago;
      dadosAtualizacao.forma_pagamento = forma_pagamento;
    }

    // 5. Atualização no Firestore
    await pedidoRef.update(dadosAtualizacao);

    console.log(`Entrega do pedido ${pedidoId} concluída.`);

    res.status(200).json({ message: `Pedido ${pedidoId} entregue com sucesso.` });

  } catch (error) {
    console.error("Erro ao concluir a entrega:", error);
    res.status(500).json({ message: 'Erro interno no servidor ao concluir a entrega.' });
  }
});
app.post('/api/financeiro/dar-baixa', async (req: Request, res: Response) => {
  try {
    const { pedidoId, id_caixa } = req.body;

    // 1. Validação do payload
    if (!pedidoId || !id_caixa) {
      return res.status(400).json({ message: 'pedidoId e id_caixa são obrigatórios.' });
    }

    // 2. Referência e busca do documento
    const pedidoRef = db.collection('pedidos').doc(pedidoId);
    const doc = await pedidoRef.get();

    // 3. Validação do pedido
    if (!doc.exists) {
      return res.status(404).json({ message: 'Pedido não encontrado.' });
    }

    // Opcional: Poderíamos validar se o pedido já foi conferido, mas por agora vamos seguir a spec
    // que apenas adiciona os campos.

    // 4. Atualização no Firestore, adicionando os campos de conferência
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
app.post('/api/financeiro/dar-baixa', async (req: Request, res: Response) => {
  try {
    const { pedidoId, id_caixa } = req.body;

    // 1. Validação do payload
    if (!pedidoId || !id_caixa) {
      return res.status(400).json({ message: 'pedidoId e id_caixa são obrigatórios.' });
    }

    // 2. Referência e busca do documento
    const pedidoRef = db.collection('pedidos').doc(pedidoId);
    const doc = await pedidoRef.get();

    // 3. Validação do pedido
    if (!doc.exists) {
      return res.status(404).json({ message: 'Pedido não encontrado.' });
    }

    // Opcional: Poderíamos validar se o pedido já foi conferido, mas por agora vamos seguir a spec
    // que apenas adiciona os campos.

    // 4. Atualização no Firestore, adicionando os campos de conferência
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
/**
 * Endpoint para cadastrar um novo cliente.
 */
app.post('/api/clientes', async (req: Request, res: Response) => {
  try {
    const clienteData = req.body;

    // Validação básica dos dados recebidos
    if (!clienteData.nome || !clienteData.endereco || !clienteData.bairro_cep) {
      return res.status(400).json({ message: 'Nome, endereço e bairro/cep são obrigatórios.' });
    }

    // Estrutura o objeto a ser salvo na coleção 'clientes'
    const novoCliente = {
      nome: clienteData.nome,
      telefone: clienteData.telefone || null, // Telefone é opcional
      endereco: clienteData.endereco,
      bairro_cep: clienteData.bairro_cep,
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
/**
 * Endpoint para buscar clientes.
 * Se um parâmetro 'search' for enviado, filtra pelo nome.
 * Caso contrário, retorna todos os clientes.
 */
app.get('/api/clientes', async (req: Request, res: Response) => {
  try {
    const pagina = parseInt(req.query.pagina as string);
    const limite = parseInt(req.query.limite as string);
    const searchTerm = req.query.search as string;

    const colecaoClientes = db.collection('clientes');

    // A MUDANÇA ESTÁ AQUI: Adicionamos o .orderBy('nome')
    let query: Query = colecaoClientes.orderBy('nome', 'asc');

    // Essa parte de contagem do total e busca de todos os clientes ainda é necessária
    // para a paginação e para a busca por termo funcionarem corretamente.
    const totalSnapshot = await query.get();
let todosClientes = totalSnapshot.docs.map(doc => {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    // Converte o Timestamp do Firestore para um texto (string) no formato ISO
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
/**
 * Endpoint para atualizar os dados de um cliente existente.
 * Usa o ID do cliente na URL.
 */
app.put('/api/clientes/:id', async (req: Request, res: Response) => {
  try {
    // 1. Pega o ID da URL
    const { id } = req.params;
    // 2. Pega os dados a serem atualizados do corpo da requisição
    const clienteData = req.body;

    // 3. Validações
    if (!id) {
      return res.status(400).json({ message: 'O ID do cliente é obrigatório.' });
    }
    if (Object.keys(clienteData).length === 0) {
      return res.status(400).json({ message: 'O corpo da requisição não pode estar vazio.' });
    }

    // 4. Lógica correta de atualização de um único documento
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

    // ADICIONE ESTA VERIFICAÇÃO AQUI
    if (!id) {
      return res.status(400).json({ message: 'O ID do cliente é obrigatório.' });
    }

    // O erro na linha abaixo vai sumir após a verificação
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

app.listen(PORT, () => {
  console.log(`Backend iniciado na porta ${PORT}`);
});

// Criação de QRcode

