import { Controller, Get } from '@nestjs/common';

// Liveness/readiness probe target for Azure Container Apps.
@Controller('health')
export class HealthController {
  @Get()
  check() {
    return { status: 'ok' };
  }
}
