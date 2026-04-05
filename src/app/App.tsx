import { ThemeProvider } from "@/app/providers/theme-provider";
import { AppShell } from "@/components/layout/app-shell";

export default function App() {
  return (
    <ThemeProvider>
      <AppShell />
    </ThemeProvider>
  );
}
