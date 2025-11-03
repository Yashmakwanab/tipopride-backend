import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { AuthService } from 'src/auth/auth.service';
import { jwtConstants } from 'src/constants';

import { Reflector } from '@nestjs/core';
import { DbService } from 'src/db/db.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private model: DbService,
    private authService: AuthService,
    private jwtService: JwtService,
    private reflector: Reflector,
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const language = request.headers['language'];

    const token = this.extractTokenFromHeader(request);
    if (!token) {
      throw new HttpException(
        { error_code: 'unauthorized', error_description: 'unauthorized' },
        HttpStatus.UNAUTHORIZED,
      );
    }

    // Check if the token is present in the session table
    const session = await this.authService.checkToken(token);
    if (!session) {
      throw new HttpException(
        { error_code: 'unauthorized', error_description: 'unauthorized' },
        HttpStatus.UNAUTHORIZED,
      );
    }

    try {
      const payload = this.jwtService.verify(token, {
        secret: jwtConstants.secret,
      });
      let { user_id } = payload;

      let user_info = await this.model.customers.findOne({ _id: user_id })

      request.payload = payload;
      request.user = user_info;
      request.token = token;
    } catch {
      throw new HttpException(
        { error_code: 'unauthorized', error_description: 'unauthorized' },
        HttpStatus.UNAUTHORIZED,
      );
    }
    return true;
  }

  public extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
