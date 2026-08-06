import { useState } from "react";
import { Form, required, useNotify, useRedirect, useTranslate } from "ra-core";
import type { FieldValues, SubmitHandler } from "react-hook-form";
import { TextInput } from "@/components/admin/text-input";
import { Button } from "@/components/ui/button";
import { Layout } from "./layout";

export const ForgotPasswordPage = () => {
  const [loading, setLoading] = useState(false);
  const notify = useNotify();
  const redirect = useRedirect();
  const translate = useTranslate();

  const submit = async ({ email }: { email: string }) => {
    try {
      setLoading(true);
      const response = await fetch("/api/auth/request-password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email,
          redirectTo: `${window.location.origin}/reset-password`,
        }),
      });
      if (!response.ok) throw new Error("Unable to request password reset");
      redirect("/login?passwordRecoveryEmailSent=1");
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "Unable to request password reset",
        { type: "warning" },
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="flex flex-col space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Forgot password?
        </h1>
        <p>Enter your email to receive a reset password link.</p>
      </div>
      <Form
        className="space-y-8"
        onSubmit={submit as SubmitHandler<FieldValues>}
      >
        <TextInput
          source="email"
          label={translate("ra.auth.email", { _: "Email" })}
          autoComplete="email"
          validate={required()}
        />
        <Button type="submit" className="cursor-pointer" disabled={loading}>
          Reset password
        </Button>
      </Form>
    </Layout>
  );
};

ForgotPasswordPage.path = "forgot-password";
