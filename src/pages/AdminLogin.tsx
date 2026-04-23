import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, Eye, EyeOff, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { adminFetch, setAuth } from "@/lib/api";
import { toast } from "sonner";
import pichuLogo from "@/assets/PichuMC_logo.png";

const AdminLogin = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await adminFetch("login", { username, password });
      setAuth(data.token, data.user);
      toast.success("Ingelogd!");
      navigate("/admin");
    } catch (err: any) {
      toast.error(err.message || "Inloggen mislukt");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src={pichuLogo} alt="PichuMC" className="w-20 h-20 mx-auto mb-4 object-contain" />
          <h1 className="text-2xl font-bold text-foreground">Admin Login</h1>
          <p className="text-muted-foreground text-sm">PichuMC Staff Panel</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <Label className="text-muted-foreground text-sm">Gebruikersnaam</Label>
            <div className="relative mt-1">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={username} onChange={(e) => setUsername(e.target.value)} className="pl-10 bg-secondary border-border" placeholder="Gebruikersnaam" />
            </div>
          </div>
          <div>
            <Label className="text-muted-foreground text-sm">Wachtwoord</Label>
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 pr-10 bg-secondary border-border" placeholder="••••••••" />
              <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <Button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground font-semibold hover:opacity-90">
            {loading ? "Inloggen..." : "Inloggen"}
          </Button>
          <button type="button" className="w-full text-center text-sm text-muted-foreground hover:text-foreground" onClick={() => navigate("/")}>
            Annuleren
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;
