import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { ModeToggle } from "@/components/mode-toggle";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (email && password) {
      const result = await login(email, password);
      if (result.success) {
        toast.success(`Logged in successfully!`);
        navigate("/");
      } else {
        toast.error(result.message || "Login failed");
      }
    } else {
      toast.error("Please fill in all fields.");
    }
  };

  const toggleMode = () => {
    setIsAdmin(!isAdmin);
    setEmail("");
    setPassword("");
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-primary/5 to-primary/10 p-4 relative">

      {/* Theme Toggle - Top Right */}
      <div className="absolute top-4 right-4">
        <ModeToggle />
      </div>

      <div className="mb-8 text-center">
        <div className="bg-primary text-primary-foreground w-16 h-16 rounded-xl flex items-center justify-center text-2xl font-bold mx-auto mb-4 shadow-lg">
          RX
        </div>
        <h1 className="text-3xl font-bold text-foreground tracking-tight mb-2">RESOLVE X</h1>
        <p className="text-muted-foreground text-lg">Incident Resolution System</p>
        <p className="text-sm text-muted-foreground mt-1">Sign in to your account</p>
      </div>

      <Card className="w-full max-w-md shadow-xl border-primary/10">
        <CardContent className="pt-6">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder={isAdmin ? "admin@test.com" : "user@test.com"}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder={isAdmin ? "admin@123" : "user123"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full">
              {isAdmin ? 'Sign in as Admin' : 'Sign in'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-3 border-t pt-4">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={toggleMode}
          >
            {isAdmin ? 'Switch to User Login' : 'Switch to Admin Login'}
          </Button>
          <p className="text-sm text-muted-foreground text-center">
            Don't have an account?{" "}
            <Link to="/register" className="text-primary hover:underline font-medium">
              Sign up
            </Link>
          </p>
        </CardFooter>
      </Card>

      <div className="mt-6 text-center text-xs text-muted-foreground">
        <p>Demo Credentials:</p>
        <p>User: user@test.com / user123</p>
        <p>Admin: admin@test.com / admin@123</p>
      </div>
    </div>
  );
};

export default Login;
