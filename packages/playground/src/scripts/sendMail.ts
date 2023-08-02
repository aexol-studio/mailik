import Mailik from "../../../sdk/lib/index.js";
const projectIdinput: HTMLInputElement = document.getElementById(
  "projectId"
) as HTMLInputElement;
const mailBodyInput: HTMLInputElement = document.getElementById(
  "mailBody"
) as HTMLInputElement;
const mailReplyToInput: HTMLInputElement = document.getElementById(
  "mailReplyTo"
) as HTMLInputElement;
const mailSubjectInput: HTMLInputElement = document.getElementById(
  "mailSubject"
) as HTMLInputElement;
const result: HTMLDivElement = document.getElementById(
  "result"
) as HTMLDivElement;
const submitButton: HTMLButtonElement = document.getElementById(
  "sendMail"
) as HTMLButtonElement;

const handleDisable = () => {
  if (
    projectIdinput.value.length === 0 ||
    mailBodyInput.value.length === 0 ||
    mailReplyToInput.value.length === 0 ||
    mailSubjectInput.value.length === 0
  ) {
    submitButton.disabled = true;
  } else submitButton.disabled = false;
};

window.onload = () => {
  submitButton.disabled = true;
  projectIdinput.addEventListener("change", handleDisable);
  mailBodyInput.addEventListener("change", handleDisable);
  mailReplyToInput.addEventListener("change", handleDisable);
  mailSubjectInput.addEventListener("change", handleDisable);

  submitButton?.addEventListener("click", async () => {
    const dupa = await Mailik(projectIdinput.value).send({
      body: mailBodyInput.value,
      replyTo: mailReplyToInput.value,
      subject: mailSubjectInput.value,
    });
    console.log();
    result.innerText = JSON.stringify(dupa, null, 1);
  });
};
