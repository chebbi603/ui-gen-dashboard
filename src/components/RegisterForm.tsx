import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { IconAlertTriangle, IconCircleCheck, IconLoader2 } from "@tabler/icons-react";
import { register } from "@/lib/auth";

export default function RegisterForm() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const canSubmit = email.trim() !== "" && password.trim() !== "" && username.trim() !== "" && !loading;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);
    try {
      await register({ email, username, password });
      setSuccess(true);
      setEmail("");
      setUsername("");
      setPassword("");
    } catch (err: any) {
      setError(err?.message || "Failed to register user");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Create User</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {error && (
          <div className="flex items-center justify-between rounded-md border border-destructive px-3 py-2 text-destructive">
            <div className="flex items-center gap-2 text-sm">
              <IconAlertTriangle className="size-4" aria-hidden />
              <span>{error}</span>
            </div>
            <Button size="sm" variant="outline" onClick={() => setError(null)} aria-label="Dismiss error">
              Dismiss
            </Button>
          </div>
        )}
        {success && (
          <div className="flex items-center justify-between rounded-md border border-green-500 px-3 py-2 text-green-600">
            <div className="flex items-center gap-2 text-sm">
              <IconCircleCheck className="size-4" aria-hidden />
              <span>User registered successfully. A default contract was assigned.</span>
            </div>
            <Button size="sm" variant="outline" onClick={() => setSuccess(false)} aria-label="Dismiss success">
              OK
            </Button>
          </div>
        )}

        <form className="space-y-3" onSubmit={onSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label htmlFor="username" className="block text-sm font-medium mb-1">Username</label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="jane"
                required
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1">Email</label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@example.com"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-1">Password</label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button type="submit" disabled={!canSubmit} aria-label="Register user">
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <IconLoader2 className="size-4 animate-spin" aria-hidden />
                  <span>Registering…</span>
                </span>
              ) : (
                <span>Register</span>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}