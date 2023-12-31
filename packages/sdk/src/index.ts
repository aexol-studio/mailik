import fetch from "cross-fetch";
const API = "https://backend.mailik.dev/graphql";

type MailInputType = { body: string; subject: string; replyTo: string };

const Mailik = (publicKey: string) => {
  const send = async (mail: MailInputType) => {
    try {
      const response = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: `mutation($mail:MailInput!)  { mail  { sendMail ( mail: $mail ) } }`,
          variables: {
            mail: {
              body: mail.body,
              subject: mail.subject,
              replyTo: mail.replyTo,
              publicKey,
            },
          },
        }),
      }).then((res) => res.json());

      if (response.data.mail?.sendMail) {
        return {
          status: "OK",
          message: "Mail sent successfully",
        };
      } else {
        return {
          status: "FAILED",
          message: `For some reason backend didn't sent this mail. Error: ${
            response.errors[0].message.split(":")[1]
          }
         
          `,
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
export default Mailik;
