import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from "typeorm";
import { Bot } from "./bot.entity";

@Entity()
export class BotInteraction {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ nullable: true })
  discordId: string;

  @Column()
  name: string;

  @Column()
  type: string; // 'SLASH_COMMAND' | 'USER_CONTEXT_MENU' | 'MESSAGE_CONTEXT_MENU'

  @Column("json")
  configuration: Record<string, any>;

  @Column("json")
  jsonResponse: Record<string, any>;

  @ManyToOne(() => Bot, (bot) => bot.interactions)
  bot: Bot;

  @Column({ type: "datetime", default: () => "CURRENT_TIMESTAMP" })
  createdAt: Date;

  @Column({ type: "datetime", default: () => "CURRENT_TIMESTAMP" })
  updatedAt: Date;

  @Column({ nullable: true })
  customId: string;
}
