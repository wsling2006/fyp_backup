import { Injectable, ConflictException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import * as argon2 from 'argon2';
import { Role } from './roles.enum';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepo: Repository<User>,
  ) {}

  create(user: Partial<User>) {
    // If user has an ID, it's an update; otherwise, it's a create
    if (user.id) {
      return this.usersRepo.save(user);
    }
    const newUser = this.usersRepo.create(user);
    return this.usersRepo.save(newUser);
  }

  findByEmail(email: string) {
    return this.usersRepo.findOne({ where: { email } });
  }

  findById(id: string) {
    return this.usersRepo.findOne({ where: { id } });
  }

  async createSuperAdmin(email: string, password: string) {
    const existing = await this.usersRepo.findOne({ where: { email } });
    if (existing) return existing;
    const password_hash = await argon2.hash(password);
    const superAdmin = this.usersRepo.create({
      email,
      password_hash,
      role: Role.SUPER_ADMIN,
    });
    return this.usersRepo.save(superAdmin);
  }

  async assignRole(email: string, role: Role) {
    const user = await this.usersRepo.findOne({ where: { email } });
    if (!user) throw new Error('User not found');
    user.role = role;
    return this.usersRepo.save(user);
  }

  async createUser(body: { email: string; password: string; role: Role }) {
    // Check if user already exists
    const existing = await this.usersRepo.findOne({ where: { email: body.email } });
    if (existing) {
      throw new ConflictException('User with this email already exists');
    }
    
    const password_hash = await argon2.hash(body.password);
    const user = this.usersRepo.create({
      email: body.email,
      password_hash,
      role: body.role,
      mfa_enabled: true,
      // ...other fields if needed
    });
    return this.usersRepo.save(user);
  }

  findAll() {
    return this.usersRepo.find({
      order: { created_at: 'DESC' },
    });
  }

  count() {
    return this.usersRepo.count();
  }

  async findRecentLogins(limit = 10) {
    return this.usersRepo.find({
      order: { last_login_at: 'DESC' },
      take: limit,
    });
  }

  async findSuperAdmins() {
    return this.usersRepo.find({ where: { role: Role.SUPER_ADMIN, is_active: true } });
  }

  async suspendUser(id: string, until: Date | null) {
    const user = await this.usersRepo.findOne({ where: { id } });
    if (!user) throw new Error('User not found');
    user.account_locked_until = until;
    // reset failed attempts when applying manual suspension
    if (until && until > new Date()) {
      user.failed_login_attempts = 0;
    }
    return this.usersRepo.save(user);
  }

  async deleteUser(id: string) {
    return this.usersRepo.delete(id);
  }
}
