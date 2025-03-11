import { Injectable, CanActivate, ExecutionContext } from "@nestjs/common";
import { Request } from "express";

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    return request.session?.user !== undefined;
  }
}

declare module "express-session" {
  interface SessionData {
    user: any;
  }
}
