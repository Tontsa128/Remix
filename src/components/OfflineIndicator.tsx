import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/hooks/usePWAInstall";

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      className="fixed bottom-20 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-xl bg-[#142620] px-3.5 py-2 text-xs font-medium text-white shadow-lg"
    >
      <WifiOff size={14} aria-hidden="true" />
      <span>Offline-tila — harjoitukset toimivat yhä</span>
    </div>
  );
}
