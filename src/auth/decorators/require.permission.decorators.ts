// require-permissions.decorator.ts

import { SetMetadata } from '@nestjs/common';

export const RequirePermissions = (...permissions: string[]) => SetMetadata('permissions', permissions);

