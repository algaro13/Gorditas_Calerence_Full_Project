import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Usuario } from '../models';
import { UserRole } from '../types';
import { appSettings } from '../config/app-settings';

export interface AuthRequest extends Request {
  user?: any;
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ message: 'Token no proporcionado' });
    }

    const decoded = jwt.verify(token, appSettings.jwt.secret) as any;
    const user = await Usuario.findById(decoded.id);

    if (!user || !user.activo) {
      return res.status(401).json({ message: 'Usuario no válido' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token no válido' });
  }
};

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'No autenticado' });
    }

    if (!roles.includes(req.user.nombreTipoUsuario)) {
      return res.status(403).json({ message: 'No tienes permisos para esta acción' });
    }

    next();
  };
};

export const isAdmin = authorize(UserRole.ADMIN);
export const isEncargado = authorize(UserRole.ADMIN, UserRole.ENCARGADO);
export const isMesero = authorize(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.MESERO);
export const isDespachador = authorize(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.DESPACHADOR);
export const isCocinero = authorize(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.COCINERO);
