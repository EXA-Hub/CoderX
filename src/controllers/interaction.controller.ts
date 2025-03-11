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
    @Response() res: ExpressResponse
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
        JSON.stringify(body)
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

      // if slash command, find the matching interaction and execute it
      if (body.type === 2) {
        const interaction = await this.botService.getBotInteractionById(
          body.data.id
        );
        if (!interaction) {
          return res.status(HttpStatus.OK).json({
            type: 4,
            data: { content: "This command was not found." },
          });
        }
        const result = await this.botService.executeInteraction(
          interaction,
          body
        );
        return res.status(HttpStatus.OK).json(result);
      }

      // if context menu, find the matching interaction and execute it
      if (body.type === 3) {
        const interaction = await this.botService.getBotInteraction(
          botId,
          body.data.name
        );
        if (!interaction) {
          return res.status(HttpStatus.OK).json({
            type: 4,
            data: { content: "This command was not found." },
          });
        }
        const result = await this.botService.executeInteraction(
          interaction,
          body
        );
        return res.status(HttpStatus.OK).json(result);
      }

      // For other interaction types, find the matching interaction and execute it
      const interaction = await this.botService.getBotInteraction(
        botId,
        body.data?.name
      );
      if (!interaction) {
        return res.status(HttpStatus.OK).json({
          type: 4,
          data: {
            content:
              "This command was not found. Please check if it's properly configured.",
          },
        });
      }

      const result = await this.botService.executeInteraction(
        interaction,
        body
      );
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
    body: string
  ): boolean {
    try {
      return verifyKey(body, signature, timestamp, publicKey);
    } catch (error) {
      console.error("Error verifying Discord request:", error);
      return false;
    }
  }
}
