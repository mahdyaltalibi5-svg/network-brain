import { useState } from "react";
import { Alert, KeyboardAvoidingView } from "react-native";
import { supabase } from "@/lib/supabase";
import { Button, Field, H, Screen, T } from "@/ui/kit";

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  async function signIn() {
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) Alert.alert("Sign in failed", error.message);
  }
  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
      <Screen style={{ paddingTop: 120 }}>
        <H>Canton Hunter</H>
        <T dim style={{ marginBottom: 24 }}>Sign in once. You stay signed in for the whole trip.</T>
        <Field label="Email" autoCapitalize="none" keyboardType="email-address" autoComplete="email" value={email} onChangeText={setEmail} />
        <Field label="Password" secureTextEntry value={password} onChangeText={setPassword} />
        <Button title="Sign in" onPress={signIn} busy={busy} big />
      </Screen>
    </KeyboardAvoidingView>
  );
}
