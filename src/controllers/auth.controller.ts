import { Controller, Get, Query, Req, Res, UseGuards } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Request, Response } from "express";
import { AuthService } from "../services/auth.service";

@Controller("auth")
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService
  ) {}

  @Get("login")
  async login(@Res() res: Response) {
    const clientId = this.configService.get("DISCORD_CLIENT_ID");
    const redirectUri = this.configService.get("DISCORD_CALLBACK_URL");
    const scope = "identify";

    const url = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&response_type=code&scope=${scope}`;

    res.redirect(url);
  }

  @Get("discord/callback")
  async callback(
    @Query("code") code: string,
    @Req() req: Request,
    @Res() res: Response
  ) {
    try {
      const user = await this.authService.handleDiscordCallback(code);
      req.session.user = user;
      res.redirect("/profile");
    } catch (error) {
      console.error("Auth error:", error);
      res.redirect("/auth/login");
    }
  }

  @Get("logout")
  async logout(@Req() req: Request, @Res() res: Response) {
    req.session.destroy(() => {
      res.redirect("/");
    });
  }
}
