import { MailInputType } from "./selectors.js";
import { Chain } from "./zeus/index.js";

const API = "https://mailik.aexol.work/graphql";

const chain = (option: "query" | "mutation") =>
  Chain(API, {
    headers: {
      "Content-type": "application/json",
    },
  })(option);

const Malilik = (publicKey: string) => {
  const send = async (mail: MailInputType) => {
    try {
      const response = await chain("mutation")({
        mail: { sendMail: [{ mail: { ...mail, publicKey } }, true] },
      });
      if (response.mail?.sendMail) {
        return {
          status: "OK",
          message: "Mail sent successfully",
        };
      } else {
        return {
          status: "FAILED",
          message: "For some reason backend didn't sent this mail",
        };
      }
    } catch (e: any) {
      const firstError = Object.values(e)[0] as {
        errors: { message: string }[];
      };
      const errorMessage: string = firstError.errors[0].message.split(":")[1];

      return {
        status: "ERROR",
        message: "Something wen't wrong",
        errorMessage,
      };
    }
  };
  return { send };
};
export default Malilik;
