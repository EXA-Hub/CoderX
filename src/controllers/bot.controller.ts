import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  Req,
  Res,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Bot } from "../entities/bot.entity";
import { BotInteraction } from "../entities/bot-interaction.entity";
import { Request, Response } from "express";
import { verifyKey } from "discord-interactions";
import { AuthGuard } from "../guards/auth.guard";
import { BotService } from "../services/bot.service";

@Controller("bot")
@UseGuards(AuthGuard)
export class BotController {
  constructor(
    @InjectRepository(Bot)
    private botRepository: Repository<Bot>,
    @InjectRepository(BotInteraction)
    private botInteractionRepository: Repository<BotInteraction>,
    private botService: BotService,
  ) {}

  @Get(":id")
  async getBotPage(@Param("id") id: string, @Res() res: Response) {
    const bot = await this.botRepository.findOne({
      where: { id },
      relations: ["interactions"],
    });
    if (!bot) {
      return res.redirect("/profile");
    }
    return res.render("pages/bot", { bot });
  }

  @Post("create")
  async createBot(
    @Body() data: { id: string; publicKey: string; token: string },
    @Req() req: Request,
  ) {
    return this.botService.createBot({
      ...data,
      owner: req.session.user,
    });
  }

  @Post("interaction/:id")
  async handleInteraction(
    @Param("id") id: string,
    @Body() body: any,
    @Req() req: Request,
  ) {
    const bot = await this.botRepository.findOne({
      where: { id },
      relations: ["interactions"],
    });
    if (!bot) {
      return { error: "Bot not found" };
    }

    const signature = req.headers["x-signature-ed25519"];
    const timestamp = req.headers["x-signature-timestamp"];

    const isValid = verifyKey(
      JSON.stringify(body),
      signature as string,
      timestamp as string,
      bot.publicKey,
    );

    if (!isValid) {
      return { error: "Invalid request signature" };
    }

    // Handle interaction based on type
    const interaction = bot.interactions.find(
      (i) => i.name === body.data?.name,
    );
    if (!interaction) {
      return { error: "Interaction not found" };
    }

    try {
      return await this.botService.executeInteraction(interaction);
    } catch (error) {
      return { error: "Error executing interaction code" };
    }
  }

  @Post(":id/interaction")
  async createInteraction(
    @Param("id") botId: string,
    @Body()
    data: {
      name: string;
      type: string;
      configuration: any;
      jsonResponse: string;
    },
  ) {
    return this.botService.createInteraction(botId, data);
  }

  @Post(":id/deploy")
  async deployCommands(@Param("id") id: string) {
    try {
      const success = await this.botService.deployCommands(id);
      return { success };
    } catch (error) {
      console.error("Error deploying commands:", error);
      return { error: "Failed to deploy commands" };
    }
  }

  @Post(":id/delete")
  async deleteBot(@Param("id") id: string) {
    try {
      await this.botService.deleteBot(id);
      return { success: true };
    } catch (error) {
      console.error("Error deleting bot:", error);
      return { error: "Failed to delete bot" };
    }
  }

  @Post(":botId/interaction/:id/delete")
  async deleteInteraction(
    @Param("botId") botId: string,
    @Param("id") id: string,
  ) {
    try {
      await this.botService.deleteInteraction(id);
      return { success: true };
    } catch (error) {
      console.error("Error deleting interaction:", error);
      return { error: "Failed to delete interaction" };
    }
  }

  @Put(":botId/interaction/:id")
  async updateInteraction(
    @Param("botId") botId: string,
    @Param("id") id: string,
    @Body() data: { jsonResponse: string },
  ) {
    try {
      const interaction = await this.botService.updateInteractionResponse(
        botId,
        id,
        JSON.parse(data.jsonResponse),
      );
      return { success: true, interaction };
    } catch (error) {
      console.error("Error updating interaction:", error);
      return { error: "Failed to update interaction" };
    }
  }

  @Put(":botId/interaction/:id/configuration")
  async updateInteractionConfiguration(
    @Param("botId") botId: string,
    @Param("id") id: string,
    @Body() data: { configuration: any },
  ) {
    try {
      const interaction = await this.botService.updateInteractionConfiguration(
        botId,
        id,
        JSON.parse(data.configuration),
      );
      return { success: true, interaction };
    } catch (error) {
      console.error("Error updating interaction configuration:", error);
      return { error: "Failed to update interaction configuration" };
    }
  }
}
