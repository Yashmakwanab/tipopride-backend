import {
  CanActivate,
  ExecutionContext,
  Injectable,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from '../auth.service';
import { DbService } from 'src/db/db.service';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from './auth.guard';
import { jwtConstants } from 'src/constants';
import { ROLES_KEY } from '../decorators/role.decorators';
import { UsersType } from '../role/user.role';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly authService: AuthService,
    private readonly model: DbService,
    private readonly reflector: Reflector,
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const roles = this.reflector.getAllAndOverride<UsersType[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    console.log("roles", roles);

    if (!roles) {
      return true;
    }

    const requiredPermissions = this.reflector.get<string[]>(
      'permissions',
      context.getHandler(),
    );
    const request = context.switchToHttp().getRequest();

    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    const session = await this.authService.checkToken(token);

    if (!session) {
      throw new HttpException(
        { error_code: 'unauthorized', error_description: 'unauthorized' },
        HttpStatus.UNAUTHORIZED,
      );
    }
    const payload = this.jwtService.verify(token, {
      secret: jwtConstants.secret,
    });

    try {

      const admin_detail = await this.model.admin.findOne({
        _id: payload.user_id,
      });
      if (roles && !admin_detail?.superAdmin) {
        const hasRequiredRoles = roles.some((role) =>
          payload?.scope?.includes(role),
        );
        if (!hasRequiredRoles) {
          throw new HttpException(
            {
              error_description: 'You have no permission access this resource',
              error_code: 'ACCESS_DENIED',
            },
            HttpStatus.FORBIDDEN,
          );
        }
        if (admin_detail && (requiredPermissions && !admin_detail.superAdmin)) {
          const hasRequiredPermissions = requiredPermissions.some(
            (requiredPermission) => admin_detail.roles.includes(requiredPermission),
          );
          if (!hasRequiredPermissions) {
            throw new HttpException(
              {
                error_description: 'You have no permission access this resource',
                error_code: 'ACCESS_DENIED',
              },
              HttpStatus.FORBIDDEN,
            );
          }
        }
        return hasRequiredRoles;
      }
      return true
    } catch (error) {
      console.log(error, "<----error");

      throw new HttpException(
        { error_code: 'You have no permission access this resource', error_description: 'unauthorized' },
        HttpStatus.UNAUTHORIZED,
      );
    }
  }
}
