import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: "/",
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Warn if a single chunk exceeds 600 kB
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          // React core — changes almost never, perfect for long-term caching
          "vendor-react": ["react", "react-dom", "react-router-dom"],

          // TanStack Query
          "vendor-query": ["@tanstack/react-query"],

          // Supabase client
          "vendor-supabase": ["@supabase/supabase-js"],

          // Chart libraries (heavy — isolated so other chunks stay small)
          "vendor-charts": ["chart.js", "react-chartjs-2", "recharts"],

          // PDF & Excel export (very heavy — only loaded on demand via lazy pages)
          "vendor-export": ["jspdf", "jspdf-autotable", "xlsx"],

          // Radix UI primitives
          "vendor-radix": [
            "@radix-ui/react-accordion",
            "@radix-ui/react-alert-dialog",
            "@radix-ui/react-avatar",
            "@radix-ui/react-checkbox",
            "@radix-ui/react-collapsible",
            "@radix-ui/react-context-menu",
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-hover-card",
            "@radix-ui/react-label",
            "@radix-ui/react-menubar",
            "@radix-ui/react-navigation-menu",
            "@radix-ui/react-popover",
            "@radix-ui/react-progress",
            "@radix-ui/react-radio-group",
            "@radix-ui/react-scroll-area",
            "@radix-ui/react-select",
            "@radix-ui/react-separator",
            "@radix-ui/react-slider",
            "@radix-ui/react-slot",
            "@radix-ui/react-switch",
            "@radix-ui/react-tabs",
            "@radix-ui/react-toast",
            "@radix-ui/react-toggle",
            "@radix-ui/react-toggle-group",
            "@radix-ui/react-tooltip",
            "@radix-ui/react-aspect-ratio",
          ],

          // Utility libraries
          "vendor-utils": [
            "date-fns",
            "clsx",
            "class-variance-authority",
            "tailwind-merge",
            "lucide-react",
            "zod",
          ],
        },
      },
    },
  },
}));
