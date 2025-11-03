import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { jwtConstants } from 'src/constants';

@Injectable()
export class SocketGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  canActivate = async (context: ExecutionContext): Promise<boolean> => {
    // console.log('socket running');
    const socket = context.switchToWs().getClient();
    const token = socket.handshake.headers.token;
    // console.log("token in socket..........................",token);
    
    if (!token) {
      throw new UnauthorizedException();
    } else {
      try {
        const token = socket.handshake.headers.token;
        if (!token) {
          throw new UnauthorizedException();
        }
        try {
          const payload = await this.jwtService.verifyAsync(token, {
            secret: jwtConstants.secret,
          });
          socket['user'] = payload;
        } catch {
          throw new UnauthorizedException();
        }
        return true;
      } catch {
        throw new UnauthorizedException();
      }
    }
  };
}
