"use client";

import * as React from "react";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/store/auth";
import { useToast } from "@/hooks/use-toast";
import { Alert } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

const DEMO_ACCOUNTS = [
  { email: "alpha@meddrop.demo", role: "Requesting Outpost (Outpost Alpha)", facility: "Outpost Alpha", hint: "Critical O-negative shortage" },
  { email: "base@meddrop.demo", role: "Supplying Hub (Sector Base Hospital)", facility: "Sector Base Hospital", hint: "10 units O-negative blood in stock" },
  { email: "bravo@meddrop.demo", role: "Relief Camp (Relief Camp Bravo)", facility: "Relief Camp Bravo", hint: "Mixed inventory" },
  { email: "admin@meddrop.demo", role: "Administrator (Network-wide)", facility: "All facilities", hint: "Audit & oversight" },
];

export function LoginPage({ onSignOut }: { onSignOut: () => Promise<void> }) {
  const [location, navigate] = useLocation();
  const { signIn, loading } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await signIn(email, password);
      navigate(location === "/login" ? "/dashboard" : location);
    } catch (err: any) {
      setError(err?.message || "Login failed");
      toast({ variant: "destructive", title: "Login failed", description: err?.message || "Invalid credentials" });
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-slate-900 text-slate-200 p-4">
      <Card className="w-full max-w-md shadow-op-lg border-slate-700">
        <CardHeader className="text-center space-y-1">
          <div className="flex items-center justify-center gap-2">
            <div className="h-10 w-10 rounded bg-blue-600 flex items-center justify-center text-white font-bold">MD</div>
            <div>
              <CardTitle className="text-white">MedDrop</CardTitle>
              <CardDescription className="text-slate-400 text-sm">Emergency medical supply coordination</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive" title="Error" className="text-red-300 border-red-500/30 bg-red-900/20">
              {error}
            </Alert>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="alpha@meddrop.demo" disabled={loading} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} />
            </div>
            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Sign in
            </Button>
          </form>
        </CardContent>
        <CardFooter className="border-slate-700 bg-slate-900/50 space-y-3">
          <Separator className="bg-slate-700" />
          <p className="text-xs text-slate-400 text-center">
            Demo password for all accounts: <span className="text-amber-300 font-mono">MedDrop123!</span>
          </p>
          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-300 uppercase tracking-wider">Demo accounts</p>
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.email}
                type="button"
                onClick={() => { setEmail(acc.email); setPassword("MedDrop123!"); }}
                className="w-full text-left text-xs px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors border border-slate-700"
              >
                <div className="font-semibold">{acc.email}</div>
                <div className="text-[10px] text-slate-400">{acc.role}</div>
                <div className="text-[10px] text-slate-500">{acc.facility} · {acc.hint}</div>
              </button>
            ))}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
