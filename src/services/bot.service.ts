import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { REST } from "discord.js";
import { Routes } from "discord-api-types/v10";
import { Bot } from "../entities/bot.entity";
import { BotInteraction } from "../entities/bot-interaction.entity";

@Injectable()
export class BotService {
  constructor(
    @InjectRepository(Bot)
    private botRepository: Repository<Bot>,
    @InjectRepository(BotInteraction)
    private botInteractionRepository: Repository<BotInteraction>,
  ) {}

  async createBot(data: {
    id: string;
    publicKey: string;
    token: string;
    owner: any;
  }) {
    const bot = this.botRepository.create(data);
    return this.botRepository.save(bot);
  }

  async confirmBot(id: string) {
    return this.botRepository.update(id, { isConfirmed: true });
  }

  async getBotById(id: string) {
    return this.botRepository.findOne({
      where: { id },
      relations: ["interactions", "owner"],
    });
  }

  async getBotWithToken(id: string) {
    return this.botRepository.findOne({
      where: { id },
      select: ["id", "token"],
      relations: ["interactions"],
    });
  }

  async createInteraction(
    botId: string,
    data: {
      name: string;
      type: string;
      configuration: any;
      jsonResponse: Object;
    },
  ) {
    const bot = await this.getBotById(botId);
    if (!bot) {
      throw new Error("Bot not found");
    }

    const interaction = this.botInteractionRepository.create({
      ...data,
      bot,
      jsonResponse: data.jsonResponse,
    });

    return this.botInteractionRepository.save(interaction);
  }

  async updateInteractionResponse(
    botId: string,
    interactionId: string,
    jsonResponse: Record<string, any>,
  ) {
    const bot = await this.getBotById(botId);
    if (!bot) {
      throw new Error("Bot not found");
    }

    const interaction = await this.getInteractionByIdentifier(
      botId,
      interactionId,
    );

    if (!interaction) {
      throw new Error("Interaction not found");
    }

    interaction.jsonResponse = jsonResponse;
    return this.botInteractionRepository.save(interaction);
  }

  async deployCommands(botId: string) {
    const bot = await this.getBotWithToken(botId);
    if (!bot) {
      throw new Error("Bot not found");
    }

    const commands = bot.interactions
      .filter((interaction) => interaction.type === "APPLICATION_COMMAND")
      .map((interaction) => interaction.configuration);

    const rest = new REST({ version: "10" }).setToken(bot.token);

    try {
      const data = await rest.put(Routes.applicationCommands(botId), {
        body: commands,
      });

      // Update interactions with Discord-assigned IDs
      const discordCommands = Array.isArray(data) ? data : [];
      for (const discordCommand of discordCommands) {
        const interaction = bot.interactions.find((i) => {
          if (!i.configuration || typeof i.configuration !== "object")
            return false;
          return i.configuration.name === discordCommand.name;
        });
        if (interaction) {
          await this.botInteractionRepository.update(interaction.id, {
            discordId: discordCommand.id,
          });
        }
      }

      return true;
    } catch (error) {
      console.error("Error deploying commands:", error);
      throw new Error("Failed to deploy commands");
    }
  }

  async executeInteraction(interaction: BotInteraction) {
    try {
      // Return the stored JSON response
      const jsonResponse = interaction.jsonResponse;
      return jsonResponse;
    } catch (error) {
      console.error("Error executing interaction:", error);
      throw error;
    }
  }

  private async executeCode(code: string, context: any) {
    // TODO: Implement secure code execution
    // This should be implemented with proper sandboxing
    return { type: 4, data: { content: "Interaction executed successfully" } };
  }

  async deleteBot(id: string) {
    const bot = await this.getBotById(id);
    if (!bot) {
      throw new Error("Bot not found");
    }

    // Delete all interactions first
    await this.botInteractionRepository.delete({ bot: { id } });

    // Then delete the bot
    await this.botRepository.delete(id);
    return true;
  }

  async deleteInteraction(id: string) {
    const interaction = await this.botInteractionRepository.findOne({
      where: { id },
    });

    if (!interaction) {
      throw new Error("Interaction not found");
    }

    await this.botInteractionRepository.delete(id);
    return true;
  }

  async getBotInteraction(
    botId: string,
    name: string,
  ): Promise<BotInteraction | null> {
    const bot = await this.botRepository.findOne({
      where: { id: botId },
      relations: ["interactions"],
    });

    if (!bot) {
      return null;
    }

    return (
      bot.interactions.find((interaction) => {
        try {
          const config =
            typeof interaction.configuration === "string"
              ? JSON.parse(interaction.configuration)
              : interaction.configuration;
          return config.name === name;
        } catch (error) {
          console.error("Error parsing interaction configuration:", error);
          return false;
        }
      }) || null
    );
  }

  async getBotInteractionById(id: string) {
    return this.botInteractionRepository.findOne({
      where: { id },
    });
  }

  async getInteractionByIdentifier(
    botId: string,
    identifier: string,
  ): Promise<BotInteraction | null> {
    const bot = await this.botRepository.findOne({
      where: { id: botId },
      relations: ["interactions"],
    });

    if (!bot) {
      return null;
    }

    return (
      bot.interactions.find((interaction) => {
        return interaction.id === identifier;
      }) || null
    );
  }

  async updateInteractionConfiguration(
    botId: string,
    interactionId: string,
    configuration: any,
  ) {
    const interaction = await this.getInteractionByIdentifier(
      botId,
      interactionId,
    );
    if (!interaction) {
      throw new Error("Interaction not found");
    }
    return this.botInteractionRepository.update(interactionId, {
      configuration,
    });
  }
}
