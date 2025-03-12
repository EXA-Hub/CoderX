import {
  Controller,
  Post,
  Headers,
  Body,
  Param,
  HttpStatus,
  Response,
} from "@nestjs/common";
import { BotService } from "../services/bot.service";
import { verifyKey } from "discord-interactions";
import { BotInteraction } from "../entities/bot-interaction.entity";
import { Response as ExpressResponse } from "express";

@Controller("interaction")
export class InteractionController {
  constructor(private botService: BotService) {}

  @Post(":id")
  async handleInteraction(
    @Param("id") botId: string,
    @Headers("x-signature-ed25519") signature: string,
    @Headers("x-signature-timestamp") timestamp: string,
    @Body() body: any,
    @Response() res: ExpressResponse,
  ) {
    try {
      // Get the bot to verify the request
      const bot = await this.botService.getBotById(botId);
      if (!bot) {
        return res
          .status(HttpStatus.NOT_FOUND)
          .json({ error: "Bot not found" });
      }

      // Verify the request is coming from Discord
      const isValid = this.verifyDiscordRequest(
        bot.publicKey,
        signature,
        timestamp,
        JSON.stringify(body),
      );
      if (!isValid) {
        return res.status(HttpStatus.UNAUTHORIZED).json({
          error: "Invalid request signature",
        });
      }

      // Handle PING (type 1) interactions
      if (body.type === 1) {
        await this.botService.confirmBot(botId);
        return res.status(HttpStatus.OK).json({ type: 1 });
      }

      if (!bot.isConfirmed) {
        return res.status(HttpStatus.FORBIDDEN).json({
          error: "Bot is not confirmed",
        });
      }

      // Determine the identifier based on interaction type
      let interaction: BotInteraction;
      if (body.type === 2) {
        // APPLICATION_COMMAND
        interaction = bot.interactions.find(
          (interaction) => interaction.discordId === body.data.id,
        );
      } else if (body.type === 3 || body.type === 5) {
        // MESSAGE_COMPONENT or MODAL_SUBMIT
        interaction = bot.interactions.find(
          (interaction) => interaction.customId === body.data.custom_id,
        );
      } else if (body.type === 4) {
        return res.status(HttpStatus.NOT_IMPLEMENTED);
      }

      if (!interaction) {
        return res.status(HttpStatus.OK).json({
          type: 4,
          data: { content: "This command was not found." },
        });
      }

      // Return the stored JSON response
      const result = await this.botService.executeInteraction(interaction);
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      console.error("Error handling Discord interaction:", error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        error: "Failed to handle interaction",
      });
    }
  }

  private verifyDiscordRequest(
    publicKey: string,
    signature: string,
    timestamp: string,
    body: string,
  ): boolean {
    try {
      return verifyKey(body, signature, timestamp, publicKey);
    } catch (error) {
      console.error("Error verifying Discord request:", error);
      return false;
    }
  }
}
