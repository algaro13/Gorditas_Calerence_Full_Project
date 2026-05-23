import { Usuario } from '../models';
import { IUsuarioRepository } from '../interfaces/repositories';
import { IUser } from '../types';

export class UsuarioRepository implements IUsuarioRepository {
  async findById(id: string): Promise<IUser | null> {
    return Usuario.findById(id).lean() as any;
  }

  async findByEmail(email: string): Promise<any | null> {
    return Usuario.findOne({ email, activo: true });
  }

  async create(data: Partial<IUser>): Promise<IUser> {
    const usuario = new Usuario(data);
    await usuario.save();
    return usuario.toObject() as any;
  }

  async findOne(filter: Record<string, any>): Promise<any | null> {
    return Usuario.findOne(filter);
  }
}
