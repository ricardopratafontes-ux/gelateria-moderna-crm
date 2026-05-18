import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    vendedor_id?: string | null;
  };
}

export const auth = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Token nao fornecido' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'seu-secret-key');
    req.user = decoded as any;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token invalido' });
  }
};

export const generateToken = (userId: string, email: string, role: string, vendedor_id?: string) => {
  return jwt.sign(
    { id: userId, email, role, vendedor_id: vendedor_id || null },
    process.env.JWT_SECRET || 'seu-secret-key',
    { expiresIn: '7d' }
  );
};
