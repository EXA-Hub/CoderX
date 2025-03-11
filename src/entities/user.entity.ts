import { Entity, PrimaryColumn, Column, OneToMany } from "typeorm";
import { Bot } from "./bot.entity";

@Entity()
export class User {
  @PrimaryColumn()
  id: string;

  @Column()
  username: string;

  @Column()
  discriminator: string;

  @Column({ nullable: true })
  avatar: string;

  @Column()
  accessToken: string;

  @Column()
  refreshToken: string;

  @OneToMany(() => Bot, (bot) => bot.owner)
  bots: Bot[];

  @Column({ type: "datetime", default: () => "CURRENT_TIMESTAMP" })
  createdAt: Date;

  @Column({ type: "datetime", default: () => "CURRENT_TIMESTAMP" })
  updatedAt: Date;
}
