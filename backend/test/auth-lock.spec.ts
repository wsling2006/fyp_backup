import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { AuthService } from '../src/auth/auth.service';
import { UsersService } from '../src/users/users.service';
import { User } from '../src/users/user.entity';
import { Role } from '../src/users/roles.enum';

const sendMailSpy = jest.fn().mockResolvedValue(true);
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: sendMailSpy,
  })),
}));

describe('AuthService account lock flow', () => {
  let authService: AuthService;
  let usersServiceMock: jest.Mocked<Partial<UsersService>>;
  let jwtServiceMock: Partial<JwtService>;
  let configServiceMock: Partial<ConfigService>;
  let user: User;
  let hashedPassword: string;

  beforeEach(async () => {
    sendMailSpy.mockClear();

    hashedPassword = await argon2.hash('correct-password');

    user = new User();
    user.id = 'user-123';
    user.email = 'employee@example.com';
    user.password_hash = hashedPassword;
    user.role = Role.ACCOUNTANT;
    user.mfa_enabled = false;
    user.failed_login_attempts = 0;
    user.account_locked_until = null;
    user.is_active = true;

    usersServiceMock = {
      findByEmail: jest.fn().mockResolvedValue(user),
      create: jest.fn(async (updatedUser: Partial<User>) => {
        Object.assign(user, updatedUser);
        return user;
      }),
    };

    jwtServiceMock = {
      sign: jest.fn().mockReturnValue('jwt-token'),
    };

    configServiceMock = {
      get: jest.fn().mockReturnValue('no-reply@example.com'),
    };

    authService = new AuthService(
      usersServiceMock as UsersService,
      jwtServiceMock as JwtService,
      configServiceMock as ConfigService,
    );
  });

  it('locks the account after five failed attempts and emails an OTP', async () => {
    for (let i = 0; i < 5; i++) {
      await expect(authService.login(user.email, 'wrong-password')).rejects.toThrow(UnauthorizedException);
    }

    expect(user.failed_login_attempts).toBe(5);
    expect(user.account_locked_until).toBeInstanceOf(Date);
    expect(user.otp_code).toHaveLength(6);
    expect(sendMailSpy).toHaveBeenCalledTimes(1);
  });

  it('unlocks the account after OTP verification and password reset', async () => {
    for (let i = 0; i < 5; i++) {
      await expect(authService.login(user.email, 'wrong-password')).rejects.toThrow(UnauthorizedException);
    }
    expect(user.isAccountLocked()).toBe(true);

    await expect(authService.verifyResetOtp(user.email, user.otp_code)).resolves.toEqual({
      message: 'OTP verified, you may now reset your password',
    });
    expect(user.account_locked_until).toBeNull();

    await authService.resetPassword(user.email, user.otp_code, 'newPass123!', 'newPass123!');
    expect(user.failed_login_attempts).toBe(0);
    expect(user.otp_code).toBe('');

    await expect(authService.login(user.email, 'newPass123!')).resolves.toMatchObject({
      requiresOtp: false,
      access_token: 'jwt-token',
    });
  });
});


