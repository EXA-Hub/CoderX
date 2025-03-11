import { Controller, Get, UseGuards, Req, Res } from "@nestjs/common";
import { Request, Response } from "express";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AuthGuard } from "../guards/auth.guard";
import { User } from "../entities/user.entity";

@Controller("profile")
@UseGuards(AuthGuard)
export class ProfileController {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>
  ) {}

  @Get()
  async getProfile(@Req() req: Request, @Res() res: Response) {
    const user = await this.userRepository.findOne({
      where: { id: req.session.user.id },
      relations: ["bots"],
    });

    return res.render("pages/profile", { user });
  }
}
