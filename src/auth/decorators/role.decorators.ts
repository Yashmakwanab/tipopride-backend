import { SetMetadata } from '@nestjs/common';
import { UsersType } from '../role/user.role';


export const ROLES_KEY = 'roles';
export const Roles = (...roles: UsersType[]) => SetMetadata(ROLES_KEY, roles);
