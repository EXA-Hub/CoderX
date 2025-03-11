import { Controller, Get, Res } from "@nestjs/common";
import { Response } from "express";

@Controller()
export class HomeController {
  @Get()
  getHome(@Res() res: Response) {
    return res.render("pages/home");
  }
}
