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
    private botInteractionRepository: Repository<BotInteraction>
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
      codeBlock: string;
    }
  ) {
    const bot = await this.getBotById(botId);
    if (!bot) {
      throw new Error("Bot not found");
    }

    const interaction = this.botInteractionRepository.create({
      ...data,
      bot,
    });

    return this.botInteractionRepository.save(interaction);
  }

  async updateInteractionCode(interactionId: string, codeBlock: string) {
    const interaction = await this.botInteractionRepository.findOne({
      where: { id: interactionId },
    });

    if (!interaction) {
      throw new Error("Interaction not found");
    }

    interaction.codeBlock = codeBlock;
    return this.botInteractionRepository.save(interaction);
  }

  async deployCommands(botId: string) {
    const bot = await this.getBotWithToken(botId);
    if (!bot) {
      throw new Error("Bot not found");
    }

    const commands = bot.interactions
      .filter(
        (interaction) =>
          interaction.type === "SLASH_COMMAND" ||
          interaction.type === "USER_CONTEXT_MENU" ||
          interaction.type === "MESSAGE_CONTEXT_MENU"
      )
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

  async executeInteraction(interaction: BotInteraction, discordData: any) {
    try {
      // Execute the interaction code
      const code = interaction.codeBlock;
      const context = {
        data: discordData,
        // Add any other context needed for the interaction
      };

      // Execute the code in a sandbox
      const result = await this.executeCode(code, context);
      return result;
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
    name: string
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
}
