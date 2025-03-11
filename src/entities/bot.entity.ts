import { Entity, PrimaryColumn, Column, ManyToOne, OneToMany } from "typeorm";
import { User } from "./user.entity";
import { BotInteraction } from "./bot-interaction.entity";

@Entity()
export class Bot {
  @PrimaryColumn()
  id: string;

  @Column()
  publicKey: string;

  @Column({ select: false })
  token: string;

  @Column({ default: false })
  isConfirmed: boolean;

  @Column({ type: "text", nullable: true })
  description: string;

  @ManyToOne(() => User, (user) => user.bots)
  owner: User;

  @OneToMany(() => BotInteraction, (interaction) => interaction.bot)
  interactions: BotInteraction[];

  @Column({ type: "datetime", default: () => "CURRENT_TIMESTAMP" })
  createdAt: Date;

  @Column({ type: "datetime", default: () => "CURRENT_TIMESTAMP" })
  updatedAt: Date;
}
