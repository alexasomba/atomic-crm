type EmailEnvironment = { EMAIL: SendEmail; EMAIL_FROM: string };

type TransactionalEmail = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

export const sendTransactionalEmail = async (
  env: EmailEnvironment,
  email: TransactionalEmail,
) => {
  const result = await env.EMAIL.send({
    from: env.EMAIL_FROM,
    to: email.to,
    subject: email.subject,
    text: email.text,
    html: email.html,
  });

  return result.messageId;
};

export const sendVerificationEmail = (
  env: EmailEnvironment,
  to: string,
  url: string,
) =>
  sendTransactionalEmail(env, {
    to,
    subject: "Verify your Atomic CRM email",
    text: `Verify your email by opening this link: ${url}`,
    html: `<p>Verify your email by clicking <a href="${url}">this link</a>.</p>`,
  });

export const sendPasswordResetEmail = (
  env: EmailEnvironment,
  to: string,
  url: string,
) =>
  sendTransactionalEmail(env, {
    to,
    subject: "Reset your Atomic CRM password",
    text: `Reset your password by opening this link: ${url}`,
    html: `<p>Reset your password by clicking <a href="${url}">this link</a>.</p>`,
  });
