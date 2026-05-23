import { Request, Response } from 'express';
import { IAuthService } from '../interfaces/services';
import { createResponse } from '../utils/helpers';
import { AuthError } from '../services/auth.service';

export class AuthController {
  constructor(private authService: IAuthService) {}

  login = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password } = req.body;
      const result = await this.authService.login(email, password);
      res.json(createResponse(true, result, 'Inicio de sesión exitoso'));
    } catch (error: any) {
      if (error instanceof AuthError) {
        res.status(error.statusCode).json(createResponse(false, null, error.message));
        return;
      }
      console.error('Login error:', error);
      res.status(500).json(createResponse(false, null, 'Error interno en el servidor'));
    }
  };

  getProfile = async (req: any, res: Response): Promise<void> => {
    try {
      res.json(createResponse(true, req.user.toJSON(), 'Perfil obtenido exitosamente'));
    } catch (error: any) {
      res.status(500).json(createResponse(false, null, 'Error interno en el servidor'));
    }
  };
}
