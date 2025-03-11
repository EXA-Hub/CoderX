import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule } from "@nestjs/config";
import { User } from "./entities/user.entity";
import { Bot } from "./entities/bot.entity";
import { BotInteraction } from "./entities/bot-interaction.entity";
import { AuthController } from "./controllers/auth.controller";
import { BotController } from "./controllers/bot.controller";
import { ProfileController } from "./controllers/profile.controller";
import { HomeController } from "./controllers/home.controller";
import { InteractionController } from "./controllers/interaction.controller";
import { AuthService } from "./services/auth.service";
import { BotService } from "./services/bot.service";

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forRoot({
      type: "sqlite",
      database: "discord_bot_platform.db",
      entities: [User, Bot, BotInteraction],
      synchronize: true,
    }),
    TypeOrmModule.forFeature([User, Bot, BotInteraction]),
  ],
  controllers: [
    HomeController,
    AuthController,
    BotController,
    ProfileController,
    InteractionController,
  ],
  providers: [AuthService, BotService],
})
export class AppModule {}
