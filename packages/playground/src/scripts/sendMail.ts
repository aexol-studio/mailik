import Mailik from "@mailik/sdk";
const projectIdinput = document.getElementById("projectId") as HTMLInputElement;
const mailBodyInput = document.getElementById("mailBody") as HTMLInputElement;
const mailReplyToInput = document.getElementById(
  "mailReplyTo"
) as HTMLInputElement;
const mailSubjectInput = document.getElementById(
  "mailSubject"
) as HTMLInputElement;
const result = document.getElementById("result") as HTMLDivElement;
const submitButton = document.getElementById("sendMail") as HTMLButtonElement;

const handleDisable = () => {
  if (
    projectIdinput.value.length === 0 ||
    mailBodyInput.value.length === 0 ||
    mailReplyToInput.value.length === 0 ||
    mailSubjectInput.value.length === 0
  )
    submitButton.disabled = true;
  else submitButton.disabled = false;
};

window.onload = () => {
  submitButton.disabled = true;
  projectIdinput.addEventListener("change", handleDisable);
  mailBodyInput.addEventListener("change", handleDisable);
  mailReplyToInput.addEventListener("change", handleDisable);
  mailSubjectInput.addEventListener("change", handleDisable);

  submitButton?.addEventListener("click", async () => {
    const mailikResult = await Mailik(projectIdinput.value).send({
      body: mailBodyInput.value,
      replyTo: mailReplyToInput.value,
      subject: mailSubjectInput.value,
    });

    result.innerText = JSON.stringify(mailikResult, null, 1);
  });
};
