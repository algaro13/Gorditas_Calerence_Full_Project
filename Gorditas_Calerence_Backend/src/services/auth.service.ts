import jwt from 'jsonwebtoken';
import { IUsuarioRepository } from '../interfaces/repositories';
import { IAuthService, LoginResult } from '../interfaces/services';
import { JwtConfig } from '../interfaces/config';

export class AuthService implements IAuthService {
  constructor(
    private usuarioRepo: IUsuarioRepository,
    private jwtConfig: JwtConfig
  ) {}

  async login(email: string, password: string): Promise<LoginResult> {
    const user = await this.usuarioRepo.findByEmail(email);

    if (!user || !(await user.comparePassword(password))) {
      throw new AuthError('Credenciales inválidas', 401);
    }

    const payload = { id: user._id, email: user.email, nombre: user.nombre };
    const token = jwt.sign(payload, this.jwtConfig.secret, {
      expiresIn: this.jwtConfig.expiresIn as any,
    });

    return {
      token,
      user: user.toJSON(),
    };
  }

  async getProfile(userId: string): Promise<Record<string, any>> {
    const user = await this.usuarioRepo.findOne({ _id: userId, activo: true });
    if (!user) {
      throw new AuthError('Usuario no encontrado', 404);
    }
    return user.toJSON();
  }
}

export class AuthError extends Error {
  constructor(message: string, public statusCode: number) {
    super(message);
    this.name = 'AuthError';
  }
}
