import { useState } from "react";
import { Form, required, useNotify } from "ra-core";
import type { FieldValues, SubmitHandler } from "react-hook-form";
import { TextInput } from "@/components/admin/text-input";
import { Button } from "@/components/ui/button";
import { Layout } from "./layout";

export const SetPasswordPage = () => {
  const [loading, setLoading] = useState(false);
  const notify = useNotify();
  const token = new URLSearchParams(window.location.search).get("token");

  const submit = async ({
    password,
    confirmPassword,
  }: {
    password: string;
    confirmPassword: string;
  }) => {
    if (password !== confirmPassword) {
      notify("Passwords do not match", { type: "warning" });
      return;
    }
    if (!token) {
      notify("This password reset link is invalid or expired", {
        type: "warning",
      });
      return;
    }
    try {
      setLoading(true);
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ token, newPassword: password }),
      });
      if (!response.ok) throw new Error("Unable to update password");
      window.location.assign("/login");
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Unable to update password",
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
          Choose your password
        </h1>
      </div>
      <Form
        className="space-y-8"
        onSubmit={submit as SubmitHandler<FieldValues>}
      >
        <TextInput
          label="Password"
          autoComplete="new-password"
          source="password"
          type="password"
          validate={required()}
        />
        <TextInput
          label="Confirm password"
          source="confirmPassword"
          type="password"
          validate={required()}
        />
        <Button type="submit" className="cursor-pointer" disabled={loading}>
          Save password
        </Button>
      </Form>
    </Layout>
  );
};

SetPasswordPage.path = "reset-password";
