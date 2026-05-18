import express from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { generateToken, auth } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    // Buscar usuário
    const usuario = await prisma.usuario.findUnique({
      where: { email }
    });

    if (!usuario) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    if (!usuario.ativo) {
      return res.status(401).json({ error: 'Usuário inativo' });
    }

    // Verificar senha
    const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);
    if (!senhaValida) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // Gerar token
    const token = generateToken(usuario.id, usuario.email, usuario.role);

    // Atualizar último login
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: { ultimo_login: new Date() }
    });

    res.json({
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        role: usuario.role
      }
    });
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'Erro interno no login' });
  }
});

// POST /api/auth/registrar (apenas gerentes podem criar usuários)
router.post('/registrar', auth, async (req, res) => {
  try {
    const { nome, email, senha, role } = req.body;
    const usuarioLogado = (req as any).user;

    // Apenas gerentes podem registrar novos usuários
    if (usuarioLogado.role !== 'gerente') {
      return res.status(403).json({ error: 'Apenas gerentes podem criar usuários' });
    }

    if (!nome || !email || !senha) {
      return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
    }

    // Verificar se email já existe
    const existente = await prisma.usuario.findUnique({
      where: { email }
    });

    if (existente) {
      return res.status(409).json({ error: 'Email já cadastrado' });
    }

    // Hash da senha
    const senha_hash = await bcrypt.hash(senha, 10);

    const usuario = await prisma.usuario.create({
      data: {
        nome,
        email,
        senha_hash,
        role: role || 'vendedor',
        ativo: true
      }
    });

    res.status(201).json({
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      role: usuario.role
    });
  } catch (error) {
    console.error('Erro ao registrar:', error);
    res.status(500).json({ error: 'Erro ao registrar usuário' });
  }
});

// GET /api/auth/me - Dados do usuário logado
router.get('/me', auth, async (req, res) => {
  try {
    const usuarioLogado = (req as any).user;

    const usuario = await prisma.usuario.findUnique({
      where: { id: usuarioLogado.id },
      select: {
        id: true,
        nome: true,
        email: true,
        role: true,
        ultimo_login: true
      }
    });

    if (!usuario) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json(usuario);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar usuário' });
  }
});

// PUT /api/auth/senha - Alterar senha
router.put('/senha', auth, async (req, res) => {
  try {
    const { senha_atual, nova_senha } = req.body;
    const usuarioLogado = (req as any).user;

    if (!senha_atual || !nova_senha) {
      return res.status(400).json({ error: 'Senha atual e nova senha são obrigatórias' });
    }

    if (nova_senha.length < 6) {
      return res.status(400).json({ error: 'Nova senha deve ter no mínimo 6 caracteres' });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: usuarioLogado.id }
    });

    if (!usuario) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const senhaValida = await bcrypt.compare(senha_atual, usuario.senha_hash);
    if (!senhaValida) {
      return res.status(401).json({ error: 'Senha atual incorreta' });
    }

    const nova_hash = await bcrypt.hash(nova_senha, 10);

    await prisma.usuario.update({
      where: { id: usuario.id },
      data: { senha_hash: nova_hash }
    });

    res.json({ message: 'Senha alterada com sucesso' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao alterar senha' });
  }
});

export default router;
