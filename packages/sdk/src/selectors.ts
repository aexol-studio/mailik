import { GraphQLTypes, InputType, Selector } from "./zeus/index.js";

export const mailInputSelector = Selector("MailInput")({
  body: true,
  subject: true,
  replyTo: true,
});

export type MailInputType = InputType<
  GraphQLTypes["MailInput"],
  typeof mailInputSelector
>;
