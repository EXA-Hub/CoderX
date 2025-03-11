import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ConfigService } from "@nestjs/config";
import { User } from "../entities/user.entity";

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private configService: ConfigService
  ) {}

  async handleDiscordCallback(code: string): Promise<User> {
    const tokenResponse = await this.exchangeCode(code);
    const userInfo = await this.fetchDiscordUser(tokenResponse.access_token);

    let user = await this.userRepository.findOne({
      where: { id: userInfo.id },
    });

    if (!user) {
      user = this.userRepository.create({
        id: userInfo.id,
        username: userInfo.username,
        discriminator: userInfo.discriminator,
        avatar: userInfo.avatar,
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token,
      });
    } else {
      user.username = userInfo.username;
      user.discriminator = userInfo.discriminator;
      user.avatar = userInfo.avatar;
      user.accessToken = tokenResponse.access_token;
      user.refreshToken = tokenResponse.refresh_token;
    }

    return this.userRepository.save(user);
  }

  private async exchangeCode(code: string) {
    const params = new URLSearchParams({
      client_id: this.configService.get("DISCORD_CLIENT_ID"),
      client_secret: this.configService.get("DISCORD_CLIENT_SECRET"),
      grant_type: "authorization_code",
      code,
      redirect_uri: this.configService.get("DISCORD_CALLBACK_URL"),
    });

    const response = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });

    if (!response.ok) {
      throw new Error("Failed to exchange code for token");
    }

    return response.json();
  }

  private async fetchDiscordUser(accessToken: string) {
    const response = await fetch("https://discord.com/api/users/@me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch user info");
    }

    return response.json();
  }

  async refreshToken(user: User): Promise<User> {
    const params = new URLSearchParams({
      client_id: this.configService.get("DISCORD_CLIENT_ID"),
      client_secret: this.configService.get("DISCORD_CLIENT_SECRET"),
      grant_type: "refresh_token",
      refresh_token: user.refreshToken,
    });

    const response = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });

    if (!response.ok) {
      throw new Error("Failed to refresh token");
    }

    const tokenData = await response.json();
    user.accessToken = tokenData.access_token;
    user.refreshToken = tokenData.refresh_token;

    return this.userRepository.save(user);
  }
}
