import {
  BookOpen,
  GraduationCap,
  Headphones,
  Home,
  Languages,
} from "lucide-react";
import type { TabId } from "@/types/elovio";

interface BottomNavProps {
  activeTab: TabId;
  onSelect: (tab: TabId) => void;
}

const NAV_ITEMS: Array<{
  id: TabId;
  label: string;
  Icon: typeof Home;
}> = [
  { id: "home", label: "Koti", Icon: Home },
  { id: "listen", label: "Kuuntele", Icon: Headphones },
  { id: "exercises", label: "Harjoitukset", Icon: BookOpen },
  { id: "interpreter", label: "Tulkki", Icon: Languages },
  { id: "tutor", label: "Opettaja", Icon: GraduationCap },
];

export function BottomNav({ activeTab, onSelect }: BottomNavProps) {
  return (
    <nav
      aria-label="Päänavigaatio"
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#DDE5E0] bg-white/95 backdrop-blur-md"
    >
      <div className="mx-auto grid h-16 max-w-3xl grid-cols-5 items-center px-1">
        {NAV_ITEMS.map(({ id, label, Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelect(id)}
              aria-current={isActive ? "page" : undefined}
              aria-label={label}
              className={`flex min-h-[48px] w-full flex-col items-center justify-center gap-0.5 rounded-xl px-0.5 transition-colors ${
                isActive
                  ? "text-[#1E3F35]"
                  : "text-[#5C6F67] hover:text-[#1E3F35]"
              }`}
            >
              <Icon
                size={21}
                strokeWidth={isActive ? 2.4 : 1.8}
                aria-hidden="true"
              />
              <span
                className={`truncate text-[10px] leading-tight tracking-tight sm:text-[11px] ${
                  isActive ? "font-bold" : "font-medium"
                }`}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
